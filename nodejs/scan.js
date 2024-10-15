import fs from "fs";
import path from "path";
import {enqueueCreateFile} from "./queueListener.js";

const plugin = 'bobbintb.system.dirt';

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
