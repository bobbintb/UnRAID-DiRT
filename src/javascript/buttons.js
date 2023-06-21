const processQueue = document.createElement('button');
processQueue.textContent = 'Process Queue';
processQueue.style.marginLeft = '10px';
processQueue.style.padding = '10px';
processQueue.style.width = 'fit-content';

const linkButton = document.createElement('button');
linkButton.textContent = 'Link';
linkButton.style.padding = '10px';
linkButton.style.width = 'fit-content';

const clearQueue = document.createElement('button');
clearQueue.textContent = 'Clear Queue';
clearQueue.style.padding = '10px';
clearQueue.style.height = 'fit-content';

const clearOriginals = document.createElement('button');
clearOriginals.textContent = 'Clear Originals';
clearOriginals.style.padding = '10px';
clearOriginals.style.height = 'fit-content';

processQueue.addEventListener('click', () => {
  const fileNames = [];
  Object.keys(queue).forEach((key) => {
    if (queue[key].action === 'delete') {
      fileNames.push(key);
    }
  });
  const encodedString = fileNames.map(fileName => encodeURIComponent(fileName)).join("\r");
  console.log(encodedString);
});



linkButton.addEventListener('click', () => {
  fetch('/plugins/bobbintb.system.dedupe/include/fileOperations.php')
    .then(response => response.json())
    .then(token => {
      fetch('/plugins/dynamix.file.manager/include/Control.php', {
        method: 'POST', // Specify the HTTP method as POST
        body: `mode=file&task=delete&action=1&title=Delete&source=%252Fmnt%252Fuser%252FJonny%252FPride!!!!!!%2520-%2520Copy%2520(2).gif&target=&hdlink=&zfs=&csrf_token=${token}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded' // Set the appropriate content type
        }
      })
    })
    .catch(error => {
      console.error(error);
    });


  //needs to be get token to work.
  /*     fetch('/plugins/dynamix.file.manager/include/Control.php', {
        method: 'POST', // Specify the HTTP method as POST
        body: 'mode=file&task=delete&action=1&title=Delete&source=%252Fmnt%252Fuser%252FJonny%252FPride!!!!!!%2520-%2520Copy%2520(2).gif&target=&hdlink=&zfs=&csrf_token=CF0A388D1DA35770', // Set the request body with the data
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded' // Set the appropriate content type
        }
      }) */
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
