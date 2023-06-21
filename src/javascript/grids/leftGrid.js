const leftGrid = document.createElement('revo-grid');
leftGrid.readonly = true;
leftGrid.resize = true;
//leftGrid.filter = true;
leftGrid.style.width = 'initial';
leftGrid.style.border = '1px solid white';

// populates the button grid when a row on the left grid is clicked.
leftGrid.addEventListener("beforecellfocus", (event) => {
    const t1fullHash = event.detail.model.fullHash;
    fetch(`/plugins/bobbintb.system.dedupe/include/bottomGrid.php?function=popBottomGrid&t1fullHash=${t1fullHash}`)
        .then(response => response.json())
        .then(data => {
            checkOriginals(t1fullHash, data);
            popBottomGrid(data);
        });
});

const leftrowsArray = JSON.parse(Object.values(results));
const leftrows = leftrowsArray.map(item => {
    return {
        fullHash: item.fullHash,
        count: item.count,
        size: item.st_size
    };
});

leftGrid.columns = leftcolumns;
leftGrid.source = leftrows;
