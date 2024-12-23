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

// Recursively scans a directory and adds each file to the queue
// TODO investigate big delay when traversing large directories.
export function getAllFiles(dirPath, allFiles) {
    // let allFiles = [];
    function traverseDir(currentPath) {
        try {
            const entries = fs.readdirSync(currentPath, {withFileTypes: true});
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isFile()) {
                    // enqueueCreateFile(fullPath);
                    const stats = fs.statSync(fullPath, {bigint: true});
                    const size = Number(stats.size)
                    const fileInfo = {
                        path: fullPath,
                        nlink: Number(stats.nlink),
                        size: size,
                        atime: stats.atime,
                        mtime: stats.mtime,
                        ctime: stats.ctime
                    };
                    if (!allFiles.has(size)) {
                        allFiles.set(size, [fileInfo]);
                    } else {
                        allFiles.get(size).push(fileInfo);
                    }
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
    // console.log(allFiles)
    return allFiles;
}
