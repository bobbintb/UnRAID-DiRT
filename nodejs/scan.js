import fs from "fs";
import path from "path";
import {enqueueCreateFile} from "./queueListener.js";



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
    const size = Number(stats.size)
    const key = stats.ino.toString()
    const fileInfo = {
        path: [file],
        nlink: Number(stats.nlink),
        size: size,
        atime: stats.atime,
        mtime: stats.mtime,
        ctime: stats.ctime
    };
    return fileInfo, key;
}

// Recursively scans a directory and adds each file to the queue
// TODO investigate big delay when traversing large directories.
export function getAllFiles(dirPath) {
    function traverseDir(currentPath) {
        try {
            const entries = fs.readdirSync(currentPath, {withFileTypes: true});
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isFile()) {
                    enqueueCreateFile(fullPath);
                } else if (entry.isDirectory()) {
                    traverseDir(fullPath);
                }
            }
        } catch (err) {
            console.error(`Error processing directory ${currentPath}:`, err);
        }
    }

    try {
        traverseDir(dirPath);
    } catch (err) {
        console.error(`Error processing root directory ${dirPath}:`, err);
    }
}
