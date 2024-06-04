<script>

    function findItemsByHash(db, hashValue) {
        return Object.keys(db).filter(item => item.hash === hashValue);
    }

    const bottom = new Tabulator("#bottom", {
        height: "100%",
        data: matchingObjects,
        layout: "fitColumns",
        columns: [
            {title: "Directory", field: "path", sorter: "string", headerFilter: "input"},
            {title: "File Name", field: "nlink", sorter: "number"},
            {title: "Links", field: "nlink"},
            {title: "Size", field: "size", formatter: convertFileSize},
            {title: "Last Accessed", field: "atimeMs", sorter: "date", formatter: customFormatter},
            {title: "Last Modified", field: "mtimeMs", sorter: "number"},
            {title: "Last Metadata Change", field: "ctimeMs", sorter: "number", hozAlign: "center"},
            {title: "α", field: "birthtimeMs", hozAlign: "center"}
        ]
    });
</script>

