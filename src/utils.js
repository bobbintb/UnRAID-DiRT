const plugin = 'bobbintb.system.dedupe';
const path = require('path');
const util = require('util');
const fsp = require('fs/promises');
const fs = require('fs');
const MultiMap = require('multimap');

function getSettings() {
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

function getAllFiles(dirPath) {
  dirPath = dirPath || '/tmp'; // Assuming a default directory path
  const fileMap = new MultiMap();
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(entry.path, entry.name);
    if (entry.isFile()) {
      const stats = fs.statSync(fullPath);
      const currentFileInfo = { path: new Set([fullPath]), ...stats };
      fileMap.set(stats.size, currentFileInfo);
    }
  }
  //console.log('Map of files grouped by size with detailed stats:');
  //console.log(fileMap);
  //console.log(util.inspect(fileMap, false, null, true /* enable colors */));
  return fileMap._;
}

module.exports = { getSettings, getAllFiles };