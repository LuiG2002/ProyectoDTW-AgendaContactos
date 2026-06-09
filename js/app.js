let contacts = [];
let editMode = false;
let currentEditId = null;

const STORAGE_KEY = "agendaContactos";
const SESSION_KEY = "ultimaAccionAgenda";
const THEME_KEY = "agendaTemaClaro";

const contactForm = document.getElementById("contactForm");
const contactTableBody = document.getElementById("contactTableBody");
const saveContactButton = document.getElementById("saveContactButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const themeToggleButton = document.getElementById("themeToggleButton");

const metricsWorker = new Worker("js/metricsWorker.js");

function saveContactsToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function loadContactsFromLocalStorage() {
    const storedContacts = localStorage.getItem(STORAGE_KEY);

    if (storedContacts) {
        try {
            contacts = JSON.parse(storedContacts);
        } catch (error) {
            console.error("Error al cargar contactos desde localStorage:", error);
            contacts = [];
            localStorage.removeItem(STORAGE_KEY);
            showToast("Error al cargar los contactos guardados.", "error");
        }
    }
}

function saveLastAction(action) {
    sessionStorage.setItem(SESSION_KEY, action);
}

function showLastAction() {
    const lastActionElement = document.getElementById("lastActionInfo");

    if (!lastActionElement) return;

    const lastAction = sessionStorage.getItem(SESSION_KEY);

    lastActionElement.textContent = lastAction
        ? `Última acción realizada: ${lastAction}`
        : "No hay acciones recientes en esta sesión.";
}

function showToast(message, type = "info") {
    const toast = document.getElementById("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(function () {
        toast.className = "toast";
    }, 3000);
}

function loadThemePreference() {
    const lightModeEnabled = localStorage.getItem(THEME_KEY) === "true";

    if (lightModeEnabled) {
        document.body.classList.add("light-mode");
    }
}

function toggleTheme() {
    document.body.classList.toggle("light-mode");

    const lightModeEnabled = document.body.classList.contains("light-mode");
    localStorage.setItem(THEME_KEY, lightModeEnabled);

    showToast(
        lightModeEnabled ? "Modo claro activado." : "Modo oscuro activado.",
        "info"
    );
}

if (themeToggleButton) {
    themeToggleButton.addEventListener("click", toggleTheme);
}

metricsWorker.onmessage = function (event) {
    updateDashboardUI(event.data);
};

metricsWorker.onerror = function (error) {
    console.error("Error en el Web Worker:", error.message);
    showToast("Error al calcular las métricas del dashboard.", "error");
};

function requestMetricsUpdate() {
    metricsWorker.postMessage(contacts);
}

function updateDashboardUI(metrics) {
    document.getElementById("metricTotal").textContent = metrics.total;
    document.getElementById("metricActivos").textContent = metrics.byStatus.Activo;
    document.getElementById("metricFavoritos").textContent = metrics.byStatus.Favorito;
    document.getElementById("metricBloqueados").textContent = metrics.byStatus.Bloqueado;
    document.getElementById("metricTopCategoria").textContent = metrics.categoriaTop;

    renderBars("chartEstado", [
        { label: "Activos", count: metrics.byStatus.Activo, cssClass: "bar-activo" },
        { label: "Favoritos", count: metrics.byStatus.Favorito, cssClass: "bar-favorito" },
        { label: "Bloqueados", count: metrics.byStatus.Bloqueado, cssClass: "bar-bloqueado" }
    ], metrics.total);

    renderBars("chartCategoria", [
        { label: "Familia", count: metrics.byCategory.Familia, cssClass: "bar-familia" },
        { label: "Trabajo", count: metrics.byCategory.Trabajo, cssClass: "bar-trabajo" },
        { label: "Amigos", count: metrics.byCategory.Amigos, cssClass: "bar-amigos" },
        { label: "Universidad", count: metrics.byCategory.Universidad, cssClass: "bar-universidad" }
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
        showToast("Ocurrió un error al procesar el contacto.", "error");
    }
});

cancelEditButton.addEventListener("click", function () {
    cancelEdit();
});

function addContact() {
    const contact = getFormData();

    if (!validateContact(contact)) {
        showToast("Revise los campos del formulario.", "error");
        return;
    }

    contact.id = Date.now();
    contacts.push(contact);

    saveContactsToLocalStorage();
    saveLastAction("Se agregó un nuevo contacto.");
    showToast("Contacto guardado correctamente.", "success");

    renderContacts();
    requestMetricsUpdate();
    showLastAction();
    clearForm();
    clearErrors();
}

function updateContact() {
    const updatedContact = getFormData();

    if (!validateContact(updatedContact)) {
        showToast("Revise los campos del formulario.", "error");
        return;
    }

    updatedContact.id = currentEditId;

    const index = contacts.findIndex(function (c) {
        return c.id === currentEditId;
    });

    if (index === -1) {
        showToast("No se encontró el contacto que se desea actualizar.", "error");
        return;
    }

    contacts[index] = updatedContact;

    saveContactsToLocalStorage();
    saveLastAction("Se actualizó un contacto.");
    showToast("Contacto actualizado correctamente.", "success");

    renderContacts();
    requestMetricsUpdate();
    showLastAction();
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

        saveContactsToLocalStorage();
        saveLastAction("Se eliminó un contacto.");
        showToast("Contacto eliminado correctamente.", "error");

        renderContacts();
        requestMetricsUpdate();
        showLastAction();

        if (currentEditId === id) cancelEdit();

    } catch (error) {
        console.error("Error al eliminar el contacto:", error);
        showToast("Ocurrió un error al eliminar el contacto.", "error");
    }
}

function editContact(id) {
    try {
        const contact = contacts.find(function (c) {
            return c.id === id;
        });

        if (!contact) {
            showToast("No se encontró el contacto seleccionado.", "error");
            return;
        }

        document.getElementById("contactId").value = contact.id;
        document.getElementById("contactName").value = contact.name;
        document.getElementById("contactPhone").value = contact.phone;
        document.getElementById("contactEmail").value = contact.email;
        document.getElementById("contactCategory").value = contact.category;
        document.getElementById("contactAddress").value = contact.address;
        document.getElementById("contactStatus").value = contact.status;

        editMode = true;
        currentEditId = id;

        saveContactButton.textContent = "Actualizar contacto";
        cancelEditButton.hidden = false;

        clearErrors();
        showToast("Contacto cargado para edición.", "info");

    } catch (error) {
        console.error("Error al cargar el contacto para editar:", error);
        showToast("Ocurrió un error al cargar el contacto.", "error");
    }
}

function cancelEdit() {
    editMode = false;
    currentEditId = null;

    clearForm();
    clearErrors();

    saveContactButton.textContent = "Guardar contacto";
    cancelEditButton.hidden = true;

    showToast("Edición cancelada.", "info");
}

function getFormData() {
    return {
        name: document.getElementById("contactName").value.trim(),
        phone: document.getElementById("contactPhone").value.trim(),
        email: document.getElementById("contactEmail").value.trim(),
        category: document.getElementById("contactCategory").value,
        address: document.getElementById("contactAddress").value.trim(),
        status: document.getElementById("contactStatus").value
    };
}

function validateContact(contact) {
    clearErrors();

    let isValid = true;

    const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
    const phoneRegex = /^[0-9]{4}-?[0-9]{4}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (contact.name === "") {
        showError("contactName", "contactNameError", "El nombre es obligatorio.");
        isValid = false;
    } else if (contact.name.length < 3) {
        showError("contactName", "contactNameError", "El nombre debe tener al menos 3 caracteres.");
        isValid = false;
    } else if (contact.name.length > 50) {
        showError("contactName", "contactNameError", "El nombre no debe superar los 50 caracteres.");
        isValid = false;
    } else if (!nameRegex.test(contact.name)) {
        showError("contactName", "contactNameError", "El nombre solo debe contener letras y espacios.");
        isValid = false;
    }

    if (contact.phone === "") {
        showError("contactPhone", "contactPhoneError", "El teléfono es obligatorio.");
        isValid = false;
    } else if (!phoneRegex.test(contact.phone)) {
        showError("contactPhone", "contactPhoneError", "El teléfono debe tener formato 7777-8888 o 77778888.");
        isValid = false;
    }

    if (contact.email === "") {
        showError("contactEmail", "contactEmailError", "El correo es obligatorio.");
        isValid = false;
    } else if (contact.email.length > 80) {
        showError("contactEmail", "contactEmailError", "El correo no debe superar los 80 caracteres.");
        isValid = false;
    } else if (!emailRegex.test(contact.email)) {
        showError("contactEmail", "contactEmailError", "Ingrese un correo válido.");
        isValid = false;
    }

    if (contact.category === "") {
        showError("contactCategory", "contactCategoryError", "Debe seleccionar una categoría.");
        isValid = false;
    }

    if (contact.address.length > 100) {
        showError("contactAddress", "contactAddressError", "La dirección no debe superar los 100 caracteres.");
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
            <td>
                <span class="status-badge status-${contact.status.toLowerCase()}">
                    ${contact.status}
                </span>
            </td>
            <td>
                <button class="action-button edit-button" onclick="editContact(${contact.id})">
                    Editar
                </button>
                <button class="action-button delete-button" onclick="deleteContact(${contact.id})">
                    Eliminar
                </button>
            </td>
        `;

        contactTableBody.appendChild(row);
    });
}

function searchCountryInfo() {
    const countryInput = document.getElementById("countrySearchInput");
    const apiResult = document.getElementById("apiResult");

    if (!countryInput || !apiResult) return;

    const countryName = countryInput.value.trim();

    if (countryName === "") {
        apiResult.innerHTML = "<p>Ingrese el nombre de un país para buscar información.</p>";
        showToast("Ingrese el nombre de un país para buscar.", "error");
        return;
    }

    apiResult.innerHTML = "<p>Consultando información...</p>";

    fetch(`https://restcountries.com/v3.1/name/${countryName}`)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("No se encontró información del país.");
            }

            return response.json();
        })
        .then(function (data) {
            const country = data[0];

            const name = country.name.common;
            const capital = country.capital ? country.capital[0] : "No disponible";
            const region = country.region;
            const population = country.population.toLocaleString();
            const flag = country.flag;

            apiResult.innerHTML = `
                <h3>Información obtenida desde API REST</h3>
                <p><strong>País:</strong> ${name} ${flag}</p>
                <p><strong>Capital:</strong> ${capital}</p>
                <p><strong>Región:</strong> ${region}</p>
                <p><strong>Población:</strong> ${population}</p>
            `;

            saveLastAction(`Se consultó información del país: ${name}.`);
            showLastAction();
            showToast(`Información de ${name} cargada correctamente.`, "success");
        })
        .catch(function (error) {
            apiResult.innerHTML = `<p>${error.message}</p>`;
            showToast(error.message, "error");
        });
}

function getUserLocation() {
    const locationResult = document.getElementById("locationResult");

    if (!locationResult) return;

    if (!navigator.geolocation) {
        locationResult.innerHTML = "<p>La geolocalización no está disponible en este navegador.</p>";
        showToast("La geolocalización no está disponible en este navegador.", "error");
        return;
    }

    locationResult.innerHTML = "<p>Obteniendo ubicación...</p>";

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            locationResult.innerHTML = `
                <h3>Ubicación del usuario</h3>
                <p><strong>Latitud:</strong> ${latitude}</p>
                <p><strong>Longitud:</strong> ${longitude}</p>
            `;

            saveLastAction("Se obtuvo la ubicación del usuario.");
            showLastAction();
            showToast("Ubicación obtenida correctamente.", "success");
        },
        function () {
            locationResult.innerHTML = "<p>No se pudo obtener la ubicación. Verifique los permisos del navegador.</p>";
            showToast("No se pudo obtener la ubicación.", "error");
        }
    );
}

loadThemePreference();
loadContactsFromLocalStorage();
renderContacts();
requestMetricsUpdate();
showLastAction();