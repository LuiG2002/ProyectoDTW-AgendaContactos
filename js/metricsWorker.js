self.onmessage = function (event) {
    const contacts = event.data;

    const total = contacts.length;

    const byStatus = { Activo: 0, Favorito: 0, Bloqueado: 0 };
    const byCategory = { Familia: 0, Trabajo: 0, Amigos: 0, Universidad: 0 };

    contacts.forEach(function (contact) {
        if (byStatus[contact.status] !== undefined) byStatus[contact.status]++;
        if (byCategory[contact.category] !== undefined) byCategory[contact.category]++;
    });

    const categoriaTop = Object.entries(byCategory)
        .reduce(function (max, current) {
            return current[1] > max[1] ? current : max;
        }, ["—", 0])[0];

    self.postMessage({
        total,
        byStatus,
        byCategory,
        categoriaTop
    });
};
