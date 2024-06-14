<script>
    const right = new Tabulator("#right", {
        //data: matchingObjects,
        layout: "fitColumns",
        columns: [
            {title: "Action", field: "action", sorter: "string"},
            {title: "Directory", field: "path", sorter: "string"}
        ]
    });
</script>

