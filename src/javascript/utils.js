originals = loadlocalStorage('originals');
queue = loadlocalStorage('queue');

function checkQueue(data, storageKey) {
    queue[data.dir + data.file] = data;
    addToLocalStorage(storageKey);
}

function addToLocalStorage(storageKey) {
    localStorage.setItem(storageKey, JSON.stringify(window[storageKey]));
}

function convertFileSize(size) {
    if (typeof size !== 'undefined' && size !== null) {
        const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
    } else {
        return null;
    }
}

function convertTimeStamp(timestamp) {
    if (typeof timestamp !== 'undefined' && timestamp !== null) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    } else {
        return null;
    }
}

const numericCompare = (cell1, cell2, ascending) => {
    const value1 = parseInt(cell1);
    const value2 = parseInt(cell2);
    return (value1 - value2) * (ascending ? 1 : -1);
};

function checkOriginals(t1fullHash, data) {
    if (!(originals.hasOwnProperty(t1fullHash))) {
        originals[t1fullHash] = data[0].fqfn;
        addToLocalStorage('originals');
    }
}

function loadlocalStorage(JsonFile) {
    const storedData = localStorage.getItem(JsonFile);
    if (storedData === null) {
        return {};
    }
    return JSON.parse(storedData);
}
