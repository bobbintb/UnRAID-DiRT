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

export async function processFileChunks(files, hashers, processedBytes, size, CHUNK_SIZE) {
    // if (processedBytes[index] >= size) return chunkResolve(true);

    return files.map((file, index) => {
        return new Promise((chunkResolve, chunkReject) => {
            let stream;
            try {
                const chunkEnd = processedBytes[index] + CHUNK_SIZE - 1;
                const end = Math.min(chunkEnd, size - 1);
                stream = fs.createReadStream(file.path[0], {
                    start: processedBytes[index],
                    end: end
                });

                stream.on('data', (chunk) => { 
                    hashers[index].update(chunk);
                    processedBytes[index] += chunk.length;
                });

                stream.on('end', () => {
                    // If the stream reaches the end, resolve the promise
                    if (processedBytes[index] >= size) {
                        chunkResolve(true);
                    }
                });

                stream.on('error', (error) => {
                    console.error(`Error processing file: ${file.path[0]}`, error);
                    chunkReject(error); 
                });
            } catch (err) {
                console.error("ERROR: ", err);
                chunkReject(err); 
            }
        });
    });
}


// TODO: this needs to handle files being moved before starting hash. If it moved during it's fine, as it uses the file descriptor.
// Maybe consider using the inode instead of filepath so you can get the filepath when needed or the file descriptor.
export async function hashFilesInIntervals(files) {
    let hashers = files.map(() => blake3.createHash());                                                                 // Create a hasher and track processed bytes for each file
    let processedBytes = files.map(() => 0);
    let progressIndex = 0;
    return new Promise(async (resolve, reject) => {
        try {
            while (files.length > 1) {                                                                                  // Continue processing as long as there's more than one file
                progressIndex++;
                let fileChunkPromises = await processFileChunks(files, hashers, processedBytes, CHUNK_SIZE);

                await Promise.all(fileChunkPromises);                                                                   // Wait for all chunk reads to complete
                let ogHash = hashers[0].digest('hex');
                let current_progress = ((processedBytes[0] / files[0].size) * 100).toFixed(1);

                
                // let message = `<div class="progress" style="width: 50%;">
                //                 <div id="dynamic" class="progress-bar progress-bar-success progress-bar-striped active" role="progressbar" 
                //                     aria-valuenow="${current_progress}" aria-valuemin="0" aria-valuemax="100" 
                //                     style="width: ${current_progress}%">
                //                     ${current_progress}% Complete
                //                     <span id="current-progress"></span>
                //                 </div>
                //             </div>`;
                            
                let message = `<span style="font-family: Consolas, monospace;">Currently processing: ${files[0].path} (${files[0].size.toLocaleString()} bytes)<br>`;                                             // Compare the intermediate hashes
                // message += `file size: ${files[0].size.toLocaleString()} bytes<br>`;
                // message += `number of files: ${files.length}<br>`;
                // message += `iteration: ${progressIndex}<br>`;
                // message = `<div class="progress" style="width: 500px;">
                //                 <div id="dynamic" class="progress-bar progress-bar-success progress-bar-striped active" role="progressbar" 
                //                     aria-valuenow="${current_progress}" aria-valuemin="0" aria-valuemax="100" 
                //                     style="width: ${current_progress}%">
                //                     ${current_progress}% Complete
                //                 </div>
                //             </div>`;
                message += `<div class="progress" style="width: 50%;">
                                <div id="dynamic" class="progress-bar progress-bar-success progress-bar-striped active" role="progressbar" 
                                    aria-valuenow="${current_progress}" aria-valuemin="0" aria-valuemax="100" 
                                    style="width: ${current_progress}%">
                                    <span style="text-shadow: 1px 1px 2px black, 1px 1px 2px black;">${current_progress}%</span>
                                </div>
                            </div>`;
                message += `File 0: ${ogHash}<br>`
                for (let index = files.length - 1; index >= 1; index--) {
                    const currentHash = hashers[index].digest('hex');
                    if (currentHash === ogHash) {                                      // Keep the file if it matches the first file's hash
                        message += `File ${index}: ${currentHash}: <span style="color: green;">${files[index].path}</span><br>`
                    } else {
                        message += `File ${index}: ${currentHash}: <span style="color: yellow;">${files[index].path} (No match, removing from further processing.)<br>`
                            files.splice(index, 1);
                            hashers.splice(index, 1);
                            processedBytes.splice(index, 1);
                    }
                }

                message += `</span><br>`;

                sendToClient(message)
                const progress = ((processedBytes[0] / files[0].size) * 100).toFixed(2);
                if (processedBytes[0] >= files[0].size) {                                                               // Check if the first file is fully processed
                    files.forEach((file, index) => {
                        file.hash = hashers[index].digest('hex');
                    });
                    return resolve(files);                                                                              // Resolve once all files are hashed
                }
            }

            if (files.length === 1) {                                                                                   // If there's only one file left, resolve early
                files[0].hash = hashers[0].digest('hex');
                return resolve(files);
            }

            
        } catch (error) {
            console.error('Error during file hashing:', error);
            reject(error);                                                                                              // Reject the promise if there's any error
        }
        
        message = `Done.`;
        sendToClient(message)
    });
}