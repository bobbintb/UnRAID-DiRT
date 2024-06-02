const plugin = 'bobbintb.system.dedupe';
import path from 'path';
import * as util from 'util';
import fsp from 'fs/promises';
import fs from 'fs';
import MultiMap from 'multimap';


export function getSettings() {
  const filePath = plugin + '.json';
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    console.log('Settings loaded:');
    return JSON.parse(data);
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
  dirPath = dirPath || '/tmp'; // Assuming a default directory path
  const fileMap = new MultiMap();
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(entry.path, entry.name);
    if (entry.isFile()) {
      const stats = fs.statSync(fullPath);
      const currentFileInfo = {
        path: [fullPath],
        nlink: stats.nlink,
        ino: stats.ino,
        size: stats.size,
        atimeMs: stats.atimeMs,
        mtimeMs: stats.mtimeMs,
        ctimeMs: stats.ctimeMs,
        birthtimeMs: stats.birthtimeMs
      };

      fileMap.set(stats.size, currentFileInfo);
    }
  }
  //console.log('Map of files grouped by size with detailed stats:');
  //console.log(fileMap);
  console.log(util.inspect(fileMap._, false, null, true /* enable colors */));
  return fileMap._;
}

// /module.exports = { getSettings, getAllFiles };