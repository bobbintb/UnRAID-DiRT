

<script>
function findObjectsWithMatchingHash() {
  const result = [];
  Object.keys(db)
    .filter(key => Array.isArray(db[key]))
    .forEach(key => {
      const array = db[key];
      array.forEach(obj => {
        if (array.some(otherObj => otherObj !== obj && otherObj.hash === obj.hash)) {
            //obj.path
            obj.count = obj.length;
            obj.recoverable = ( (obj.count - 1));
            console.error(obj)
          result.push(obj);
        }
      });
    });
  return result;
}

function findNonUniqueHashes() {
    const hashMap = {};
    const nonUniqueHashes = [];
    // Iterate over each key in the data object
    for (const key in db) {
        if (db.hasOwnProperty(key)) {
            // Iterate over each item in the array of values for the current key
            db[key].forEach(item => {
                if (item.hasOwnProperty('hash')) {
                    const { hash } = item;
                    if (hashMap[hash]) {
                        hashMap[hash].push(item);
                    } else {
                        hashMap[hash] = [item];
                    }
                }
            });
        }
    }

    // Find non-unique hash items and count them
    let size;
    let count;
    let file;
    for (const hash in hashMap) {
        if (hashMap[hash].length > 1) {
            size = hashMap[hash][0]['size']
            file = hashMap[hash][0]['path'][0].split('/').pop();
            count = hashMap[hash].length
            nonUniqueHashes.push({
                hash,
                file,
                count,
                size,
                freeable: (size * (count - 1))
            });
        }
    }
    return nonUniqueHashes;
}

const matchingObjects = findObjectsWithMatchingHash();

function customFormatter(cell) {
    const date = new Date(cell.getValue(0));
    return date.toDateString();
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


const printIcon = function (cell, formatterParams, onRendered) { //plain text value
    return "<i class='fa fa-print'></i>";
};

let totalSum = 0;
matchingObjects.forEach(row => {
    totalSum += row.size;
});

// Convert the total sum to a formatted string
let totalSumFormatted = convertFileSize({ getValue: () => totalSum });

const leftTable = new Tabulator("#left", {
    selectableRows: 1,
    data: matchingObjects,
    groupBy: "hash",
    //layout: "-webkit-fill-available",
    footerElement: `<div>Total Size: ${totalSumFormatted}</div>`,
    columns: [
        {title: "Hash", field: "hash", sorter: "string", visible: false},
        {title: "File", field: "path", sorter: "string", width: "-webkit-fill-available"},
        {title: "#", field: "count", sorter: "number"},
        {title: "Size", field: "size", sorter: "number", formatter: convertFileSize, bottomCalc: "sum", bottomCalcFormatter: convertFileSize},
        {title: "Recoverable", field: "recoverable", sorter: "number", formatter: convertFileSize},
        {title: "Last Accessed", field: "atimeMs", sorter: "date", formatter: customFormatter},
        {title: "Last Modified", field: "mtimeMs", sorter: "date", formatter: customFormatter},
        {title: "Last Metadata Change", field: "ctimeMs", sorter: "date", formatter: customFormatter}
    ]
});

leftTable.on("rowSelected", function(row) {
    const rowData = row.getData("");
    const hashValue = rowData.hash;
});
</script>
