// noinspection SpellCheckingInspection

import fs from 'fs';
import blake3 from 'blake3';
// import {clientSocket, sendToClient} from "./dirt.js";
import { WebSocketServer, WebSocket } from 'ws';
import file from "express/lib/view.js";


const CHUNK_SIZE = 10485760; // 10MB chunk size
await blake3.load();


const wss = new WebSocketServer({ port: 3001 });

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
        // Replace with the task you want to perform on the file
        delete file.hash;
        files.splice(index, 1);
        hashers.splice(index, 1);
        processedBytes.splice(index, 1);

        // After task is done, resolve the promise
        resolve();
    });
}

// TODO: this needs to handle files being moved before starting hash. If it moved during it's fine, as it uses the file descriptor.
// Maybe consider using the inode instead of filepath so you can get the filepath when needed or the file descriptor.
// TODO: it seems some bluray files that aren't even the same size have the same hash. my guess is partial hash is being saved.
export async function hashFilesInIntervals(files) {
    // Create a hasher and track processed bytes for each file
    let hashers = files.map(() => blake3.createHash());
    let processedBytes = files.map(() => 0);
    // sendToClient('Starting hash', files[0])

    return new Promise(async (resolve, reject) => {
        try {
            // Continue processing as long as there's more than one file
            while (files.length > 1) {
                let progressIndex
                const fileChunkPromises = files.map((file, index) => {
                    progressIndex = index
                    return new Promise((chunkResolve, chunkReject) => {
                        if (processedBytes[index] >= file.size) {
                            // File fully processed
                            chunkResolve(null);
                        } else {
                            // Read the next 1MB chunk from the file
                            const stream = fs.createReadStream(file.path[0], {
                                start: processedBytes[index],
                                end: Math.min(processedBytes[index] + CHUNK_SIZE - 1, file.size - 1)
                            });

                            const chunks = [];
                            stream.on('data', (chunk) => {
                                // Directly update the hash with the current chunk
                                hashers[index].update(chunk);
                                processedBytes[index] += chunk.length;  // Update the progress
                            });

                            stream.on('end', () => {
                                chunkResolve(true);  // Resolve the promise after the stream ends
                            });

                            stream.on('error', (error) => {
                                console.error(`Error processing file: ${file.path[0]}`, error);
                                chunkReject(error);  // Reject if there's a stream error
                            });
                        }
                    });
                });

                // Wait for all chunk reads to complete
                await Promise.all(fileChunkPromises);

                // Compare the intermediate hashes
                let message = `Currently processing: ${files[0].path}<br>`;
                message += `file size: ${files[0].size}<br>`;
                message += `file size: ${processedBytes[progressIndex]}<br>`;
                message += `Progress: ${Math.round((processedBytes[progressIndex]/files[0].size)*100)}%<br>`;

                for (let index = files.length - 1; index >= 0; index--) {
                    const currentHash = hashers[index].digest('hex');
                    if (index === 0 || currentHash === hashers[0].digest('hex')) {
                        // Keep the file if it matches the first file's hash
                        message += `File ${index}: <span style="color: green;">${files[index].path}</span><br>`
                        // sendToClient(`File ${index}: <span style="color: green;">${currentHash}</span>`);
                    } else {
                        message += `File ${index}: <span style="color: yellow;">${files[index].path}</span> (No match, removing from further processing.)<br>`
                        // message += `File Details: <pre>${JSON.stringify(files[index], null, 2)}</pre><br>`;
                        // sendToClient(`File ${index}: <span style="color: yellow;">${files[index].hash}</span> (preremove.)`);
                        if (files[index].hash) {
                            await delHash(files[index],files,hashers,processedBytes,index)
                        }
                                                // sendToClient(`File ${index}: <span style="color: yellow;">${files[index].hash}</span> (postremove.)`);
                        // files.splice(index, 1);
                        // hashers.splice(index, 1);
                        // processedBytes.splice(index, 1);
                    }
                }

                sendToClient(message)

                // Log progress
                const progress = ((processedBytes[0] / files[0].size) * 100).toFixed(2);
                // console.log(`${progress}% (${processedBytes[0]} bytes)`);

                // Check if the first file is fully processed
                if (processedBytes[0] >= files[0].size) {
                    files.forEach((file, index) => {
                        // if (file.hash) {
                            file.hash = hashers[index].digest('hex');
                        // }
                    });
                    return resolve(files);  // Resolve once all files are hashed
                }
            }

            // If there's only one file left, resolve early
            if (files.length === 1) {
                // console.log('Only one file left, stopping early.');
                files[0].hash = hashers[0].digest('hex');
                return resolve(files);
            }

        } catch (error) {
            console.error('Error during file hashing:', error);
            reject(error);  // Reject the promise if there's any error
        }
    });
}

if (!process.argv.includes('--debug')) {
    console.debug = function () {
    }
}
