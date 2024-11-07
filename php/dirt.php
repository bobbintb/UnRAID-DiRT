<script type="module">
    async function process(dataObj) {
        try {
            const response = await fetch(`<?php echo "http://" . $_SERVER["SERVER_ADDR"] . ":3000"; ?>/process/`, {
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

    function dateFormatter(cell) {
        const date = new Date(Number(cell.getValue()));
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }
    Tabulator.extendModule("columnCalcs", "calculations", {
        "recoverableSize":function(values, data, calcParams){
            return (values.length - 1) * values[0];
        }
    });
    function sizeFormatter(cell) {
        const date = new Date(cell.getValue(0));
        return date.toDateString();
    }

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
    let groups = {};
    let datetime_format;

    const leftTable = new Tabulator("#dirt", {
        selectableRows: 1,
        ajaxURL: `http://192.168.1.2:3000/load`,
        ajaxConfig: { method: "GET" },
        ajaxResponse: function(url, params, response) {
            datetime_format = response.datetime_format
            this.options.columns[6].formatterParams.outputFormat=datetime_format
            this.options.columns[7].formatterParams.outputFormat=datetime_format
            this.options.columns[8].formatterParams.outputFormat=datetime_format
            console.error(response.result)
            return response.result;
        },
        groupBy: "hash",
        setGroupStartOpen: true,
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
        // footerElement: `<div>Total Size: ${totalSumFormatted}, Total Groups: ${groupCount}</div>`,
        columns: [
            {
                // Radio button column
                title: `<div class="custom-arrow"
                             id='radio-og'>
                    </div>`,
                headerHozAlign: "center",
                headerSort: false,
                maxWidth: 40,
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
                width: "-webkit-fill-available",
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
        // This selects the first radio button
        rowFormatter: function (row) {
            let group = row.getGroup();
            if (group && group.getRows()[0] === row) {
                let rowElement = row.getElement();
                let radioButton = rowElement.querySelector("input[type='radio']");
                radioButton.checked = true;
                rowElement.classList.add('disabled');
            }
        },
    });

    leftTable.on("headerClick", function (e, column) {
        if (column._column.definition.title.includes("custom-arrow")) {
            let arrowCell = document.getElementsByClassName('custom-arrow')[0]
            arrowCell.style.setProperty('border-width', arrowCell.style.borderWidth === '6px 6px 0px' ? '6px 0px 6px 6px' : '6px 6px 0px');
            arrowCell.style.setProperty('border-left-color', arrowCell.style.borderLeftColor === 'transparent' ? 'rgb(102, 102, 102)' : 'transparent');
            arrowCell.style.setProperty('border-right-style', arrowCell.style.borderRightStyle === 'solid' ? 'initial' : 'solid');
            arrowCell.style.setProperty('border-right-color', arrowCell.style.borderRightColor === 'transparent' ? 'initial' : 'transparent');
            arrowCell.style.setProperty('border-top-color', arrowCell.style.borderTopColor === 'rgb(102, 102, 102)' ? 'transparent' : 'rgb(102, 102, 102');
            arrowCell.style.setProperty('border-bottom-style', arrowCell.style.borderBottomStyle === 'initial' ? 'solid' : 'initial');
            arrowCell.style.setProperty('border-bottom-color', arrowCell.style.borderBottomColor === 'initial' ? 'transparent' : 'initial');
            leftTable.setGroupStartOpen(!leftTable.options.groupStartOpen);
            leftTable.setGroupBy(false);
            leftTable.setGroupBy("hash");
        }
    });


    function actionChange(e, cell) {
        if (e.target.type === 'radio') {    // needed if you click in the cell but miss the button
            let row = cell.getRow();
            let group = row.getGroup();
            let rowData = row.getData();
            group.getRows().forEach(function (row) {
                row.getElement().classList.remove('disabled');
            });
            row.getElement().classList.add('disabled');
            row.getElement().style.color = '';
            row.getElement().querySelector('.fa.fa-trash').style.border = 'initial';
            row.getElement().querySelector('.fa.fa-link').style.border = 'initial';
            const trashCheckbox = row.getElement().querySelector(`input[type="checkbox"]#delete`);
            const linkCheckbox = row.getElement().querySelector(`input[type="checkbox"]#link`);
            trashCheckbox.checked = false;
            linkCheckbox.checked = false;
            rowData.action='og'
            // process(rowData);
        }
        if (e.target.type === 'checkbox') {    // needed if you click in the cell but miss the button
            const checkbox = cell.getElement().querySelector('input[type="checkbox"]');
            let row = cell.getRow();
            let rowData = row.getData();
            // console.error(rowData)
            const targetId = checkbox.id === "delete" ? "link" : "delete";
            rowData.action = targetId === "link" ? "delete" : "link";
            const targetCheckbox = row.getElement().querySelector(`input[type="checkbox"]#${targetId}`);
            targetCheckbox.checked = false;
            console.error(rowData)
            process(rowData);
        }
    }


</script>

