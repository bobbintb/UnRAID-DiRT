<script>
    const rightTable = new Tabulator("#right", {
        //data: matchingObjects,
        layout: "fitColumns",
        columns: [
            {
                field: "action",
                maxWidth: 40,
                sorter: "string",
                formatter: function(cell) {
                    let value = cell.getValue();
                    let iconClass = value === 'link' ? 'fa-link' : 'fa-trash';
                    return `<div style='display: flex; align-items: center; justify-content: center; height: 100%;'><i class='fa ${iconClass}'></i>`;
                },
                cellClick: function(e, cell) {
                    // Check if the clicked element is an icon
                    if (e.target.tagName === 'I') {
                        // If it is, delete the row
                        cell.getRow().delete();
                    }
                }
            },
            {title: "File", field: "path", sorter: "string"}
        ],
    });
</script>

