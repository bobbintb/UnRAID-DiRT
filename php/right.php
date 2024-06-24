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
                    if (e.target.tagName === 'I') {
                        let rowData = cell.getRow().getData();
                        cell.getRow().delete();
                        let leftTableRow = leftTable.getRow(rowData.id);
                        if (leftTableRow) {
                            leftTableRow.getCells().forEach(function(cell) {
                                cell.getElement().classList.remove('strike-through');
                            });
                        }
                    }
                }
            },
            {title: "File", field: "path", sorter: "string"}
        ],
    });
</script>

