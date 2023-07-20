const leftGrid = document.createElement('revo-grid');
leftGrid.readonly = true;
leftGrid.resize = true;
//leftGrid.filter = true;
leftGrid.style.width = 'initial';
leftGrid.style.border = '1px solid white';

// populates the button grid when a row on the left grid is clicked.
leftGrid.addEventListener("beforecellfocus", (event) => {
  const t1fullHash = event.detail.model.fullHash;
  // This works but since I had to change the way the left grid populates, I already have the data and don't need to pull it from SQL anymore.
  // But then I would have to re-write this.
  fetch(`/plugins/bobbintb.system.dedupe/include/sqliteconnect.php?function=popBottomGrid&t1fullHash=${t1fullHash}`)
    .then(response => response.json())
    .then(data => {
      checkOriginals(t1fullHash, data);
      popBottomGrid(data);
    });
});

const removeUniquefullHash = (jsonArray) => {
  return jsonArray.filter((object, index, array) => {
    const fullHash = object.fullHash;
    if (fullHash === null) {
      return false;
    }
    return array.some((item, i) => i !== index && item.fullHash === fullHash);
  });
};

const groupByFullHash = (jsonArray) => {
  return jsonArray.reduce((grouped, object) => {
    const fullHash = object.fullHash;
    if (fullHash !== null) {
      if (!grouped.hasOwnProperty(fullHash)) {
        grouped[fullHash] = [];
      }
      grouped[fullHash].push(object);
    }
    return grouped;
  }, {});
};

const removeDuplicateInode = (jsonArray) => {
  const seenInodes = new Set();
  const newJsonArray = [];
  for (const object of jsonArray) {
    const inode = BigInt(object.st_inode); // Convert to BigInt
    if (!seenInodes.has(inode)) {
      newJsonArray.push(object);
      seenInodes.add(inode);
    }
  }
  return newJsonArray;
};

const leftrowsArray = JSON.parse(results);
// add hardlink conditional
const leftrowsArrayFilterHashes = removeUniquefullHash(leftrowsArray);
const leftrowsGroup = groupByFullHash(leftrowsArrayFilterHashes);

const leftrows = Object.values(leftrowsGroup).map((array) => {
  const fileName = array[0].file;
  const count = array.length;
  const st_size = array[0].st_size;
  const fullHash = array[0].fullHash;
  return { fileName: fileName, count: count, size: st_size, fullHash: fullHash };
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