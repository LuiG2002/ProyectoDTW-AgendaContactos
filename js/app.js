let contacts = [];
let editMode = false;
let currentEditId = null;

const contactForm       = document.getElementById("contactForm");
const contactTableBody  = document.getElementById("contactTableBody");
const saveContactButton = document.getElementById("saveContactButton");
const cancelEditButton  = document.getElementById("cancelEditButton");

const metricsWorker = new Worker("js/metricsWorker.js");

metricsWorker.onmessage = function (event) {
    updateDashboardUI(event.data);
};

metricsWorker.onerror = function (error) {
    console.error("Error en el Web Worker:", error.message);
};

function requestMetricsUpdate() {
    metricsWorker.postMessage(contacts);
}

function updateDashboardUI(metrics) {
    document.getElementById("metricTotal").textContent        = metrics.total;
    document.getElementById("metricActivos").textContent      = metrics.byStatus.Activo;
    document.getElementById("metricFavoritos").textContent    = metrics.byStatus.Favorito;
    document.getElementById("metricBloqueados").textContent   = metrics.byStatus.Bloqueado;
    document.getElementById("metricTopCategoria").textContent = metrics.categoriaTop;

    renderBars("chartEstado", [
        { label: "Activos",    count: metrics.byStatus.Activo,        cssClass: "bar-activo"       },
        { label: "Favoritos",  count: metrics.byStatus.Favorito,      cssClass: "bar-favorito"     },
        { label: "Bloqueados", count: metrics.byStatus.Bloqueado,     cssClass: "bar-bloqueado"    }
    ], metrics.total);

    renderBars("chartCategoria", [
        { label: "Familia",     count: metrics.byCategory.Familia,     cssClass: "bar-familia"      },
        { label: "Trabajo",     count: metrics.byCategory.Trabajo,     cssClass: "bar-trabajo"      },
        { label: "Amigos",      count: metrics.byCategory.Amigos,      cssClass: "bar-amigos"       },
        { label: "Universidad", count: metrics.byCategory.Universidad, cssClass: "bar-universidad"  }
    ], metrics.total);
}

function renderBars(containerId, items, total) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(function (item) {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return `
            <div class="bar-row ${item.cssClass}">
                <span class="bar-label">${item.label}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${pct}%"></div>
                </div>
                <span class="bar-count">${item.count}</span>
            </div>
        `;
    }).join("");
}

contactForm.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
        if (editMode) {
            updateContact();
        } else {
            addContact();
        }
    } catch (error) {
        console.error("Error al procesar el contacto:", error);
        alert("Ocurrió un error al procesar el contacto.");
    }
});

cancelEditButton.addEventListener("click", function () {
    cancelEdit();
});

function addContact() {
    const contact = getFormData();

    if (!validateContact(contact)) return;

    contact.id = Date.now();
    contacts.push(contact);

    renderContacts();
    requestMetricsUpdate();
    clearForm();
    clearErrors();
}

function updateContact() {
    const updatedContact = getFormData();

    if (!validateContact(updatedContact)) return;

    updatedContact.id = currentEditId;

    const index = contacts.findIndex(function (c) {
        return c.id === currentEditId;
    });

    if (index === -1) {
        alert("No se encontró el contacto que se desea actualizar.");
        return;
    }

    contacts[index] = updatedContact;

    renderContacts();
    requestMetricsUpdate();
    clearForm();
    clearErrors();
    cancelEdit();
}

function deleteContact(id) {
    try {
        const confirmDelete = confirm("¿Está seguro de eliminar este contacto?");
        if (!confirmDelete) return;

        contacts = contacts.filter(function (c) {
            return c.id !== id;
        });

        renderContacts();
        requestMetricsUpdate();

        if (currentEditId === id) cancelEdit();

    } catch (error) {
        console.error("Error al eliminar el contacto:", error);
        alert("Ocurrió un error al eliminar el contacto.");
    }
}

function editContact(id) {
    try {
        const contact = contacts.find(function (c) {
            return c.id === id;
        });

        if (!contact) {
            alert("No se encontró el contacto seleccionado.");
            return;
        }

        document.getElementById("contactId").value       = contact.id;
        document.getElementById("contactName").value     = contact.name;
        document.getElementById("contactPhone").value    = contact.phone;
        document.getElementById("contactEmail").value    = contact.email;
        document.getElementById("contactCategory").value = contact.category;
        document.getElementById("contactAddress").value  = contact.address;
        document.getElementById("contactStatus").value   = contact.status;

        editMode      = true;
        currentEditId = id;

        saveContactButton.textContent = "Actualizar contacto";
        cancelEditButton.hidden       = false;

        clearErrors();

    } catch (error) {
        console.error("Error al cargar el contacto para editar:", error);
        alert("Ocurrió un error al cargar el contacto.");
    }
}

function cancelEdit() {
    editMode      = false;
    currentEditId = null;

    clearForm();
    clearErrors();

    saveContactButton.textContent = "Guardar contacto";
    cancelEditButton.hidden       = true;
}

function getFormData() {
    return {
        name:     document.getElementById("contactName").value.trim(),
        phone:    document.getElementById("contactPhone").value.trim(),
        email:    document.getElementById("contactEmail").value.trim(),
        category: document.getElementById("contactCategory").value,
        address:  document.getElementById("contactAddress").value.trim(),
        status:   document.getElementById("contactStatus").value
    };
}

function validateContact(contact) {
    clearErrors();
    let isValid = true;

    if (contact.name === "") {
        showError("contactName", "contactNameError", "El nombre es obligatorio.");
        isValid = false;
    }

    if (contact.phone === "") {
        showError("contactPhone", "contactPhoneError", "El teléfono es obligatorio.");
        isValid = false;
    } else if (!/^[0-9]{4}-?[0-9]{4}$/.test(contact.phone)) {
        showError("contactPhone", "contactPhoneError", "El teléfono debe tener formato 7777-8888 o 77778888.");
        isValid = false;
    }

    if (contact.email === "") {
        showError("contactEmail", "contactEmailError", "El correo es obligatorio.");
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        showError("contactEmail", "contactEmailError", "Ingrese un correo válido.");
        isValid = false;
    }

    if (contact.category === "") {
        showError("contactCategory", "contactCategoryError", "Debe seleccionar una categoría.");
        isValid = false;
    }

    if (contact.status === "") {
        showError("contactStatus", "contactStatusError", "Debe seleccionar un estado.");
        isValid = false;
    }

    return isValid;
}

function showError(inputId, errorId, message) {
    document.getElementById(inputId).classList.add("input-error");
    document.getElementById(errorId).textContent = message;
}

function clearErrors() {
    document.querySelectorAll(".error-message").forEach(function (el) {
        el.textContent = "";
    });
    document.querySelectorAll("input, select").forEach(function (el) {
        el.classList.remove("input-error");
    });
}

function clearForm() {
    contactForm.reset();
    document.getElementById("contactId").value = "";
}

function renderContacts() {
    contactTableBody.innerHTML = "";

    if (contacts.length === 0) {
        contactTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">No hay contactos registrados.</td>
            </tr>
        `;
        return;
    }

    contacts.forEach(function (contact) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${contact.name}</td>
            <td>${contact.phone}</td>
            <td>${contact.email}</td>
            <td>${contact.category}</td>
            <td>${contact.address || "Sin dirección"}</td>
            <td><span class="status-badge status-${contact.status.toLowerCase()}">${contact.status}</span></td>
            <td>
                <button class="action-button edit-button"   onclick="editContact(${contact.id})">Editar</button>
                <button class="action-button delete-button" onclick="deleteContact(${contact.id})">Eliminar</button>
            </td>
        `;
        contactTableBody.appendChild(row);
    });
}

requestMetricsUpdate();
renderContacts();