<script>
function findObjectsWithMatchingHash() {
    console.log("test");
  const result = [];
  Object.keys(db)
    .filter(key => Array.isArray(db[key])) // Filter out non-array values
    .forEach(key => {
      const array = db[key];
      // Iterate over each object in the array
      array.forEach(obj => {
        // Check if any other object in the same array has the same hash
        if (array.some(otherObj => otherObj !== obj && otherObj.hash === obj.hash)) {
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
    for (const hash in hashMap) {
        if (hashMap[hash].length > 1) {
            size = hashMap[hash][0]['size']
            count = hashMap[hash].length
            nonUniqueHashes.push({
                hash,
                count,
                size,
                freeable: (size * (count - 1))
            });
        }
    }
    return nonUniqueHashes;
}

const matchingObjects = findNonUniqueHashes();

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

const leftTable = new Tabulator("#left", {
    height: "100%",
    selectableRows: 1,
    data: matchingObjects,
    layout: "fitColumns",
    columns: [
        {title: "Files", field: "hash", sorter: "string"},
        {title: "#", field: "count", sorter: "number"},
        {title: "Size", field: "size", sorter: "number", formatter: convertFileSize},
        {title: "freeable", field: "freeable", sorter: "number", formatter: convertFileSize}
    ]
});

leftTable.on("rowSelected", function(row) {
    const rowData = row.getData("");
    const hashValue = rowData.hash;
    const matchingItems = findItemsByHash(db, hashValue);
    bottom.setData(matchingItems);
    console.log("Matching items:", matchingItems);
});
</script>
