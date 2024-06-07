<script>
    function findItemsWithHash(targetHash) {
        const itemsWithTargetHash = [];
        for (const key in db) {
            if (db.hasOwnProperty(key)) {
                db[key].forEach(item => {
                    if (item.hasOwnProperty('hash') && item.hash === targetHash) {
                        itemsWithTargetHash.push(item);
                    }
                });
            }
        }
        return itemsWithTargetHash;
    }

    const bottomData = findItemsWithHash();

    const bottom = new Tabulator("#bottom", {
        data: bottomData,
        layout: "fitColumns",
        rowHeader:{formatter:"rowSelection", titleFormatter:"rowSelection", headerSort:false, resizable: false, maxWidth:"10px", frozen:true, headerHozAlign:"center", hozAlign:"center"},

        columns: [
            {title: "Directory", field: "path", sorter: "string"},
            {title: "File Name", field: "nlink", sorter: "number"},
            {title: "Links", field: "nlink"},
            {title: "Size", field: "size", formatter: convertFileSize},
            {title: "Last Accessed", field: "atimeMs", sorter: "date", formatter: customFormatter},
            {title: "Last Modified", field: "mtimeMs", sorter: "date", formatter: customFormatter},
            {title: "Last Metadata Change", field: "ctimeMs", sorter: "date", formatter: customFormatter},
            {title: "α", field: "birthtimeMs", hozAlign: "center", formatter:"toggle", formatterParams:{
                    onValue:"on",
                    offValue:"off",
                    //onTruthy:true,
                    onColor:"green",
                    offColor:"red",
                    clickable:true,
                }}
        ]
    });
</script>

