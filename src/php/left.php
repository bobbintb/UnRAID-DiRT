<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tabulator Table Example</title>
    <link href="https://unpkg.com/tabulator-tables@6.2.1/dist/css/tabulator.min.css" rel="stylesheet">
</head>

<body>
    <div id="table"></div>
    <script type="text/javascript" src="https://unpkg.com/tabulator-tables@6.2.1/dist/js/tabulator.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/luxon/build/global/luxon.min.js"></script>
<script>
    


    <?php $db = file_get_contents('./plugins/bobbintb.system.dedupe/files.json');?>
const db = <?php echo $db; ?>;




const tableData = Object.values(db).reduce((acc, val) => acc.concat(val), []);



function findObjectsWithMatchingHash() {
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
    for (const hash in hashMap) {
        if (hashMap[hash].length > 1) {
            size = hashMap[hash][0]['size']
            count = hashMap[hash].length,
            nonUniqueHashes.push({
                hash,
                count,
                size,
                freeable: ((size - 1)* count)
            });
        }
    }

    return nonUniqueHashes;
}






//const matchingObjects = findObjectsWithMatchingHash();
const matchingObjects = findNonUniqueHashes();
console.log(matchingObjects);

function customFormatter(cell, formatterParams, onRendered) {
    //cell - the cell component
    //formatterParams - parameters set for the column
    //onRendered - function to call when the formatter has been rendered
    var date = new Date(cell.getValue())
    return date.toDateString(); //return the contents of the cell;
}

function sizeFormatter(cell, formatterParams, onRendered) {
    //cell - the cell component
    //formatterParams - parameters set for the column
    //onRendered - function to call when the formatter has been rendered
    var date = new Date(cell.getValue())
    return date.toDateString(); //return the contents of the cell;
}

function convertFileSize(cell, formatterParams, onRendered) {
    const size = cell.getValue();
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

var table = new Tabulator("#table", {
 	height: "100%",
 	data:matchingObjects,
 	layout:"fitColumns",
     columns:[
    {title:"Files", field:"hash", sorter:"string"},
    {title:"#", field:"count", sorter:"number"},
    {title:"Size", field:"size", sorter: "number", formatter: convertFileSize},
    {title:"freeable", field:"freeable", sorter: "number", formatter: convertFileSize}
    ]
});

var table2 = new Tabulator("#table2", {
 	height: "100%",
 	data:matchingObjects,
 	layout:"fitColumns",
    columns:[
    {title:"Directory", field:"path", sorter:"string", headerFilter:"input"},
    {title:"File Name", field:"nlink", sorter:"number"},
    {title:"Links", field:"nlink"},
    {title:"Size", field:"size", formatter: convertFileSize},
    {title:"Last Accessed", field:"atimeMs", sorter: "date", formatter: customFormatter},
    {title:"Last Modified", field:"mtimeMs", sorter: "number"},
    {title:"Last Metadata Change", field:"ctimeMs", sorter: "number", hozAlign:"center"},
    {title:"α", field:"birthtimeMs", hozAlign:"center"}
    //{title:"hash", field:"hash", hozAlign:"center"}

    ]
});
    </script>
</body>
</html>
