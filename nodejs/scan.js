import fs from "fs";
import path from "path";
import util from "util";
import {enqueueCreateFile} from "./queueListener.js";
// import {processFileChunks} from "./hashHelper.js";
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
        // console.debug(`Current directory: ${currentPath}`);
        try {
            const entries = fs.readdirSync(currentPath, {withFileTypes: true});
            for (const entry of entries) {
                // console.debug(`     Current entry: ${entry.name}`);
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
                    // console.debug('Current fileMap:', util.inspect(fileMap, {depth: null, maxArrayLength: null}));
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

export async function processFileChunks(files, hashers, processedBytes, size, CHUNK_SIZE) {
    const promises = files.map((file, index) => {
        const start = processedBytes[index];
        const end = Math.min(start + CHUNK_SIZE, size);
        const buffer = Buffer.alloc(end - start);

        return new Promise((resolve, reject) => {
            const fd = fs.openSync(file.path[0], 'r');
            fs.read(fd, buffer, 0, buffer.length, start, (err) => {
                if (err) return reject(err);
                hashers[index].update(buffer);
                processedBytes[index] += buffer.length;
                fs.closeSync(fd);
                resolve();
            });
        });
    });

    await Promise.all(promises);
}

export async function hashFilesInIntervals(size, files) {
    if (!Array.isArray(files)) {
        throw new TypeError("Expected 'files' to be an array, but received: " + typeof files);
    }
    let hashers = files.map(() => blake3.createHash());
    let processedBytes = files.map(() => 0);

    while (files.length > 1) {
        await processFileChunks(files, hashers, processedBytes, size, CHUNK_SIZE);

        const intermediateHashes = files.map((_, index) => hashers[index].digest('hex'));
        // console.log('Intermediate hashes:', intermediateHashes);

        // Count occurrences of each hash
        const hashCounts = {};
        for (const hash of intermediateHashes) {
            hashCounts[hash] = (hashCounts[hash] || 0) + 1;
        }
        // console.log('Hash counts:', hashCounts);

        const beforeLength = files.length;
        
        // Filter out files whose hash appears exactly once
        const result = files.reduce((acc, file, index) => {
            if (hashCounts[intermediateHashes[index]] !== 1) {
                acc.files.push(file);
                acc.hashers.push(hashers[index]);
                acc.processedBytes.push(processedBytes[index]);
            }
            return acc;
        }, { files: [], hashers: [], processedBytes: [] });

        files = result.files;
        hashers = result.hashers;
        processedBytes = result.processedBytes;

        // console.log(`Filtered files from ${beforeLength} to ${files.length}`);

        if (files.every((_file, index) => processedBytes[index] >= size)) {
            // console.log('All files processed');
            break;
        }

        // console.log('Processed bytes:', processedBytes);
    }

    files.forEach((file, index) => {
        file.hash = hashers[index].digest('hex');
    });

    console.log('Final result:', JSON.stringify(files, null, 2));
    return files;
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