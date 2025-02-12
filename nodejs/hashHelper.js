// noinspection SpellCheckingInspection

import fs from 'fs';
// import blake3 from 'blake3';
import { blake3 } from '@noble/hashes/blake3';
import { WebSocketServer, WebSocket } from 'ws';

const CHUNK_SIZE = 1048576; // 1MB chunk size
const wss = new WebSocketServer({ port: 3001 })
// await blake3.load();
export let clientSocket = null;

wss.on('connection', (ws) => {
    clientSocket = ws;
});

export function sendToClient(message) {
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(message);
    }
}
function delHash(file,files,hashers,processedBytes,index) {
    return new Promise(resolve => {
        if (files.length === 1) {                                                                                   // If there's only one file left, resolve early
            return resolve(files);
        }
        if (files[index].hash) {
            delete file.hash;
        }
        files.splice(index, 1);
        hashers.splice(index, 1);
        processedBytes.splice(index, 1);
        resolve();
    });
}
function stateToHex(state) {
    return Array.from(state).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function processFileChunk(file, hasher, chunkIndex) {
    return new Promise((resolve, reject) => {
      let stream = fs.createReadStream(file.path, { highWaterMark: CHUNK_SIZE, start: chunkIndex * CHUNK_SIZE });
  
      // Read file in chunks
      stream.on('data', (chunk) => {
        hasher.update(chunk);  // Update the hasher with the current chunk
        const intermediateHash = file.currentHash = Buffer.from(hasher.state.buffer).toString('hex');
        console.log(`Intermediate hash for ${file.path} chunk ${chunkIndex}:`, intermediateHash);  // Log intermediate hash
      });
  
      // When the file has been fully processed, resolve the promise
      stream.on('end', () => {
        console.log(`Finished processing chunk ${chunkIndex} of ${file.path}`);
        resolve();  // Resolve when chunk processing is complete
      });
  
      // If there is an error during the file processing, reject the promise
      stream.on('error', (err) => {
        console.error('Error reading file:', err);
        reject(err);
      });
    });
  }
  
  export async function hashFilesInIntervals(files) {
    let hashers = files.map(file => blake3.create());
    let chunkIndex = 0;
    
    let fileSize = files[0].size;
    let maxChunks = Math.ceil(fileSize / CHUNK_SIZE);
  
    while (chunkIndex < maxChunks) {
      const promises = files.map((file, index) => {
        return processFileChunk(file, hashers[index], chunkIndex);
      });
  
      await Promise.all(promises);
  
      let totalProcessedBytes = Math.min((chunkIndex + 1) * CHUNK_SIZE, fileSize);
  
      let message = `Currently processing: ${files[0].path}<br>`;
      message += `File size: ${fileSize}<br>`;
      message += `Total processed bytes: ${totalProcessedBytes}<br>`;
      message += `Progress: ${Math.round((totalProcessedBytes / fileSize) * 100)}%<br>`;
      
      sendToClient(message);
  
      chunkIndex++;
    }
  
    console.log('All files have been processed.');
    return files; 
  }
  