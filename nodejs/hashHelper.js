// noinspection SpellCheckingInspection

import fs from 'fs';
import blake3 from 'blake3';
import { WebSocketServer, WebSocket } from 'ws';

const CHUNK_SIZE = 1048576; // 1MB chunk size
const wss = new WebSocketServer({ port: 3001 })
await blake3.load();
export let clientSocket = null;

wss.on('connection', (ws) => {
    clientSocket = ws;
});

export function sendToClient(message) {
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(message);
    }
}
function delHash(files,hashers,processedBytes,index) {
    return new Promise(resolve => {
        files.splice(index, 1);
        hashers.splice(index, 1);
        processedBytes.splice(index, 1);
        resolve();
    });
}

async function processFileChunks(fileData, CHUNK_SIZE) {
    return fileData.map(fd => {
        return new Promise((chunkResolve, chunkReject) => {
            const stream = fs.createReadStream(fd.file.path, {
                start: fd.processedBytes,
                end: Math.min(fd.processedBytes + CHUNK_SIZE - 1, fd.file.size - 1)
            });

            stream.on('data', chunk => {
                fd.hasher.update(chunk);
                fd.processedBytes += chunk.length;
            });

            stream.on('end', () => chunkResolve(true));
            stream.on('error', error => {
                console.error(`Error processing file: ${fd.file.path}`, error);
                chunkReject(error);
            });
        });
    });
}

// TODO: this needs to handle files being moved before starting hash. If it moved during it's fine, as it uses the file descriptor.
// Maybe consider using the inode instead of filepath so you can get the filepath when needed or the file descriptor.
export async function hashFilesInIntervals(files) {
    let fileData = files.map(file => ({ file, hasher: blake3.createHash(), processedBytes: 0 }));
    let progressIndex = 0;
    return new Promise(async (resolve, reject) => {
        try {
            while (fileData.length > 1) {
                progressIndex++;
                let fileChunkPromises = await processFileChunks(fileData, CHUNK_SIZE);
                await Promise.all(fileChunkPromises);
                let ogHash = fileData[0].hasher.digest('hex');
                let current_progress = ((fileData[0].processedBytes / fileData[0].file.size) * 100).toFixed(1);
                let message = `<span style="font-family: Consolas, monospace;">Currently processing: ${fileData[0].file.path} (${fileData[0].file.size.toLocaleString()} bytes)<br>`;
                message += `<div class="progress" style="width: 50%;">
                                <div id="dynamic" class="progress-bar progress-bar-success progress-bar-striped active" role="progressbar" 
                                    aria-valuenow="${current_progress}" aria-valuemin="0" aria-valuemax="100" 
                                    style="width: ${current_progress}%">
                                    <span style="text-shadow: 1px 1px 2px black, 1px 1px 2px black;">${current_progress}%</span>
                                </div>
                            </div>`;
                message += `File 0: ${ogHash}<br>`
                for (let index = fileData.length - 1; index >= 1; index--) {
                    const currentHash = fileData[index].hasher.digest('hex');
                    if (currentHash === ogHash) {
                        message += `File ${index}: ${currentHash}: <span style="color: green;">${fileData[index].file.path}</span><br>`
                    } else {
                        message += `File ${index}: ${currentHash}: <span style="color: yellow;">${fileData[index].files.path} (No match, removing from further processing.)<br>`
                        fileData.splice(index, 1);
                    }
                }
                message += `</span><br>`;
                sendToClient(message)
                const progress = ((fileData[0].processedBytes / fileData[0].file.size) * 100).toFixed(2);
                if (fileData[0].processedBytes >= fileData[0].file.size) {
                    fileData.forEach(fd => {
                        fd.file.hash = fd.hasher.digest('hex');
                    });
                    return resolve(fileData.map(fd => fd.file));
                }                
            }
            if (fileData.length === 1) {
                fileData[0].file.hash = fileData[0].hasher.digest('hex');
                return resolve([fileData[0].file]);
            }
        } catch (error) {
            console.error('Error during file hashing:', error);
            reject(error);
        }
        message = `Done.`;
        sendToClient(message)
    });
}