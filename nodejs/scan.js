import fs from "fs";
import path from "path";
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
        atime: new Date(stats.atimeMs),
        mtime: new Date(stats.mtimeMs),
        ctime: new Date(stats.ctimeMs)
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

export async function hashFilesInIntervals(size, inputFiles) {
    let files = inputFiles;
    if (!Array.isArray(files)) {
        throw new TypeError("Expected 'files' to be an array, but received: " + typeof files);
    }
    let hashers = files.map(() => blake3.createHash());
    let processedBytes = files.map(() => 0);
    while (files.length > 1) {
        await processFileChunks(files, hashers, processedBytes, size, CHUNK_SIZE);
        const intermediateHashes = files.map((_, index) => hashers[index].digest('hex'));
        // console.debug('Intermediate hashes:', intermediateHashes);
        const hashCounts = {};
        for (const hash of intermediateHashes) {
            hashCounts[hash] = (hashCounts[hash] || 0) + 1;
        }
        const result = files.reduce((acc, file, index) => {
            if (hashCounts[intermediateHashes[index]] !== 1) {
                acc.files.push(file);
                acc.hashers.push(hashers[index]);
                acc.processedBytes.push(processedBytes[index]);
            }
            return acc;
        }, { files: [], hashers: [], processedBytes: [] });

        if (result.files.every((_file, index) => processedBytes[index] >= size)) {
            // Only add hashes to the files that made it through filtering
            result.files.forEach((file, index) => {
                file.hash = result.hashers[index].digest('hex');
            });
            break;
        }
        files = result.files;
        hashers = result.hashers;
        processedBytes = result.processedBytes;
    }
    
    // Remove the final hash assignment that was affecting all files
    // console.log('Final result:', JSON.stringify(files, null, 2));
    return inputFiles;
}
