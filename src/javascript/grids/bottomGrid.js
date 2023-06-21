const bottomGrid = document.createElement('revo-grid');
bottomGrid.readonly = true;
bottomGrid.resize = true;
bottomGrid.style.height = '35%';
bottomGrid.style.border = '1px solid white';

function popBottomGrid(data) {
    const bottomrows = data.map(item => {
        const parsedData = JSON.parse(item.data);
        return {
            dir: parsedData.dir,
            file: parsedData.file,
            st_nlink: parsedData.st_nlink,
            size: parsedData.st_size,
            st_atime: parsedData.st_atime,
            st_mtime: parsedData.st_mtime,
            st_ctime: parsedData.st_ctime,
            fullHash: parsedData.fullHash
        };
    });
    bottomGrid.columns = bottomcolumns;
    bottomGrid.source = bottomrows;
    deselectOtherRadios();
}

window.bottomGrid = bottomGrid;


