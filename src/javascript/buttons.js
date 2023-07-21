const processQueue = document.createElement('button');
processQueue.textContent = 'Process Queue';
processQueue.style.marginLeft = '10px';
processQueue.style.padding = '10px';
processQueue.style.width = 'fit-content';

const clearQueue = document.createElement('button');
clearQueue.textContent = 'Clear Queue';
clearQueue.style.padding = '10px';
clearQueue.style.height = 'fit-content';

const clearOriginals = document.createElement('button');
clearOriginals.textContent = 'Clear Originals';
clearOriginals.style.padding = '10px';
clearOriginals.style.height = 'fit-content';

processQueue.addEventListener('click', () => {
  var queueString = localStorage.getItem('queue');
  var queue = JSON.parse(queueString);
  var originalsString = localStorage.getItem('originals');
  var originals = JSON.parse(originalsString);
  var queueCommands = [];
  for (var key in queue) {
    if (queue.hasOwnProperty(key)) {
      var item = queue[key];
      var file = item.dir + item.file;
      if (item.action === "delete") {
        var command = 'rm -f "' + file + '"';
      }
      if (item.action === "link") {
        var target = originals[item.fullHash];
        // ln [OPTION] TARGET LINK_NAME
        var command = 'ln -f "' + target + '" "' + file + '"';
      }
      queueCommands.push(command);
    }
  }
  console.log(queueCommands);
});

clearQueue.addEventListener('click', () => {
  const confirmed = window.confirm('Are you sure you want to clear the queue?');
  if (confirmed) {
    queue = {};
    localStorage.removeItem('queue');
    popRightGrid();
  }
});

clearOriginals.addEventListener('click', () => {
  const confirmed = window.confirm('Are you sure?');
  if (confirmed) {
    originals = {};
    localStorage.removeItem('originals');
    popRightGrid();
  }
});

//mode=file&action=1&title=Delete&source=%252Fmnt%252Fuser%252FJonny%252FPride!!!!!!%2520-%2520Hardlink.gif&target=&hdlink=&zfs=&csrf_token=A25840EDD4D056B6
//mode=read&csrf_token=A25840EDD4D056B6
//mode=start&csrf_token=A25840EDD4D056B6
