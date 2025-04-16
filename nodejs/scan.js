import fs from "fs";
import path from "path";
import {enqueueCreateFile} from "./queueListener.js";
import {processFileChunks} from "./hashHelper.js";
// import MultiMap from 'collections/multi-map';   
import blake3 from 'blake3';
import { WebSocketServer, WebSocket } from 'ws';

const CHUNK_SIZE = 1048576; // 1MB chunk size
const wss = new WebSocketServer({ port: 3005 })
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
export function getSettings() {
    const filePath = plugin + '.json';
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        console.log('Settings loaded.');
        //return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`Settings file not found: ${filePath}`);
            throw error;
        } else {
            console.error(`Error reading settings file: ${error}`);
            throw error;
        }
    }
}

export function getFileStats(file) {
    const stats = fs.statSync(file, {bigint: true});
    const ino = stats.ino.toString();
    const fileInfo = {
        ino: ino,
        path: [file],
        nlink: Number(stats.nlink),
        atime: stats.atime,
        mtime: stats.mtime,
        ctime: stats.ctime
    };
    return [fileInfo, Number(stats.size)];
}


export function getAllFiles(dirPaths) {
    const fileMap = new Map();

    function traverseDir(currentPath) {
        try {
            const entries = fs.readdirSync(currentPath, {withFileTypes: true});
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isFile()) {
                    const [file, size] = getFileStats(fullPath);
                    const sizeGroup = fileMap.get(size) || [];
                    const existing = sizeGroup.find(f => f.ino === file.ino);
                    if (existing) {
                        existing.path.push(...file.path);
                    } else {
                        sizeGroup.push(file);
                    }
                    fileMap.set(size, sizeGroup);
                } else if (entry.isDirectory()) {
                    traverseDir(fullPath);
                }
            }
        } catch (err) {
            console.error(`Error processing directory ${currentPath}:`, err);
        }
    }

    for (const dirPath of dirPaths) {
        try {
            traverseDir(dirPath);
        } catch (err) {
            console.error(`Error processing root directory ${dirPath}:`, err);
        }
    }

    return fileMap;
}

export async function hashFilesInIntervals(size, files) {
    // console.debug("================================================")
    // console.debug(`SIZE: ${size}`);
    // console.debug(`FILES: ${JSON.stringify(files, null, 2)}`);
    let hashers = files.map(() => blake3.createHash());                                                                 // Create a hasher and track processed bytes for each file
    let processedBytes = files.map(() => 0);
    let progressIndex = 0;
    return new Promise(async (resolve, reject) => {
        try {
            while (files.length > 1) {                                                                                  // Continue processing as long as there's more than one file
                progressIndex++;
                let fileChunkPromises = await processFileChunks(files, hashers, processedBytes, size, CHUNK_SIZE);

                await Promise.all(fileChunkPromises);                                                                   // Wait for all chunk reads to complete
                console.debug(`PRE-FILTER: ${JSON.stringify(files, null, 2)}`);
                // Filter out unique hashes
                const fileHashes = files.map((_, index) => hashers[index].digest('hex'));
                console.debug("fileHashes")
                console.debug(fileHashes)
                const resultFiles = files.filter((_, i) =>
                    fileHashes.indexOf(fileHashes[i]) !== fileHashes.lastIndexOf(fileHashes[i])
                  );
                files = resultFiles; // Keep only files with non-unique hashes

                let current_progress = ((processedBytes[0] / size) * 100).toFixed(1);
                console.debug("POST-FILTER")
                console.debug(JSON.stringify(files, null, 2))
                if (files.length === 0) {
                    return resolve(files);
                }



            }

        } catch (error) {
            console.error('Error during file hashing:', error);
            reject(error);                                                                                              // Reject the promise if there's any error
        }
        
        // message = `Done.`;
        // sendToClient(message)
    });
}

// export function getAllFiles(dirPath) {
//     function traverseDir(currentPath) {
//         try {
//             const entries = fs.readdirSync(currentPath, {withFileTypes: true});
//             for (const entry of entries) {
//                 const fullPath = path.join(currentPath, entry.name);
//                 if (entry.isFile()) {
//                     const file = getFileStats(fullPath);
//                     enqueueCreateFile(fullPath);
//                 } else if (entry.isDirectory()) {
//                     traverseDir(fullPath);
//                 }
//             }
//         } catch (err) {
//             console.error(`Error processing directory ${currentPath}:`, err);
//         }
//     }

//     try {
//         traverseDir(dirPath);
//     } catch (err) {
//         console.error(`Error processing root directory ${dirPath}:`, err);
//     }
// }

// export function getAllFiles(dirPath) {
//     const fileMap = new MultiMap();
//     const entries = fs.readdirSync(dirPath, {withFileTypes: true});
//     for (const entry of entries) {
//       if (entry.isFile()) {
//         const fullPath = [dirPath, entry.name];
//         const stats = fs.statSync(path.join(...fullPath), {bigint: true});
//         const currentFileInfo = {
//           id: nanoid(),
//           path: [fullPath],
//           nlink: Number(stats.nlink),
//           ino: stats.ino.toString(),
//           size: Number(stats.size),
//           atimeMs: Number(stats.atimeMs),
//           mtimeMs: Number(stats.mtimeMs),
//           ctimeMs: Number(stats.ctimeMs),
//           birthtimeMs: Number(stats.birthtimeMs)
//         };
//         const sizeGroup = fileMap.get(currentFileInfo.size) || [];
//         if (sizeGroup.some(file => file.ino === currentFileInfo.ino)) {
//           sizeGroup.find(file => file.ino === currentFileInfo.ino).path.push(fullPath);
//         } else {
//           fileMap.set(Number(stats.size), currentFileInfo);
//         }
//         console.log('Adding file: ' + path.join(...fullPath));
//       }
//     }
//     return fileMap._;
//   }