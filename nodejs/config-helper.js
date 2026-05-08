const fs = require('fs').promises;
const path = require('path');

async function getPluginConfig() {
  const plugin = 'bobbintb.system.dirt';
  const baseDir = process.env.DIRT_CONFIG_DIR || '/boot/config';
  const cfgPath = `${baseDir}/plugins/${plugin}/${plugin}.cfg`;
  const config = {
    datetime_format: 'f', // Default
  };

  try {
    const data = await fs.readFile(cfgPath, 'utf8');
    const lines = data.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=]+)="?(.*?)"?$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        config[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[DIRT] Error reading config file ${cfgPath}:`, error.message);
    }
  }

  return config;
}

module.exports = { getPluginConfig };
