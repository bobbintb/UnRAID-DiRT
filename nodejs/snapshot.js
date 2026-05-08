const fs = require('fs').promises;
const path = require('path');
const { getRedisClient } = require('./redis');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function saveDbSnapshot() {
  const redisClient = getRedisClient();

  try {
    const initialLastSave = await redisClient.lastSave();
    console.log(`[Snapshot] Initial LASTSAVE: ${initialLastSave}`);

    await redisClient.bgSave();
    console.log('[Snapshot] BGSAVE command issued.');

    let currentLastSave = initialLastSave;
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds timeout

    // Wait for the lastSave timestamp to change
    while (currentLastSave <= initialLastSave) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for BGSAVE to complete.');
      }
      await sleep(1000); // Poll every second
      currentLastSave = await redisClient.lastSave();
      console.log(`[Snapshot] Polling LASTSAVE: ${currentLastSave}`);
    }

    console.log(`[Snapshot] BGSAVE completed. New LASTSAVE: ${currentLastSave}`);

    // CONFIG GET returns an object like { dir: '/data' } in node-redis v4
    const redisDirConfig = await redisClient.configGet('dir');
    const dbFileNameConfig = await redisClient.configGet('dbfilename');
    const redisDir = redisDirConfig.dir;
    const dbFileName = dbFileNameConfig.dbfilename;

    if (!redisDir || !dbFileName) {
        throw new Error('Could not retrieve Redis data directory or dbfilename.');
    }

    const sourcePath = path.join(redisDir, dbFileName);
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const destinationFileName = `snapshot-${timestamp}.rdb`;
    const destinationDir = '/usr/local/emhttp/plugins/bobbintb.system.dirt/';

    // Ensure the destination directory exists
    await fs.mkdir(destinationDir, { recursive: true });

    const destinationPath = path.join(destinationDir, destinationFileName);

    console.log(`[Snapshot] Copying snapshot from '${sourcePath}' to '${destinationPath}'...`);
    await fs.copyFile(sourcePath, destinationPath);
    console.log('[Snapshot] Snapshot copy complete.');

    return { success: true, message: `Snapshot saved to ${destinationPath}` };
  } catch (error) {
    console.error('[Snapshot] Error during snapshot process:', error);
    return { success: false, message: `Snapshot failed: ${error.message}` };
  }
}

module.exports = { saveDbSnapshot };
