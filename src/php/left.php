<script>
function findObjectsWithMatchingHash() {
  const result = [];
  Object.keys(db)
    .filter(key => Array.isArray(db[key]))
    .forEach(key => {
      const array = db[key];
      array.forEach(obj => {
        if (array.some(otherObj => otherObj !== obj && otherObj.hash === obj.hash)) {
            obj.path = obj.path.map(innerArray => innerArray.join('/'));            obj.count = obj.length;
            obj.recoverable = ( (obj.count - 1));
            console.error(obj)
          result.push(obj);
        }
      });
    });
  return result;
}

function dateFormatter(cell) {
    const date = new Date(cell.getValue(0));
    return date.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
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

const matchingObjects = findObjectsWithMatchingHash();
let totalSum = 0;
matchingObjects.forEach(row => {
    totalSum += row.size;
});
let totalSumFormatted = convertFileSize({ getValue: () => totalSum });

const leftTable = new Tabulator("#left", {
    selectableRows: 1,
    data: matchingObjects,
    groupBy: "hash",
    rowSelectableCheck: function(row) {
        return !row.getElement().classList.contains('disabled');
    },
    groupHeader: function(value, count, data, group){
        return `<input type="checkbox" id="${value}-checkbox"> ${value} <span style='color:#d00; margin-left:10px;'>(${count} item)</span>`;
    },
    //layout: "-webkit-fill-available",
    footerElement: `<div>Total Size: ${totalSumFormatted}</div>`,
    columns: [
        {
            headerSort: false,
            maxWidth: 40,
            formatter: function(cell, formatterParams, onRendered) {
                let rowData = cell.getRow().getData();
                return `<div style='display: flex; align-items: center; justify-content: center; height: 100%;'><input type='radio' name='rowSelection-${rowData.hash}'></div>`;
            },
            cellClick: function(e, cell) {
                // Get the row and group
                let row = cell.getRow();
                let group = row.getGroup();

                // Remove the 'disabled' class from all rows in the group
                group.getRows().forEach(function(row) {
                    row.getElement().classList.remove('disabled');
                });

                // Add the 'disabled' class to the selected row
                row.getElement().classList.add('disabled');

                console.log("Radio button clicked on row: ", row.getData());
            }
        },
{
    headerSort: false,
    maxWidth: 40,
    formatter: function(cell, formatterParams, onRendered) {
        let disabled = cell.getRow().getElement().classList.contains('disabled') ? 'disabled' : '';
        return `<div style='display: flex; align-items: center; justify-content: center; height: 100%;'><button class='fa fa-trash' style='width: 15px; margin: 0; padding: 0; border: none; background: none;' ${disabled}></button></div>`;
    },
    cellClick: function(e, cell) {
        // Get the row data
        let rowData = cell.getRow().getData();

        // Add a new property to the row data
        rowData.action = "delete";

        // Check if the row data already exists in the right table
        let rightTableData = right.getData();
        let isDuplicate = rightTableData.some(function(row) {
            return row.hash === rowData.hash;
        });

        // If the row data already exists in the right table, display a message
        if (isDuplicate) {
            alert("This row already exists in the right table.");
        } else {
            // If the row data does not already exist in the right table, add it
            right.addRow(rowData);
        }
    }
},
{
    headerSort: false,
    maxWidth: 40,
    formatter: function(cell, formatterParams, onRendered) {
        let disabled = cell.getRow().getElement().classList.contains('disabled') ? 'disabled' : '';
        return `<div style='display: flex; align-items: center; justify-content: center; height: 100%;'><button class='fa fa-link' style='width: 15px; margin: 0; padding: 0; border: none; background: none;' ${disabled}></button></div>`;
    },
    cellClick: function(e, cell) {
        // Get the row data
        let rowData = cell.getRow().getData();

        // Add a new property to the row data
        rowData.action = "link";

        // Check if the row data already exists in the right table
        let rightTableData = right.getData();
        let isDuplicate = rightTableData.some(function(row) {
            return row.hash === rowData.hash;
        });

        // If the row data already exists in the right table, display a message
        if (isDuplicate) {
            alert("This row already exists in the right table.");
        } else {
            // If the row data does not already exist in the right table, add it
            right.addRow(rowData);
        }
    }
},
        {title: "Hash", field: "hash", sorter: "string", visible: false},
        {title: "File", field: "path", sorter: "string", width: "-webkit-fill-available"},
        //{title: "#", field: "count", sorter: "number"},
        {title: "Size", field: "size", sorter: "number", formatter: convertFileSize, bottomCalc: "sum", bottomCalcFormatter: convertFileSize},
        //{title: "Recoverable", field: "recoverable", sorter: "number", formatter: convertFileSize},
        {title: "Last Accessed", field: "atimeMs", sorter: "date", formatter: dateFormatter},
        {title: "Last Modified", field: "mtimeMs", sorter: "date", formatter: dateFormatter},
        {title: "Last Metadata Change", field: "ctimeMs", sorter: "date", formatter: dateFormatter}
    ],
    rowFormatter: function(row) {
        let group = row.getGroup();
        if (group && group.getRows()[0] === row) {
            let rowElement = row.getElement();
            let radioButton = rowElement.querySelector("input[type='radio']");
            radioButton.checked = true;

            // Add a class to the row element when the radio button is selected
            rowElement.classList.add('disabled');
        }
    },
});

leftTable.on("rowSelected", function(row) {
    const rowData = row.getData("");
    const hashValue = rowData.hash;
});
</script>
