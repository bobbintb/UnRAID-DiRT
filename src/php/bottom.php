<script>
    function findItemsWithHash(targetHash) {
        const itemsWithTargetHash = [];
        for (const key in db) {
            if (db.hasOwnProperty(key)) {
                db[key].forEach(item => {
                    if (item.hasOwnProperty('hash') && item.hash === targetHash) {
                        const fullPath = item.path[0];
                        item.file = fullPath.substring(0, fullPath.lastIndexOf("/") + 1);
                        item.path = fullPath.substring(fullPath.lastIndexOf("/"));
                        itemsWithTargetHash.push(item);
                    }
                });
            }
        }
        return itemsWithTargetHash;
    }

    const bottomData = findItemsWithHash();
    var linkIcon = function(cell, formatterParams, onRendered){ //plain text value
        return "<i class='fa fa-link'></i>";
    };
    var trashIcon = function(cell, formatterParams, onRendered){ //plain text value
        return "<i class='fa fa-trash'></i>";
    };
    const bottom = new Tabulator("#bottom", {
        data: bottomData,
        layout: "fitData",
        rowHeader:{formatter:"rowSelection", titleFormatter:"rowSelection", headerSort:false, resizable: false, maxWidth:"10px", frozen:true, headerHozAlign:"center", hozAlign:"center"},
        columns: [
            {formatter:linkIcon, titleFormatter:linkIcon, resizable: false, headerSort:false, width:40, headerHozAlign:"center", hozAlign:"center", headerClick:function(e, column){
                    alert("Header for the icon column was clicked");
                }, cellClick:function(e, cell){alert("Printing row data for: " + cell.getRow().getData().path)}},
            {formatter:trashIcon, titleFormatter:trashIcon, resizable: false, headerSort:false, width:40, headerHozAlign:"center", hozAlign:"center", headerClick:function(e, column){
                    alert("Header for the icon column was clicked");
                }, cellClick:function(e, cell){alert("Printing row data for: " + cell.getRow().getData().path)}},
            {title: "Directory", field: "path", sorter: "string"},
            {title: "File Name", field: "file", sorter: "number"},
            {title: "Links", field: "nlink"},
            {title: "Size", field: "size", formatter: convertFileSize},
            {title: "Last Accessed", field: "atimeMs", sorter: "date", formatter: customFormatter},
            {title: "Last Modified", field: "mtimeMs", sorter: "date", formatter: customFormatter},
            {title: "Last Metadata Change", field: "ctimeMs", sorter: "date", formatter: customFormatter},
            {title: "α", field: "birthtimeMs", hozAlign: "center", formatter:"toggle", formatterParams:{
                    onValue:"on",
                    offValue:"off",
                    onColor:"green",
                    offColor:"red",
                    clickable:true,
                }, cellClick: function(e, cell) {
                    var cells = cell.getRow().getCells();
                    for (var i = 0; i < cells.length; i++) {
                        var cellElement = cells[i].getElement();
                        var inputElement = cellElement.querySelector('input');
                        if (inputElement && inputElement.type === 'checkbox') {
                            if(cell.getValue() === "on"){
                                cell.getRow().deselect();
                                inputElement.disabled = true;
                            } else if(cell.getValue() === "off"){
                                inputElement.disabled = false;
                            }
                        }
                        if (i === 1 || i === 2) {
                            if(cell.getValue() === "on"){
                                cellElement.style.pointerEvents = 'none';
                                cellElement.style.opacity = '0.4';
                            } else if(cell.getValue() === "off"){
                                cellElement.style.pointerEvents = '';
                                cellElement.style.opacity = '';
                            }
                        }
                    }
                }
                }
        ]
    });
</script>

cellClick: function(e, cell) {
if(cell.getValue() === "on"){
cell.getRow().deselect();
var cells = cell.getRow().getCells();
for (var i = 0; i < cells.length; i++) {
var cellElement = cells[i].getElement();
var inputElement = cellElement.querySelector('input');
if (inputElement && inputElement.type === 'checkbox') {
inputElement.disabled = true; // Disable the checkbox
break;
}
}
}
}