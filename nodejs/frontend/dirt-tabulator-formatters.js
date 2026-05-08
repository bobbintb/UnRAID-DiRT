
function pathFormatter(cell, formatterParams) {
    const path = cell.getValue();
    const data = cell.getRow().getData();
    if (data.nlink > 1) {
        return `<i class="fa fa-link" style="transform: rotate(45deg); margin-right: 5px;"></i>${path}`;
    }
    return path;
}

function deleteActionFormatter(cell, formatterParams, onRendered) {
    const data = cell.getRow().getData();
    const { path, action } = data;
    const icon = document.createElement("i");
    icon.classList.add("fa", "fa-trash");
    icon.style.cursor = "pointer";
    icon.title = "Delete";

    if (action === "delete") {
        icon.classList.add("selected");
    }

    icon.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = cell.getRow();
        const rowData = row.getData();
        if (rowData.isOriginal) return;

        const currentAction = rowData.action;
        const newAction = currentAction === "delete" ? null : "delete";

        row.update({ action: newAction });
        if (window.dirtySock) {
            window.dirtySock('setAction', { path, action: newAction, ino: rowData.ino });
        }
    });

    return icon;
}

function linkActionFormatter(cell, formatterParams, onRendered) {
    const data = cell.getRow().getData();
    const { path, action } = data;
    const icon = document.createElement("i");
    icon.classList.add("fa", "fa-link");
    icon.style.cursor = "pointer";
    icon.title = "Link";

    if (action === "link") {
        icon.classList.add("selected");
    }

    icon.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = cell.getRow();
        const rowData = row.getData();
        if (rowData.isOriginal) return;

        const currentAction = rowData.action;
        const newAction = currentAction === "link" ? null : "link";

        row.update({ action: newAction });
        if (window.dirtySock) {
            window.dirtySock('setAction', { path, action: newAction, ino: rowData.ino });
        }
    });

    return icon;
}

function radioSelectFormatter(cell, formatterParams, onRendered) {
    const { isOriginal, hash, path } = cell.getRow().getData();
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "original-" + hash;
    radio.checked = isOriginal;
    radio.title = "Original";

    const rowEl = cell.getRow().getElement();

    function setRowState(isOriginal) {
        if (isOriginal) {
            rowEl.classList.add('original-row');
        } else {
            rowEl.classList.remove('original-row');
        }
    }

    onRendered(() => {
        setRowState(cell.getRow().getData().isOriginal);
    });

    radio.addEventListener('change', () => {
        const table = cell.getTable();
        const selectedRow = cell.getRow();

        table.getRows().forEach(row => {
            const rowData = row.getData();
            if (row === selectedRow) {
                if (rowData.isOriginal === false) {
                    row.update({ isOriginal: true, action: null });
                    if (window.dirtySock) {
                        window.dirtySock('setOriginalFile', { hash: rowData.hash, path: rowData.path, ino: rowData.ino });
                    }
                }
                row.getElement().classList.add('original-row');
            } else {
                if (rowData.isOriginal === true) {
                   row.update({ isOriginal: false });
                }
                row.getElement().classList.remove('original-row');
            }
        });
    });

    return radio;
}
