<script type="module">
    async function addToProcessQueue(dataObj) {
        try {
            const response = await fetch("http://127.0.0.1:3000/dirt/addToProcessQueue/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataObj)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
    }

    document.addEventListener("DOMContentLoaded", function() {
        const clearButton = document.getElementById('clearButton');
        clearButton.addEventListener('click', function() {
            const isConfirmed = confirm("Are you sure you want to clear?");
            if (isConfirmed) {
                fetch("http://127.0.0.1:3000/dirt/clear")
                    .then(response => response.json())
                    .then(data => {
                        console.log(data);
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
                location.reload()
            }
        });
    
        // document.addEventListener("DOMContentLoaded", function() {
        //     const clearButton = document.getElementById('clearButton');
        //                 const socket = new WebSocket('ws://127.0.0.1:3000/wsproxy/clear');
        //     socket.onmessage = function(event) {
        //         const data = JSON.parse(event.data);
        //         console.log('Message from server:', data);
        //     };
        //     clearButton.addEventListener('click', function() {
        //         const isConfirmed = confirm("Are you sure you want to clear?");
        //         if (isConfirmed) {
        //             const message = { action: "clear" };
        //             socket.send(JSON.stringify(message));
        //             socket.onmessage = function(event) {
        //                 const data = JSON.parse(event.data);
        //                 if (data.status === 'success') {
        //                     location.reload();
        //                 } else {
        //                     console.error("Error while clearing:", data.error);
        //                 }
        //             };
        //         }
        //     });
        // });


        const processButton = document.getElementById('processButton');
        processButton.addEventListener('click', function() {
            fetch("http://127.0.0.1:3000/dirt/process")
                .then(response => response.json())
                .then(data => {
                    console.log(data);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            table.setData();
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

    function convertCellFileSize(cell) {
        return convertFileSize(cell.getValue(0))
    }

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
        selectableRows: 1,
        dataTree: true,
        dataTreeStartExpanded: true,
        dataTreeElementColumn: "path",
        ajaxURL: `http://192.168.1.2:3000/load`,
        ajaxConfig: { method: "GET" },
        ajaxResponse: function(url, params, response) {
            datetime_format = response.datetime_format
            this.options.columns[6].formatterParams.outputFormat=datetime_format
            this.options.columns[7].formatterParams.outputFormat=datetime_format
            this.options.columns[8].formatterParams.outputFormat=datetime_format
            this.ogs = response.ogs
            this.jobs = response.jobs
            response.result = response.result.flatMap(obj =>
                obj.path.length === 1
                    ? [{ ...obj, path: obj.path[0] }]
                    : [
                        {
                            ...obj,
                            path: obj.path[0],
                            _children: obj.path.slice(1).map(p => ({ ...obj, path: p }))
                        }
                    ]
            );
            return response.result;
        },
        groupBy: "hash",
        setGroupStartOpen: true,
        layout:"fitDataStretch",
        rowSelectableCheck: function (row) {
            return !row.getElement().classList.contains('disabled');
        },
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
                // maxWidth: 40,
                formatter: function (cell) {
                    let rowData = cell.getRow().getData();
                    return `<div style='display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        height: 100%;'>
                            <input type='radio' name=${rowData.hash}></div>`;
                },
                cellClick: actionChange
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
                maxWidth: 40,
                formatter: function (cell) {
                    let disabled = cell.getRow().getElement().classList.contains('disabled') ? 'disabled' : '';
                    return `<label class="icon-checkbox trash-checkbox" ${disabled}>
                                <input type="checkbox" id="delete">
                                <span class="icon">
                                    <i class="fa fa-trash"></i>
                                </span>
                            </label>`;
                },
                cellClick: actionChange
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
                maxWidth: 40,
                formatter: function (cell) {
                    let disabled = cell.getRow().getElement().classList.contains('disabled') ? 'disabled' : '';
                    return `<label class="icon-checkbox link-checkbox" ${disabled}>
                                <input type="checkbox" id="link">
                                <span class="icon">
                                    <i class="fa fa-link"></i>
                                </span>
                            </label>`;
                },
                cellClick: actionChange
            },
            {
                title: "Hash",
                field: "hash",
                sorter: "string",
                visible: false
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
                bottomCalcFormatter: convertCellFileSize
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
                }
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
                }
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
                }
            }
        ],
        // This selects the first radio button as original or loads it from saved
        rowFormatter: async function (row) {
            if (row._row.type === 'row') {
                const rowData = row.getData();
                const group = row.getGroup();
                if (rowData.path in table.jobs) {
                    row.getElement().querySelector(`input[type="checkbox"]#${table.jobs[rowData.path]}`).checked = true;
                }
                if (table.ogs[rowData.hash] === rowData.path || (table.ogs[rowData.hash] === undefined && group.getRows()[0] === row)) {
                    let rowElement = row.getElement();
                    let radioButton = rowElement.querySelector("input[type='radio']");
                    radioButton.checked = true;
                    rowElement.classList.add('disabled');
                    let rowData = row.getData();
                    rowData.action = "og";
                    if (table.ogs[rowData.hash] === undefined) addToProcessQueue(rowData);
                }
            }
        },
    });

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

    table.on("groupClick", function(e, group) {
        let id = e.target.classList
        id.selected = id.selected === undefined ? false : !id.selected;
        simulateClicksOnGroupCells(group, id);
    });

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

    function actionChange(e, cell) {
        let row = cell.getRow();
        let rowData = row.getData();
        if (e.target.type === 'radio') {
            row.getGroup().getRows().forEach(r => r.getElement().classList.remove('disabled'));
            row.getElement().classList.add('disabled');
            ['fa-trash', 'fa-link'].forEach(icon => row.getElement().querySelector(`.fa.${icon}`).style.border = 'initial');
            ['delete', 'link'].forEach(id => row.getElement().querySelector(`input[type="checkbox"]#${id}`).checked = false);
            rowData.action = 'og';
            addToProcessQueue(rowData);
        } else
        if (e.target.type === 'checkbox') {
            const targetId = e.target.id === 'delete' ? 'link' : 'delete';
            rowData.action = e.target.checked ? (targetId === 'link' ? 'delete' : 'link') : '';
            row.getElement().querySelector(`input[type="checkbox"]#${targetId}`).checked = false;
            addToProcessQueue(rowData);
        }

    }
</script>