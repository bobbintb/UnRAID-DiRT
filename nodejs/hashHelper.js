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
// TODO: this needs to handle files being moved before starting hash. If it moved during it's fine, as it uses the file descriptor.
// Maybe consider using the inode instead of filepath so you can get the filepath when needed or the file descriptor.
export async function hashFilesInIntervals(files, initial=false) {
    console.log(files)
    let hashers = files.map(() => blake3.create());                                                                 // Create a hasher and track processed bytes for each file
    let processedBytes = files.map(() => 0);
    return new Promise(async (resolve, reject) => {
        try {
            while (files.length > 1) {                                                                                  // Continue processing as long as there's more than one file
                let progressIndex
                const fileChunkPromises = await files.map((file, index) => {
                    progressIndex = index
                    return new Promise((chunkResolve, chunkReject) => {
                        if (processedBytes[index] >= file.size) {
                            chunkResolve(null);                                                                   // File fully processed
                        } else {
                            const stream = fs.createReadStream(file.path[0], {                                   // Read the next 1MB chunk from the file
                                start: processedBytes[index],
                                end: Math.min(processedBytes[index] + CHUNK_SIZE - 1, file.size - 1)
                            });

                            stream.on('data', (chunk) => {                                                 // Directly update the hash with the current chunk
                                hashers[index].update(chunk);
                                files[index].currentHash = Buffer.from(hashers[index].state.buffer).toString('hex');
                                processedBytes[index] += chunk.length;                                                  // Update the progress
                            });

                            stream.on('end', () => {
                                chunkResolve(true);                                                               // Resolve the promise after the stream ends
                                files[index].hash = hashers[index].digest();
                            });

                            stream.on('error', (error) => {
                                console.error(`Error processing file: ${file.path[0]}`, error);
                                chunkReject(error);                                                                     // Reject if there's a stream error
                            });
                        }
                    });
                });

                await Promise.all(fileChunkPromises);                                                                   // Wait for all chunk reads to complete
                let message = `Currently processing: ${files[0].path}<br>`;                                             // Compare the intermediate hashes
                message += `file size: ${files[0].size}<br>`;
                message += `file size: ${processedBytes[progressIndex]}<br>`;
                message += `Progress: ${Math.round((processedBytes[progressIndex]/files[0].size)*100)}%<br>`;

                for (let index = files.length - 1; index >= 0; index--) {
                    if (initial) {

                    } else {
                        if (index === 0 || files[index].currentHash === hashers[0].digest('hex')) {                                  // Keep the file if it matches the first file's hash
                            message += `File ${index}: <span style="color: green;">${files[index].path}</span><br>`
                        } else {
                            message += `File ${index}: <span style="color: yellow;">${files[index].path}</span> (No match, removing from further processing.)<br>`
                            await delHash(files[index],files,hashers,processedBytes,index)
                        }
                    }
                }


                sendToClient(message)
                const progress = ((processedBytes[0] / files[0].size) * 100).toFixed(2);
                if (processedBytes[0] >= files[0].size) {                                                               // Check if the first file is fully processed
                    files.forEach((file, index) => {
                        file.hash = hashers[index].digest('hex');
                    });
                    return resolve(files);                                                                              // Resolve once all files are hashed
                }
            }

            return resolve(files);                                                                                      // If there's only one file left, resolve early

        } catch (error) {
            console.error('Error during file hashing:', error);
            reject(error);                                                                                              // Reject the promise if there's any error
        }
    });
}