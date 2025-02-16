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
    const key = stats.ino.toString()
    const fileInfo = {
        path: [file],
        nlink: Number(stats.nlink),
        size: Number(stats.size),
        atime: stats.atime,
        mtime: stats.mtime,
        ctime: stats.ctime
    };
}


export function getAllFiles(dirPath) {
    function traverseDir(currentPath) {
        try {
            const entries = fs.readdirSync(currentPath, {withFileTypes: true});
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                if (entry.isFile()) {
                    const file = getFileStats(fullPath):
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