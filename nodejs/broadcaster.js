// nodejs/broadcaster.js
const WebSocket = require('ws');

let wss;

function init(webSocketServer) {
  wss = webSocketServer;
  console.log('[BROADCASTER] Initialized.');
}

function broadcast(message) {
  if (!wss) {
    console.error('[BROADCASTER] Broadcast called before initialization.');
    return;
  }

  console.log('[BROADCASTER] Broadcasting message:', message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

module.exports = {
  init,
  broadcast,
};
