let contacts = [];
let editMode = false;
let currentEditId = null;

const contactForm = document.getElementById("contactForm");
const contactTableBody = document.getElementById("contactTableBody");
const saveContactButton = document.getElementById("saveContactButton");
const cancelEditButton = document.getElementById("cancelEditButton");

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

    if (!validateContact(contact)) {
        return;
    }

    contact.id = Date.now();

    contacts.push(contact);

    renderContacts();
    clearForm();
    clearErrors();
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
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(errorId);

    input.classList.add("input-error");
    errorElement.textContent = message;
}

function clearErrors() {
    const errorMessages = document.querySelectorAll(".error-message");
    const inputs = document.querySelectorAll("input, select");

    errorMessages.forEach(function (error) {
        error.textContent = "";
    });

    inputs.forEach(function (input) {
        input.classList.remove("input-error");
    });
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
            <td>${contact.status}</td>
            <td>
                <button class="action-button edit-button" onclick="editContact(${contact.id})">Editar</button>
                <button class="action-button delete-button" onclick="deleteContact(${contact.id})">Eliminar</button>
            </td>
        `;

        contactTableBody.appendChild(row);
    });
}

function clearForm() {
    contactForm.reset();
    document.getElementById("contactId").value = "";
}
function editContact(id) {
    try {
        const contact = contacts.find(function (item) {
            return item.id === id;
        });

        if (!contact) {
            alert("No se encontró el contacto seleccionado.");
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
    } catch (error) {
        console.error("Error al cargar el contacto para editar:", error);
        alert("Ocurrió un error al cargar el contacto.");
    }
}

function updateContact() {
    const updatedContact = getFormData();

    if (!validateContact(updatedContact)) {
        return;
    }

    updatedContact.id = currentEditId;

    const contactIndex = contacts.findIndex(function (contact) {
        return contact.id === currentEditId;
    });

    if (contactIndex === -1) {
        alert("No se encontró el contacto que se desea actualizar.");
        return;
    }

    contacts[contactIndex] = updatedContact;

    renderContacts();
    clearForm();
    clearErrors();
    cancelEdit();
}

function deleteContact(id) {
    try {
        const confirmDelete = confirm("¿Está seguro de eliminar este contacto?");

        if (!confirmDelete) {
            return;
        }

        contacts = contacts.filter(function (contact) {
            return contact.id !== id;
        });

        renderContacts();

        if (currentEditId === id) {
            cancelEdit();
        }
    } catch (error) {
        console.error("Error al eliminar el contacto:", error);
        alert("Ocurrió un error al eliminar el contacto.");
    }
}

function cancelEdit() {
    editMode = false;
    currentEditId = null;

    clearForm();
    clearErrors();

    saveContactButton.textContent = "Guardar contacto";
    cancelEditButton.hidden = true;
}