document.addEventListener('DOMContentLoaded', function () {
  enableBorders = true;
  enableBorders = false;
  enablePadding = true;
  enablePadding = false;
  debugPadingSize = '5px';
  padingSize = '15px';

  // solid red
  const parent = document.querySelector('revo-grid');
  parent.style.display = 'flex';
  parent.style.flex = 1;
  parent.style.height = '100ch';

  const style = document.createElement('style');
  style.innerHTML = "revo-grid[theme=default] revogr-header .header-rgRow, revo-grid[theme=default] revogr-header .group-rgRow { text-transform: none; }";
  document.head.appendChild(style);

  // solid gold
  const rightButtonContainer = document.createElement('div');
  rightButtonContainer.appendChild(clearQueue);

  // solid green
  const rightContainer = document.createElement('div');
  rightContainer.style.display = 'flex';
  rightContainer.style.flexDirection = 'column';
  rightContainer.style.flex = 1;
  rightContainer.style.overflow = 'auto';
  rightContainer.style.paddingLeft = padingSize;
  rightContainer.appendChild(rightGrid);
  rightContainer.appendChild(rightButtonContainer);

  // dotted purple
  const gridContainer = document.createElement('div');
  gridContainer.style.display = 'flex';
  gridContainer.style.height = '65%';
  gridContainer.style.paddingBottom = padingSize;
  gridContainer.appendChild(leftGrid);
  gridContainer.appendChild(rightContainer);

  // solid blue
  const bottomButtonContainer = document.createElement('div');
  bottomButtonContainer.appendChild(processQueue);
  bottomButtonContainer.appendChild(linkButton);

  parent.appendChild(gridContainer);
  parent.appendChild(bottomGrid);
  parent.appendChild(bottomButtonContainer);

  if (enableBorders) {
    parent.style.border = '1px solid red';
    bottomButtonContainer.style.border = '1px solid blue';
    gridContainer.style.border = '1px dotted purple';
    rightContainer.style.border = '1px solid green';
    rightButtonContainer.style.border = '1px solid gold';
    leftGrid.style.border = '1px dotted orange';
    bottomGrid.style.border = '1px dotted green';
    rightGrid.style.border = '1px dotted yellow';
  }

  if (enablePadding) {
    rightButtonContainer.style.paddingLeft = debugPadingSize;
    rightButtonContainer.style.paddingRight = debugPadingSize;
    rightButtonContainer.style.paddingTop = debugPadingSize;
    rightButtonContainer.style.paddingBottom = debugPadingSize;
    rightContainer.style.paddingLeft = debugPadingSize;
    rightContainer.style.paddingRight = debugPadingSize;
    rightContainer.style.paddingTop = debugPadingSize;
    rightContainer.style.paddingBottom = debugPadingSize;
    gridContainer.style.paddingLeft = debugPadingSize;
    gridContainer.style.paddingRight = debugPadingSize;
    gridContainer.style.paddingTop = debugPadingSize;
    gridContainer.style.paddingBottom = debugPadingSize;
  }

  window.RevoGrid = this.RevoGrid;
});

//<script src="https://cdn.jsdelivr.net/npm/@revolist/revogrid@latest/dist/collection/plugins/autoSizeColumn.js"></script>