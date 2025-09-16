<script type="module">
// const socket = new WebSocket(`ws://<?php echo $_SERVER["SERVER_ADDR"]; ?>:3000?clientId=dirt.php`);

let tableData = null;
const consoleOutput = document.getElementById('console-output');

/**
 * Handles messages received from the WebSocket server.
 * @param {MessageEvent} event - The message event.
 */
socket.onmessage = function(event) {
    const consoleOutput = document.getElementById('console-output');
    const msg = JSON.parse(event.data);
    switch (msg.type) {
        case "load":
            table.options.columns[6].formatterParams.outputFormat = msg.datetime_format;
            table.options.columns[7].formatterParams.outputFormat = msg.datetime_format;
            table.options.columns[8].formatterParams.outputFormat = msg.datetime_format;
            table.ogs = msg.ogs;
            table.jobs = msg.jobs;
            tableData = msg.result.flatMap(obj =>
                obj.path.length === 1
                ? [{ ...obj, path: obj.path[0] }]
                : [{
                    ...obj,
                    path: obj.path[0],
                    _children: obj.path.slice(1).map(p => ({ ...obj, path: p }))
                }]
            );
            consoleOutput.innerHTML = "test";
            console.error("test");
            table.setData(tableData);
            break;
        case "delete":
            consoleOutput2.innerHTML = event.data;
            break;
        // default:
        //     consoleOutput.innerHTML = "default";
        //     console.error("default");
        //     break;
    }
};


/**
 * Sends a message to the WebSocket server.
 * @param {string} action - The action to be performed by the server.
 * @param {object} [dataObj=null] - The data to be sent with the action.
 * @returns {Promise<void>} A promise that resolves when the message is sent.
 */
async function dirtySock(action, dataObj = null) {
    return new Promise((resolve, reject) => {
        const message = {
            clientId: "dirt.php",
            action: action,
            data: dataObj
        };

        socket.send(JSON.stringify(message));
        resolve();

        // socket.onmessage = (event) => resolve(event.data);
        // socket.onerror = (err) => reject(err);
    });
}

    /**
     * Sets up event listeners when the DOM is fully loaded.
     */
    document.addEventListener("DOMContentLoaded", function() {
        const clearButton = document.getElementById('clearButton');
        clearButton.addEventListener('click', function() {
            swal({
                title: "Are you sure?",
                text: "Are you sure you want to clear? This will reset any changes you have pending.",
                type: "warning",
                html: true,
                closeOnConfirm: false,
                showCancelButton: true,
                confirmButtonText: "Clear",
                showLoaderOnConfirm: true
            }, function() {
                dirtySock("clearProcessQueue").then(() => {
                swal({
                    title: "Cleared",
                    type: "success"
                }, function() {
                    // location.reload();
                    table.redraw(true);
                });
                });
            }
            );
        });
    

        const processButton = document.getElementById('processButton');
        processButton.addEventListener('click', function() {
                        swal({
                title: "Beginning processing duplicates?",
                text: consoleOutput.outerHTML,
                type: "warning",
                html: true,
                closeOnConfirm: false,
                showCancelButton: true,
                confirmButtonText: "Process",
                showLoaderOnConfirm: true
            }, function() {
                dirtySock("process").then(() => {
                swal({
                    title: "Done.",
                    // text: consoleOutput.innerHTML,
                    // html: true,
                    type: "success"
                }, function() {
                    table.redraw(true);
                });
                });
            }
            );
            // dirtySock("process")
        });
    });

    Tabulator.extendModule("columnCalcs", "calculations", {
        "recoverableSize":function(values, data, calcParams){
            return (values.length - 1) * values[0];
        }
    });

    // function sizeFormatter(cell) {
    //     const date = new Date(cell.getValue(0));
    //     return date.toDateString();
    // }

    /**
     * Formatter for Tabulator to convert a cell's file size value to a human-readable format.
     * @param {import('tabulator-tables').CellComponent} cell - The Tabulator cell component.
     * @returns {string|null} The formatted file size or null if the size is not defined.
     */
    function convertCellFileSize(cell) {
        return convertFileSize(cell.getValue(0))
    }

    /**
     * Converts a file size in bytes to a human-readable format.
     * @param {number} size - The file size in bytes.
     * @returns {string|null} The formatted file size or null if the size is not defined.
     */
    function convertFileSize(size) {
        if (typeof size !== 'undefined' && size !== null) {
            const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            let unitIndex = 0;
            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }
            return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
        } else {
            return null;
        }
    }

    let groupCount = 0;
    let totalSumFormatted = 0;
    let groups = {};
    let datetime_format;

    const table = new Tabulator("#dirt", {
        reactiveData:true,
        data: tableData,
        // data:[{ path: ["Loading table data..."], hash: "Loading table data..."}],
        selectableRows: 1,
        dataTree: true,
        dataTreeStartExpanded: true,
        dataTreeElementColumn: "path",
        groupBy: "hash",
        setGroupStartOpen: true,
        // layout:"fitData",
        layout: "fitColumns",
        /**
         * Checks if a row is selectable.
         * @param {import('tabulator-tables').RowComponent} row - The row component.
         * @returns {boolean} True if the row is selectable, false otherwise.
         */
        rowSelectableCheck: function (row) {
            return !row.getElement().classList.contains('disabled');
        },
        /**
         * Formatter for the group headers.
         * @param {any} value - The value of the group.
         * @param {number} count - The number of rows in the group.
         * @returns {string} The HTML for the group header.
         */
        groupHeader: function (value, count) {
            return `<div class="tabulator-cell"
                         role="gridcell"
                         style="margin-left: 4px;
                                border-left: 1px solid #aaa;
                                height: 24px;
                                width: 41px;">
                        <div style="display: flex;
                                    font-size: large;
                                    align-items: center;
                                    justify-content: center;
                                    height: 100%;">
                            <i class="fa fa-trash"></i></div></div>
                    <div class="tabulator-cell"
                         role="gridcell"
                         style="height: 24px;
                         width: 37px;">
                        <div style="display: flex;
                                    font-size: large;
                                    align-items: center;
                                    justify-content: center;
                                    height: 100%;">
                            <i class="fa fa-link"></i></div></div>
                    ${value}
                    <span style='color:#d00; margin-left:10px;'>(${count - 1} duplicate files)</span>`;
        },
        footerElement: `<div>Total Size: ${totalSumFormatted}, Total Groups: ${groupCount}</div>`,
        columns: [
            {
                // Radio button column
                title: `<div class="custom-arrow"
                             id='radio-og'>
                    </div>`,
                headerHozAlign: "center",
                headerSort: false,
                width: 1,
                /**
                 * Formatter for the radio button column.
                 * @param {import('tabulator-tables').CellComponent} cell - The cell component.
                 * @returns {string} The HTML for the radio button.
                 */
                formatter: function (cell) {
                let rowData = cell.getRow().getData();
                if (cell.getRow().getTreeParent()) return "";
                return `<div style='display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    height: 100%;'>
                            <input type='radio' name=${rowData.hash}></div>`;
            },
                cellClick: actionChange,
                resizable: false
            },
            {
                // Trash column
                title: `<div style="display: flex;
                                    font-size: large;
                                    align-items: center;
                                    justify-content: center;
                                    height: 100%;"
                            id="trash">
                            <i class="fa fa-trash"></i>
                        </div>`,
                headerSort: false,
                width: 1,
                /**
                 * Formatter for the trash column.
                 * @param {import('tabulator-tables').CellComponent} cell - The cell component.
                 * @returns {string} The HTML for the trash icon.
                 */
                formatter: function (cell) {
                    let disabled = cell.getRow().getElement().classList.contains('disabled') ? 'disabled' : '';
                    if (cell.getRow().getTreeParent()) return "";
                    return `<label class="icon-checkbox trash-checkbox" ${disabled}>
                                <input type="checkbox" id="delete">
                                <span class="icon">
                                    <i class="fa fa-trash"></i>
                                </span>
                            </label>`;
                },
                cellClick: actionChange,
                resizable: false
            },
            {
                // Link column
                title: `<div style="display: flex;
                                    font-size: large;
                                    align-items: center;
                                    justify-content: center;
                                    height: 100%;">
                            <i class="fa fa-link"></i>
                        </div>`,
                headerSort: false,
                width: 1,
                /**
                 * Formatter for the link column.
                 * @param {import('tabulator-tables').CellComponent} cell - The cell component.
                 * @returns {string} The HTML for the link icon.
                 */
                formatter: function (cell) {
                    let disabled = cell.getRow().getElement().classList.contains('disabled') ? 'disabled' : '';
                    if (cell.getRow().getTreeParent()) return "";
                    return `<label class="icon-checkbox link-checkbox" ${disabled}>
                                <input type="checkbox" id="link">
                                <span class="icon">
                                    <i class="fa fa-link"></i>
                                </span>
                            </label>`;
                },
                cellClick: actionChange,
                resizable: false
            },
            {
                title: "Hash",
                field: "hash",
                sorter: "string",
                visible: false,
                resizable: false
            },
            {
                title: "File",
                field: "path",
                sorter: "string",
                // width: "-webkit-fill-available",
                formatter:"textarea"
            },
            {
                title: "Size",
                field: "size",
                sorter: "number",
                formatter: convertCellFileSize,
                bottomCalc: "recoverableSize",
                bottomCalcFormatter: convertCellFileSize,
                resizable: false,
                width: 90
            },
            {
                title: "Last Accessed",
                field: "atime",
                sorter: "datetime",
                formatter: "datetime",
                formatterParams:{
                    inputFormat: "iso",
                    // outputFormat: datetime_format,
                    invalidPlaceholder:"(invalid date)",
                },
                resizable: false,
                width:165
            },
            {
                title: "Last Modified",
                field: "mtime",
                sorter: "datetime",
                formatter: "datetime",
                formatterParams:{
                    inputFormat: "iso",
                    // outputFormat: datetime_format,
                    invalidPlaceholder:"(invalid date)",
                },
                resizable: false,
                width:165
            },
            {
                title: "Last Metadata Change",
                field: "ctime",
                sorter: "date",
                formatter: "datetime",
                formatterParams:{
                    inputFormat: "iso",
                    // outputFormat:datetime_format,
                    invalidPlaceholder:"(invalid date)",
                },
                resizable: false,
                width:165
            }
        ],
        /**
         * Formatter for each row in the table.
         * @param {import('tabulator-tables').RowComponent} row - The row component.
         */
        // This selects the first radio button as original or loads it from saved
        rowFormatter: async function (row) {
            if (row._row.type === 'row') {
                const rowData = row.getData();
                const group = row.getGroup();
                const jobsMap = Object.fromEntries(table.jobs.map(job => [job.data, job.name]));
                if (rowData.ino in jobsMap) {
                    row.getElement().querySelector(`input[type="checkbox"]#${jobsMap[rowData.ino]}`).checked = true;
                }
                if (table.ogs[rowData.hash] === rowData.path || (table.ogs[rowData.hash] === undefined && group.getRows()[0] === row)) {
                    let rowElement = row.getElement();
                    let radioButton = rowElement.querySelector("input[type='radio']");
                    radioButton.checked = true;
                    rowElement.classList.add('disabled');
                    let rowData = row.getData();
                    rowData.action = "og";
                    if (table.ogs[rowData.hash] === undefined) dirtySock("addToOriginals", {hash: rowData.hash, path: rowData.path});
                }
            }
        },
    });

    /**
     * Handles the header click event to toggle the grouping.
     * @param {Event} e - The event object.
     * @param {import('tabulator-tables').ColumnComponent} column - The column component.
     */
    table.on("headerClick", function (e, column) {
        if (column._column.definition.title.includes("custom-arrow")) {
            let arrowCell = document.getElementsByClassName('custom-arrow')[0]
            arrowCell.style.setProperty('border-width', arrowCell.style.borderWidth === '6px 6px 0px' ? '6px 0px 6px 6px' : '6px 6px 0px');
            arrowCell.style.setProperty('border-left-color', arrowCell.style.borderLeftColor === 'transparent' ? 'rgb(102, 102, 102)' : 'transparent');
            arrowCell.style.setProperty('border-right-style', arrowCell.style.borderRightStyle === 'solid' ? 'initial' : 'solid');
            arrowCell.style.setProperty('border-right-color', arrowCell.style.borderRightColor === 'transparent' ? 'initial' : 'transparent');
            arrowCell.style.setProperty('border-top-color', arrowCell.style.borderTopColor === 'rgb(102, 102, 102)' ? 'transparent' : 'rgb(102, 102, 102');
            arrowCell.style.setProperty('border-bottom-style', arrowCell.style.borderBottomStyle === 'initial' ? 'solid' : 'initial');
            arrowCell.style.setProperty('border-bottom-color', arrowCell.style.borderBottomColor === 'initial' ? 'transparent' : 'initial');
            table.setGroupStartOpen(!table.options.groupStartOpen);
            table.setGroupBy(false);
            table.setGroupBy("hash");
        }
    });

    /**
     * Simulates clicks on the checkboxes in a group of rows.
     * @param {import('tabulator-tables').GroupComponent} group - The Tabulator group component.
     * @param {DOMTokenList} id - The class list of the clicked element.
     */
    function simulateClicksOnGroupCells(group, id) {
        const rows = group.getRows();
        const action = id[1] === 'fa-link' ? 'link' : 'delete';
        rows.forEach(row => {
            if (!row.getElement().classList.contains('disabled')) {
                const cell = row.getElement().querySelector(`.${id[0]}.${id[1]}`);
                if (id.selected === row.getElement().querySelector(`input[type="checkbox"]#${action}`).checked) {
                    console.error('================')
                    console.error(id.selected)
                    console.error(action)
                    console.error(row.getElement().querySelector(`input[type="checkbox"]#${action}`).checked)
                    console.error('================')
                    const event = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    cell.dispatchEvent(event);
                }
            }
        });
    }

    /**
     * Handles the group click event to simulate clicks on the group's checkboxes.
     * @param {Event} e - The event object.
     * @param {import('tabulator-tables').GroupComponent} group - The group component.
     */
    table.on("groupClick", function(e, group) {
        let id = e.target.classList
        id.selected = id.selected === undefined ? false : !id.selected;
        simulateClicksOnGroupCells(group, id);
    });

    /**
     * Handles the table built event to calculate and display the total size and group count.
     */
    table.on("tableBuilt", function () {
        let totalSum = 0;
        this.getData().forEach(row => {
            totalSum += row.size;
        });
        totalSumFormatted = convertFileSize(totalSum);
        groups = table.getGroups()
        groupCount = table.getGroups().length;
        document.querySelector('.tabulator-footer').innerText = `Total Size: ${totalSumFormatted}, Total Groups: ${groupCount}`;
    });

    /**
     * Handles the change event for the action checkboxes and radio buttons in the table.
     * @param {Event} e - The event object.
     * @param {import('tabulator-tables').CellComponent} cell - The Tabulator cell component.
     */
    function actionChange(e, cell) {
        let row = cell.getRow();
        let rowData = row.getData();
        if (e.target.type === 'radio') {
            row.getGroup().getRows().forEach(r => r.getElement().classList.remove('disabled'));
            row.getElement().classList.add('disabled');
            ['fa-trash', 'fa-link'].forEach(icon => row.getElement().querySelector(`.fa.${icon}`).style.border = 'initial');
            ['delete', 'link'].forEach(id => row.getElement().querySelector(`input[type="checkbox"]#${id}`).checked = false);
            rowData.action = 'og';
            dirtySock("addToOriginals", {hash: rowData.hash, path: rowData.path});
        } else
        if (e.target.type === 'checkbox') {
            const targetId = e.target.id === 'delete' ? 'link' : 'delete';
            rowData.action = e.target.checked ? (targetId === 'link' ? 'delete' : 'link') : '';
            row.getElement().querySelector(`input[type="checkbox"]#${targetId}`).checked = false;
            dirtySock("addToProcessQueue", {action: rowData.action, inode: rowData.ino});
        }
    }
</script>