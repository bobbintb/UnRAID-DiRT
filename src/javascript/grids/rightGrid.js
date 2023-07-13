const rightGrid = document.createElement('revo-grid');
rightGrid.readonly = true;
rightGrid.resize = true;
rightGrid.style.border = '1px solid white';
rightGrid.style.width = 'auto';
function popRightGrid() {
    const rightrowsArray = Object.values(queue);
    //console.log(rightrowsArray);
    const rightrows = rightrowsArray.map(item => {
        return {
            action: item.action,
            file: item.dir + item.file,
            size: item.st_size
        };
    });
    rightGrid.columns = rightcolumns;
    rightGrid.source = rightrows;
}

popRightGrid();
window.rightGrid = rightGrid;
