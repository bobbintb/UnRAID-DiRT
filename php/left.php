<script type="module">
    let matchingObjects;

    async function hash() {
        try {
            const response = await Promise.race([
                fetch(`<?php echo "http://" . $_SERVER["SERVER_ADDR"] . ":3000"; ?>/hash`)
            ]);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            let results =await response.json()
            // for (let i = 0; i < results.length; i++) {
            //     if (results[i].path.length > 1) {
            //         let originalPath = [results[i].path[0]];
            //         let newPath = results[i].path.slice(1);
            //
            //         let newObject = { ...results[i], path: newPath };
            //         results[i].path = originalPath;
            //
            //         results.splice(i + 1, 0, newObject);
            //         i++;
            //     }
            // }
            // console.error(results)
            return results;
        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
    }

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

    let totalSum = 0;
    matchingObjects.forEach(row => {
        totalSum += row.bottom;
    });
    let totalSumFormatted = convertCellFileSize({
        getValue: () => totalSum
    });

    let groupCount = 0;
    let groups = {};

    const leftTable = new Tabulator("#left", {
        persistenceMode:"local",
        persistence:{
            columns: ["action"], //persist changes to the width, visible and frozen properties
        },
        // persistenceWriterFunc:function(id, type, data){
        //     //id - tables persistence id
        //     //type - type of data being persisted ("sort", "filter", "group", "page" or "columns")
        //     //data - array or object of data
        //
        //     localStorage.setItem(id + "-" + type, JSON.stringify(data));
        // },
        // persistenceReaderFunc:function(id, type){
        //     //id - tables persistence id
        //     //type - type of data being persisted ("sort", "filter", "group", "page" or "columns")
        //
        //     const data = localStorage.getItem(id + "-" + type);
        //
        //     return data ? JSON.parse(data) : false;
        // },
        selectableRows: 1,
        data: matchingObjects,
        // groupBy: ["hash", "ino"],
        groupBy: "hash",
        setGroupStartOpen: true,
        rowSelectableCheck: function (row) {
            return !row.getElement().classList.contains('disabled');
        },
        groupHeader: function (value, count) {
            return `<div class="tabulator-cell" role="gridcell" style="margin-left: 4px; border-left: 1px solid #aaa; height: 24px; width: 41px;">
                        <div style="display: flex; font-size: large; align-items: center; justify-content: center; height: 100%;">
                            <i class="fa fa-trash"></i></div></div>
                    <div class="tabulator-cell" role="gridcell" style="height: 24px; width: 37px;">
                        <div style="display: flex; font-size: large; align-items: center; justify-content: center; height: 100%;">
                            <i class="fa fa-link"></i></div></div>
                    ${value}
                    <span style='color:#d00; margin-left:10px;'>(${count - 1} duplicate files)</span>`;
        },
        footerElement: `<div>Total Size: ${totalSumFormatted}, Total Groups: ${groupCount}</div>`,
        columns: [
            {
                // Radio button column
                title: `<div class="custom-arrow"
                             style="display: inline-flex;
                                    font-size: large;
                                    align-items: center;
                                    justify-content: center;
                                    height: 100%;
                                    cursor: pointer;
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
                formatter: function (cell) {
                    let rowData = cell.getRow().getData();
                    return `<div style='display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        height: 100%;'>
                            <input type='radio' name='rowSelection-${rowData.hash}'></div>`;
                },
                cellClick: function (e, cell) {
                    if (e.target.type !== 'radio') {
                        return;
                    }
                    let row = cell.getRow();
                    let group = row.getGroup();
                    group.getRows().forEach(function (row) {
                        row.getElement().classList.remove('disabled');
                    });
                    row.getElement().classList.add('disabled');
                    row.getElement().style.color = '';
                    row.getElement().querySelector('.fa.fa-trash').style.border = 'initial';
                    row.getElement().querySelector('.fa.fa-link').style.border = 'initial';
                    // need to remove row from queue
                }
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
                // action: 'delete',
                headerSort: false,
                maxWidth: 40,
                formatter: function (cell) {
                    let disabled = cell.getRow().getElement().classList.contains('disabled') ? 'disabled' : '';
                    return `<div style='display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        height: 100%;'>
                                <i class='fa fa-trash' style='text-align: center;
                                                              width: 15px;
                                                              margin: 0;
                                                              padding: 0;
                                                              border: none;
                                                              background: none;' ${disabled}></i></div>`;
                },
                cellClick: function (e, cell) {
                    let row = cell.getRow();
                    let rowData = row.getData();
                    const iconElement = cell.getElement().querySelector('.fa.fa-trash');
                    const otherIcon = row.getElement().querySelector('.fa.fa-link');
                    if (rowData.action === "delete") {
                        rowData.action = "remove"
                        iconElement.style.color = '';
                        iconElement.style.border = '';
                        iconElement.style.borderRadius = '';
                        iconElement.style.padding = '';
                        row.getElement().style.color = '';
                        process(rowData)
                        rowData.action = ""
                    } else {
                        rowData.action = "delete";
                        row.getElement().style.color = '';
                        row.getElement().style.color = 'red';
                        otherIcon.style.border = '';
                        otherIcon.style.borderRadius = '';
                        otherIcon.style.padding = '';
                        iconElement.style.border = '2px solid red';
                        iconElement.style.borderRadius = '5px';
                        iconElement.style.padding = '5px';
                        // add to a queue. the right table should reflect the queue, not be the queue.
                        console.error(rowData)
                        process(rowData)
                    }
                }
            },
            {
                // Link column
                title: `<div style="display: flex; font-size: large; align-items: center; justify-content: center; height: 100%;">
                            <i class="fa fa-link"></i>
                        </div>`,
                headerSort: false,
                maxWidth: 40,
                formatter: function (cell) {
                    let disabled = cell.getRow().getElement().classList.contains('disabled') ? 'disabled' : '';
                    return `<div style='display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        height: 100%;'>
                                <i class='fa fa-link' style='text-align: center;
                                                             width: 15px;
                                                             margin: 0;
                                                             padding: 0;
                                                             border: none;
                                                             background: none;' ${disabled}></i></div>`;
                },
                cellClick: function (e, cell) {
                    let row = cell.getRow();
                    let rowData = row.getData();
                    const iconElement = cell.getElement().querySelector('.fa.fa-link');
                    const otherIcon = row.getElement().querySelector('.fa.fa-trash');
                    if (rowData.action === "link") {
                        rowData.action = "remove"
                        iconElement.style.color = '';
                        iconElement.style.border = '';
                        iconElement.style.borderRadius = '';
                        iconElement.style.padding = '';
                        row.getElement().style.color = '';
                        process(rowData)
                        rowData.action = ""
                    } else {
                        rowData.action = "link";
                        row.getElement().style.color = '';
                        row.getElement().style.color = 'blue';
                        otherIcon.style.border = '';
                        otherIcon.style.borderRadius = '';
                        otherIcon.style.padding = '';
                        iconElement.style.border = '2px solid blue';
                        iconElement.style.borderRadius = '5px';
                        iconElement.style.padding = '5px';
                        // add to a queue. the right table should reflect the queue, not be the queue.
                        process(rowData)
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
                width: "-webkit-fill-available",
                formatter:"textarea"
            },
            //{title: "#", field: "count", sorter: "number"},
            {
                title: "Size",
                field: "size",
                sorter: "number",
                formatter: convertCellFileSize,
                bottomCalc: "recoverableSize",
                bottomCalcFormatter: convertCellFileSize
            },
            //{title: "Recoverable", field: "recoverable", sorter: "number", formatter: convertFileSize},
            {
                title: "Last Accessed",
                field: "atimeMs",
                sorter: "datetime",
                formatter: dateFormatter
            },
            {
                title: "Last Modified",
                field: "mtimeMs",
                sorter: "datetime",
                formatter: dateFormatter
            },
            {
                title: "Last Metadata Change",
                field: "ctimeMs",
                sorter: "date",
                formatter: dateFormatter
            }
        ],
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

    leftTable.on("rowSelected", function (row) {
        const rowData = row.getData("");
        const hashValue = rowData.hash;
    });

    leftTable.on("cellClick", function (e, cell) {
        // console.error('e')
        // console.error(e)
        // console.error('cell')
        // console.error(cell)
        //e - the click event object
        //cell - cell component
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

    leftTable.on("tableBuilt", function () {
        // need to load saved session and apply to table
        groups = leftTable.getGroups()
        let total = 0;
        groups.forEach(group => {
            total += Number(group["_group"].calcs.bottom.data.size);
        });
        document.querySelector('.tabulator-footer').innerText = `Recoverable Space: ${convertFileSize(total)}, Total Groups: ${groups.length}`;
    });

    function simulateClicksOnGroupCells(group, id) {
        const rows = group.getRows();
        rows.forEach(row => {
            if (!row.getElement().classList.contains('disabled')) {

                const cell = row.getElement().querySelector(`.${id[0]}.${id[1]}`);
            if (cell) {
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

    leftTable.on("groupClick", function(e, group) {
        simulateClicksOnGroupCells(group, e.target.classList);
    });

    leftTable.on("groupDblClick", function(e, group) {
        console.error("Specific cell clicked in group header:", e.target.classList.value);
        console.error("Specific cell clicked in group header:", e.target.classList);
        simulateClicksOnGroupCells(group, e.target.classList);
    });

    function toggleGroups() {
        const groups = leftTable.getGroups();
        groups.forEach(function (group) {
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


    // $('trash').on('change', '#select-all-products', function () {
    //     var productData = $("#gridCatalogProducts").tabulator("getData");
    //     var dataUpdate = [];
    //     if ($(this).is(":checked")) {
    //         $.each(productData, function (i, item) {
    //             if (item.cdeSelected == false) {
    //                 var obj = {
    //                     proCode: item.proCode,
    //                     cdeSelected: true
    //                 }
    //                 dataUpdate.push(obj);
    //             }
    //         });
    //     }
    //     else {
    //         $.each(productData, function (i, item) {
    //             var obj = {
    //                 proCode: item.proCode,
    //                 cdeSelected: false
    //             }
    //             dataUpdate.push(obj);
    //         });
    //     }
    //     $("#gridCatalogProducts").tabulator("updateData", dataUpdate);
    // });


</script>

