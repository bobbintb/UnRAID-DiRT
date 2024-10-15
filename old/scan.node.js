const plugin = 'bobbintb.system.dedupe';
import path from 'path';
import fs from 'fs';
import MultiMap from 'multimap';
import {nanoid} from 'nanoid';

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

export function getAllFiles(dirPath) {
    const fileMap = new MultiMap();
    const entries = fs.readdirSync(dirPath, {withFileTypes: true});
    for (const entry of entries) {
        if (entry.isFile()) {
            const fullPath = [dirPath, entry.name];
            const stats = fs.statSync(path.join(...fullPath), {bigint: true});
            const currentFileInfo = {
                id: nanoid(),
                path: [fullPath],
                nlink: Number(stats.nlink),
                ino: stats.ino.toString(),
                size: Number(stats.size),
                atimeMs: Number(stats.atimeMs),
                mtimeMs: Number(stats.mtimeMs),
                ctimeMs: Number(stats.ctimeMs),
                birthtimeMs: Number(stats.birthtimeMs)
            };
            const sizeGroup = fileMap.get(currentFileInfo.size) || [];
            if (sizeGroup.some(file => file.ino === currentFileInfo.ino)) {
                sizeGroup.find(file => file.ino === currentFileInfo.ino).path.push(fullPath);
            } else {
                fileMap.set(Number(stats.size), currentFileInfo);
            }
            console.log('Adding file: ' + path.join(...fullPath));

        }
    }
    console.log('Done.');
    return fileMap._;
}
