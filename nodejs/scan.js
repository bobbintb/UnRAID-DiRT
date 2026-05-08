const fs = require('fs').promises;
const path = require('path');
const { fileProcessingQueue } = require('./redis.js');
const { getFileMetadataRepository } = require('./redis.js');
const { sharedEmitter } = require('./events.js');

/**
 * Retrieves statistics for a single file.
 *
 * @param {string} fullPath The full path to the file.
 * @returns {Promise<object|null>} A Promise that resolves to an object containing file stats
 * (`ino`, `size`, `nlink`, `atime`, `mtime`, `ctime`), or `null` if an error occurs.
 */
async function getFileStats(fullPath) {
  try {
    const stats = await fs.stat(fullPath, { bigint: true });
    return {
      ino: stats.ino.toString(),
      size: Number(stats.size),
      nlink: Number(stats.nlink),
      atime: stats.atime,
      mtime: stats.mtime,
      ctime: stats.ctime,
    };
  } catch (error) {
    console.error(`[DIRT] Error stating file ${fullPath}:`, error.message);
    return null;
  }
}

/**
 * Processes a single file, adding it to the filesBySize Map.
 * It correctly handles hard links by checking the inode number.
 *
 * @param {string} fullPath The full path to the file.
 * @param {Map<number, object[]>} filesBySize The map grouping files by size.
 * @param {string} share The name of the share the file belongs to.
 */
async function processFile(fullPath, filesBySize, share) {
  console.log(`[DIRT] Processing file: ${fullPath}`);
  const stats = await getFileStats(fullPath);
  if (!stats) {
    return; // Error was already logged in getFileStats
  }

  const { ino, size, nlink, atime, mtime, ctime } = stats;
  const fileList = filesBySize.get(size);

  if (!fileList) {
    // This is the first file found of this specific size.
    console.log(`[DIRT] Creating new size group for size ${size} with file: ${fullPath}`);
    const newFileObject = { ino, path: [fullPath], shares: [share], nlink, atime, mtime, ctime };
    filesBySize.set(size, [newFileObject]);
  } else {
    // Other files of this size already exist. Check for a hard link.
    let foundHardLink = false;
    for (const file of fileList) {
      if (file.ino === ino) {
        // Found a hard link. The inode number matches.
        console.log(`[DIRT] Found hard link for inode ${ino}. Adding path: ${fullPath}`);
        file.path.push(fullPath);
        file.shares.push(share); // Also add the new share
        foundHardLink = true;
        break;
      }
    }

    if (!foundHardLink) {
      // It's a different file that just happens to be the same size.
      console.log(`[DIRT] Found new file with existing size ${size} but different inode: ${fullPath}`);
      const newFileObject = { ino, path: [fullPath], shares: [share], nlink, atime, mtime, ctime };
      fileList.push(newFileObject);
    }
  }
}

/**
 * Recursively traverses a directory.
 * @param {string} directory The path of the directory to traverse.
 * @param {Map<number, object[]>} filesBySize The map to populate with file data.
 * @param {string} share The name of the share being traversed.
 */
async function traverse(directory, filesBySize, share) {
  console.log(`[DIRT] Traversing directory: ${directory}`);
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    console.error(`[DIRT] Error reading directory ${directory}:`, error.message);
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await traverse(fullPath, filesBySize, share);
    } else if (entry.isFile()) {
      await processFile(fullPath, filesBySize, share);
    }
  }
}

/**
 * Handles zero-byte files by assigning a static hash and logging them.
 * This function modifies the filesBySize map by removing the zero-byte group.
 *
 * @param {Map<number, object[]>} filesBySize The map grouping files by size.
 */
function handleZeroByteFiles(filesBySize) {
  const zeroByteFiles = filesBySize.get(0);
  if (zeroByteFiles) {
    console.log(`[DIRT] Found ${zeroByteFiles.length} zero-byte file(s). Assigning static hash.`);
    const staticHash = 'af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262';
    for (const file of zeroByteFiles) {
      file.hash = staticHash;
      // We still log them for clarity, though they will be saved.
      for (const filePath of file.path) {
        console.log(`[DIRT] Zero-byte file identified: ${filePath}`);
      }
    }
    // The group is no longer deleted. It will be handled in the main scan function.
    console.log('[DIRT] Finished assigning static hash to zero-byte files.');
  }
}

/**
 * Scans directories recursively, groups files by their exact size, and handles hard links.
 *
 * @param {object[]} sharesToScan An array of objects, each with a `share` name and a `path` to scan.
 * @returns {Promise<Map<number, object[]>>} A Promise that resolves to a Map of files grouped by size.
 */
async function scan(sharesToScan) {
  const filesBySize = new Map();

  for (const { share, path: p } of sharesToScan) {
    console.log(`[DIRT] Starting scan for root path: ${p} (Share: ${share})`);
    try {
      const stats = await fs.stat(p);
      if (stats.isDirectory()) {
        await traverse(p, filesBySize, share);
      } else {
        console.error(`[DIRT] Provided path is not a directory: ${p}`);
      }
    } catch (error) {
      console.error(`[DIRT] Error accessing path ${p}:`, error.message);
    }
  }

  console.log('[DIRT] Scan complete. Processing potential duplicates...');

  handleZeroByteFiles(filesBySize);

  const jobs = [];
  const uniqueFilesToSave = [];
  for (const [size, files] of filesBySize.entries()) {
    if (files.length > 1) {
      // This is a group of potential duplicates, add it to the job queue.
      // Zero-byte files will now fall into this category and be queued for hashing,
      // but since they have a pre-assigned hash, the worker will save them directly.
      jobs.push({
        name: 'file-group',
        data: { files, size },
      });
    } else if (files.length === 1) {
      // This file is unique by size, prepare it to be saved to Redis.
      const file = files[0];
      // The file object already contains most of what we need. We just add the size.
      uniqueFilesToSave.push({ ...file, size });
    }
  }

  // Save all unique files to Redis concurrently.
  if (uniqueFilesToSave.length > 0) {
    try {
      const fileRepository = getFileMetadataRepository();
      console.log(`[DIRT] Saving ${uniqueFilesToSave.length} unique file(s) to Redis...`);
      // Use Promise.all to save files concurrently, which is more performant.
      await Promise.all(uniqueFilesToSave.map(file => {
        // Save the full file object, which now includes the 'ino' field,
        // using the 'ino' as the primary key.
        return fileRepository.save(file.ino, file);
      }));
      console.log('[DIRT] Successfully saved unique files to Redis.');
    } catch (error) {
      console.error('[DIRT] Failed to save unique files to Redis:', error.message);
      // As per requirements, we log the error and continue.
    }
  }

  // Add all potential duplicate groups to the queue.
  if (jobs.length > 0) {
    // Return a promise that resolves when the queue is idle.
    return new Promise(async (resolve) => {
      sharedEmitter.once('queueIdle', () => {
        console.log('[DIRT] All processing jobs completed.');
        resolve(filesBySize);
      });

      // --- PRIORITIZE and RESUME ---
      // Add the scan's jobs to the front of the queue.
      await fileProcessingQueue.addBulk(jobs, { lifo: true });
      console.log(`[DIRT] Added ${jobs.length} groups of potential duplicates to the FRONT of the processing queue.`);

      // Resume the queue to start processing.
      await fileProcessingQueue.resume();
      console.log('[DIRT] File processing queue RESUMED.');

      console.log('[DIRT] Waiting for all processing jobs to complete...');
    });
  } else {
    // If there are no jobs, we still need to resume the queue.
    console.log('[DIRT] No potential duplicates found to process.');
    await fileProcessingQueue.resume();
    console.log('[DIRT] File processing queue RESUMED.');
    return filesBySize;
  }
}

module.exports = { scan, getFileStats };