<script type="module">
    let matchingObjects;

    async function hash() {
        try {
            const response = await Promise.race([
                fetch(`<?php echo "http://" . $_SERVER["SERVER_ADDR"] . ":3000"; ?>/hash`),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timed out')), 5000) // 5 seconds timeout
                )
            ]);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
    }

    matchingObjects = await hash();

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

    function sizeFormatter(cell) {
        const date = new Date(cell.getValue(0));
        return date.toDateString();
    }

    function convertFileSize(cell) {
        let size = cell.getValue(0);
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

    let totalSum = 0;
    matchingObjects.forEach(row => {
        totalSum += row.size;
    });
    let totalSumFormatted = convertFileSize({
        getValue: () => totalSum
    });

    let groupCount = 0;
    let groups = {};



    const leftTable = new Tabulator("#left", {
        selectableRows: 1,
        data: matchingObjects,
        groupBy: "hash",
        setGroupStartOpen: true,
        rowSelectableCheck: function(row) {
            return !row.getElement().classList.contains('disabled');
        },
        groupHeader: function(value, count) {
            return `<div class="tabulator-cell" role="gridcell" style="margin-left: 4px; border-left: 1px solid #aaa; height: 24px; width: 41px;">
                        <div style="display: flex; font-size: large; align-items: center; justify-content: center; height: 100%;">
                            <i class="fa fa-trash"></i></div></div>
                    <div class="tabulator-cell" role="gridcell" style="height: 24px; width: 37px;">
                        <div style="display: flex; font-size: large; align-items: center; justify-content: center; height: 100%;">
                            <i class="fa fa-link"></i></div></div>
                    ${value}
                    <span style='color:#d00; margin-left:10px;'>(${count-1} duplicate files)</span>`;},
        footerElement: `<div>Total Size: ${totalSumFormatted}, Total Groups: ${groupCount}</div>`,
        columns: [{
            // Radio button column
            title: `<div class="custom-arrow" style="display: inline-flex; font-size: large; align-items: center; justify-content: center; height: 100%; cursor: pointer;
                        border-width: 6px 6px 0px;
                        border-left-style: solid;
                        border-left-color: transparent;
                        border-right-style: solid;
                        border-right-color: transparent;
                        border-top-style: solid;
                        border-top-color: rgb(102, 102, 102);
                        border-bottom-style: initial;
                        border-bottom-color: initial;">
                    </div>`,
            headerHozAlign: "center",
            headerSort: false,
            maxWidth: 40,
            formatter: function(cell) {
                let rowData = cell.getRow().getData();
                return `<div style='display: flex; align-items: center; justify-content: center; height: 100%;'><input type='radio' name='rowSelection-${rowData.hash}'></div>`;
            },
            cellClick: function(e, cell) {
                if (e.target.type !== 'radio') {
                    return;
                }
                let row = cell.getRow();
                let group = row.getGroup();
                group.getRows().forEach(function(row) {
                    row.getElement().classList.remove('disabled');
                });
                row.getElement().classList.add('disabled');
            }
        },
            {
                // Trash column
                title: `<div style="display: flex; font-size: large; align-items: center; justify-content: center; height: 100%;">
    <i class="fa fa-trash"></i></div>`,
                headerSort: false,
                maxWidth: 40,
                formatter: function(cell) {
                    let disabled = cell.getRow().getElement().classList.contains('disabled') ? 'disabled' : '';
                    return `<div style='display: flex; align-items: center; justify-content: center; height: 100%;'><i class='fa fa-trash' style='text-align: center; width: 15px; margin: 0; padding: 0; border: none; background: none;' ${disabled}></i></div>`;
                },
                cellClick: function(e, cell) {
                    let rowData = cell.getRow().getData();
                    rowData.action = "delete";
                    let rightTableData = rightTable.getData();
                    let isDuplicate = rightTableData.some(function(row) {
                        return row.id === rowData.id;
                    });
                    if (isDuplicate) {
                        alert("This row already exists in the right table.");
                    } else {
                        cell.getRow().getCells().forEach(function(cell) {
                            cell.getElement().style.color = ''; // Resets color
                            // cell.getElement().classList.remove('strike-through');
                            cell.getElement().style.color = 'maroon';
                            // cell.getElement().classList.add('strike-through');
                        });
                        const iconElement = cell.getElement().querySelector('.fa.fa-trash');
                        if (iconElement) {
                            iconElement.style.border = '2px solid maroon';
                            iconElement.style.borderRadius = '5px';
                            iconElement.style.padding = '5px';
                        }
                        // add to a queue. the right table should reflect the queue, not be the queue.
                        rightTable.addRow(rowData);
                    }
                }
            },
            {
                // Link column
                title: `<div style="display: flex; font-size: large; align-items: center; justify-content: center; height: 100%;">
    <i class="fa fa-link"></i></div>`,
                headerSort: false,
                maxWidth: 40,
                formatter: function(cell) {
                    let disabled = cell.getRow().getElement().classList.contains('disabled') ? 'disabled' : '';
                    return `<div style='display: flex; align-items: center; justify-content: center; height: 100%;'><i class='fa fa-link' style='text-align: center; width: 15px; margin: 0; padding: 0; border: none; background: none;' ${disabled}></i></div>`;
                },
                cellClick: function(e, cell) {
                    let rowData = cell.getRow().getData();
                    rowData.action = "link";
                    let rightTableData = rightTable.getData();
                    let isDuplicate = rightTableData.some(function(row) {
                        return row.id === rowData.id;
                    });
                    if (isDuplicate) {
                        alert("This row already exists in the right table.");
                    } else {
                        cell.getRow().getCells().forEach(function(cell) {
                            cell.getElement().style.color = ''; // Resets color
                            // cell.getElement().classList.remove('strike-through');
                            cell.getElement().style.color = 'navy';
                            const iconElement = cell.getElement().querySelector('.fa.fa-link');
                            if (iconElement) {
                                iconElement.style.border = '2px solid navy';
                                iconElement.style.borderRadius = '5px';
                                iconElement.style.padding = '5px';
                            }
                        });
                        // add to a queue. the right table should reflect the queue, not be the queue.
                        rightTable.addRow(rowData);
                    }
                }
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
                width: "-webkit-fill-available"
            },
            //{title: "#", field: "count", sorter: "number"},
            {
                title: "Size",
                field: "size",
                sorter: "number",
                formatter: convertFileSize,
                bottomCalc: "sum",
                bottomCalcFormatter: convertFileSize
            },
            //{title: "Recoverable", field: "recoverable", sorter: "number", formatter: convertFileSize},
            {
                title: "Last Accessed",
                field: "atimeMs",
                sorter: "date",
                formatter: dateFormatter
            },
            {
                title: "Last Modified",
                field: "mtimeMs",
                sorter: "date",
                formatter: dateFormatter
            },
            {
                title: "Last Metadata Change",
                field: "ctimeMs",
                sorter: "date",
                formatter: dateFormatter
            }
        ],
        rowFormatter: function(row) {
            let group = row.getGroup();
            if (group && group.getRows()[0] === row) {
                let rowElement = row.getElement();
                let radioButton = rowElement.querySelector("input[type='radio']");
                radioButton.checked = true;
                rowElement.classList.add('disabled');
            }
        },
    });

    leftTable.on("rowSelected", function(row) {
        const rowData = row.getData("");
        const hashValue = rowData.hash;
    });

    leftTable.on("headerClick", function() {
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
    });

    leftTable.on("tableBuilt", function() {
        groups = leftTable.getGroups()
        groupCount = leftTable.getGroups().length;

        //start groups open
//change grouping
//trigger group on gender column

        document.querySelector('.tabulator-footer').innerText = `Total Size: ${totalSumFormatted}, Total Groups: ${groupCount}`;
    });

    function toggleGroups() {
        const groups = leftTable.getGroups();
        groups.forEach(function(group) {
            group.show();
        });
        console.log(groups);
    }


    // TODO:
    // fix color of scroll bars so it is more visible
    // removing file from actions list does not un-strike it from dupes list
    // fix total size on left table
    // need a delete all/link all for groups and everything
    // maybe red number of items on left decreases as each duplicate is addressed until it reaches 1 and turns green
</script>

