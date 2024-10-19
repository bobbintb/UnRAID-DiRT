<script>
    const right = new Tabulator("#right", {
        data: matchingObjects,
        layout: "fitColumns",
        columns: [
            {title: "Directory", field: "path", sorter: "string", headerFilter: "input"},
            {title: "File Name", field: "nlink", sorter: "number"},
            {title: "Links", field: "nlink"},
            {title: "Size", field: "size", formatter: convertCellFileSize},
            {title: "Last Accessed", field: "atimeMs", sorter: "date", formatter: dateFormatter},
            {title: "Last Modified", field: "mtimeMs", sorter: "number"},
            {title: "Last Metadata Change", field: "ctimeMs", sorter: "number", hozAlign: "center"},
            {title: "α", field: "birthtimeMs", hozAlign: "center"}
        ]
    });
</script>

