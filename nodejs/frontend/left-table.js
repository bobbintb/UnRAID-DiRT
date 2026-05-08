let allRowsExpanded = true; // Global state for the toggle all feature

const generateLeftTableConfig = () => ({
    index: "hash",
    height: "100%",
    reactiveData: true,
    layout: "fitColumns",
    renderVertical:"basic",
    columns: [
        {
            title: "▼",
            formatter: function(cell, formatterParams, onRendered) {
                return "▼"; // Default to expanded state
            },
            width: 40,
            hozAlign: "center",
            headerSort: false,
            headerClick: function(e, column) {
                allRowsExpanded = !allRowsExpanded;
                const newIcon = allRowsExpanded ? "▼" : "▶";
                column.getElement().querySelector(".tabulator-col-title").textContent = newIcon;

                const table = column.getTable();
                table.getRows().forEach(row => {
                    const cell = row.getCells()[0];
                    if (cell) {
                        const cellIcon = cell.getElement().innerHTML;
                        const isCurrentlyExpanded = cellIcon.includes("▼");

                        if (isCurrentlyExpanded !== allRowsExpanded) {
                            cell.getElement().click();
                        }
                    }
                });
            },
            cellClick: function(e, cell) {
                const row = cell.getRow();
                const holderEl = row.getElement().querySelector(".nested-table-container");

                if (holderEl) {
                    if (holderEl.style.display === "none") {
                        holderEl.style.display = "block";
                        cell.getElement().innerHTML = "▼";
                    } else {
                        holderEl.style.display = "none";
                        cell.getElement().innerHTML = "▶";
                    }
                }
            }
        },
        {
            title: "Hash",
            field: "hash",
            widthGrow: 3,
            minWidth: 100,
            resizable: false,
            headerSort: false,
            bottomCalc: () => "Total",
        },
        {
            title: "Recoverable",
            field: "recoverable",
            width: 120,
            minWidth: 120,
            hozAlign: "right",
            headerHozAlign: "right",
            formatter: formatSize,
            resizable: false,
            headerSort: true,
            bottomCalc: "sum",
            bottomCalcFormatter: formatSize,
        },
        {
            title: "Count",
            field: "count",
            width: 90,
            minWidth: 90,
            hozAlign: "center",
            headerHozAlign: "center",
            resizable: false,
            headerSort: true,
            bottomCalc: "sum",
        },
    ],
    rowFormatter: function (row) {
        const data = row.getData();
        if (data.fileList && data.fileList.length > 0) {
            const holderEl = document.createElement("div");
            const tableEl = document.createElement("div");
            tableEl.classList.add("sub-table-instance");

            holderEl.classList.add("nested-table-container");
            holderEl.style.display = "block"; // Show the nested table by default
            holderEl.style.boxSizing = "border-box";
            holderEl.style.width = "0";
            holderEl.style.minWidth = "100%";
            holderEl.style.overflow = "hidden";
            holderEl.style.padding = "10px";
            holderEl.style.borderTop = "1px solid #333";
            holderEl.style.borderBottom = "1px solid #333";
            holderEl.style.background = "#ddd";

            tableEl.style.border = "1px solid #333";
            tableEl.style.width = "100%";
            tableEl.style.minWidth = "0";
            holderEl.appendChild(tableEl);
            row.getElement().appendChild(holderEl);

            const nestedTable = new Tabulator(tableEl, {
                layout: "fitColumns",
                renderVertical: "basic",
                data: data.fileList,
                index: "ino",
                reactiveData: true,
                columns: [
                    {
                        title: "",
                        field: "isOriginal",
                        formatter: (cell, formatterParams, onRendered) => radioSelectFormatter(cell, formatterParams, onRendered),
                        hozAlign: "center",
                        headerHozAlign: "center",
                        width: 40,
                        minWidth: 40,
                        resizable: false,
                        headerSort: false
                    },
                    {
                        title: "<i class='fa fa-trash' title='Toggle All Delete'></i>",
                        titleFormatter: "html",
                        field: "delete_col",
                        formatter: (cell, formatterParams, onRendered) => deleteActionFormatter(cell, formatterParams, onRendered),
                        hozAlign: "center",
                        headerHozAlign: "center",
                        width: 40,
                        minWidth: 40,
                        resizable: false,
                        headerSort: false,
                        headerClick: function(e, column) {
                            const table = column.getTable();
                            const rows = table.getRows();
                            const nonOriginalRows = rows.filter(row => !row.getData().isOriginal);

                            const anyWithoutAction = nonOriginalRows.some(row => row.getData().action !== "delete");
                            const newAction = anyWithoutAction ? "delete" : null;

                            nonOriginalRows.forEach(row => {
                                const rowData = row.getData();
                                if (rowData.action !== newAction) {
                                    row.update({ action: newAction, delete_col: newAction, link_col: newAction });
                                    if (window.dirtySock) {
                                        window.dirtySock('setAction', { path: rowData.path, action: newAction, ino: rowData.ino });
                                    }
                                }
                            });
                        }
                    },
                    {
                        title: "<i class='fa fa-link' title='Toggle All Link'></i>",
                        titleFormatter: "html",
                        field: "link_col",
                        formatter: (cell, formatterParams, onRendered) => linkActionFormatter(cell, formatterParams, onRendered),
                        hozAlign: "center",
                        headerHozAlign: "center",
                        width: 40,
                        minWidth: 40,
                        resizable: false,
                        headerSort: false,
                        headerClick: function(e, column) {
                            const table = column.getTable();
                            const rows = table.getRows();
                            const nonOriginalRows = rows.filter(row => !row.getData().isOriginal);

                            const anyWithoutAction = nonOriginalRows.some(row => row.getData().action !== "link");
                            const newAction = anyWithoutAction ? "link" : null;

                            nonOriginalRows.forEach(row => {
                                const rowData = row.getData();
                                if (rowData.action !== newAction) {
                                    row.update({ action: newAction, delete_col: newAction, link_col: newAction });
                                    if (window.dirtySock) {
                                        window.dirtySock('setAction', { path: rowData.path, action: newAction, ino: rowData.ino });
                                    }
                                }
                            });
                        }
                    },
                    {
                        title: "Path",
                        field: "path",
                        formatter: pathFormatter,
                        resizable: false,
                        widthGrow: 3,
                        minWidth: 100,
                        titleFormatter: "html",
                        headerSort: false
                    },
                    {
                        title: "Size",
                        field: "size",
                        formatter: formatSize,
                        width: 90,
                        minWidth: 90,
                        resizable: false,
                        headerSort: false
                    },
                    {
                        title: "Modified",
                        field: "mtime",
                        formatter: formatDate,
                        width: 170,
                        minWidth: 170,
                        resizable: false,
                        headerSort: true
                    },
                    {
                        title: "Created",
                        field: "ctime",
                        formatter: formatDate,
                        width: 170,
                        minWidth: 170,
                        resizable: false,
                        headerSort: true
                    },
                ]
            });
            // Ensure master-row highlight updates when nested table finishes rendering
            try {
                if (nestedTable && typeof nestedTable.on === 'function') {
                    nestedTable.on('renderComplete', function () {
                        if (typeof checkAndUpdateMasterRow === 'function') checkAndUpdateMasterRow(nestedTable);
                    });
                }
            } catch (e) {
                // Ignore: defensive in case Tabulator instance doesn't expose events
            }

            // Attempt an immediate update as a fallback (idempotent)
            if (typeof checkAndUpdateMasterRow === 'function') {
                checkAndUpdateMasterRow(nestedTable);
            }
        }
    },
});
