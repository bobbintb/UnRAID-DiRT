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
const stats = JSON.parse(Object.values(results))[0];
const leftrowsArray = JSON.parse(Object.values(results)).splice(1);
const leftrows = leftrowsArray.map(item => {
    return {
        fullHash: item.fullHash,
        count: item.count,
        size: item.st_size
    };
});

function sumProperties(leftrows) {
    const sums = [0, 0, 0]; // Initialize the sums array for three properties: [sizeSum, widthSum, heightSum]  
    for (let i = 0; i < leftrows.length; i++) {
        const { count, size } = leftrows[i];
        sums[0] += count;
        sums[1] += size;
        sums[2] += (count - 1) * size;
    }
    return sums;
}

// Calculate the sums of properties
const totalSums = sumProperties(leftrows);

leftGrid.columns = leftcolumns;
leftGrid.source = leftrows;
const pinnedBottomSource = [{ fullHash: 'Total', size: totalSums[1], count: totalSums[0], recoverable: totalSums[2] }];
leftGrid.pinnedBottomSource = pinnedBottomSource;
