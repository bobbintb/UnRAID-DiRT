const fs = require('fs');
const { Worker } = require('worker_threads');
const { getFileMetadataRepository } = require('./redis.js');

const CHUNK_SIZE = 1024 * 1024; // 1MB

/**
 * A helper function to save file metadata to Redis with a retry mechanism.
 * @param {object[]} filesToSave An array of file objects to save.
 */
async function saveWithRetries(filesToSave) {
  if (filesToSave.length === 0) return;

  const fileRepository = getFileMetadataRepository();
  const maxRetries = 3;
  const delay = 5000; // 5 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[DIRT] Attempt ${attempt}: Saving ${filesToSave.length} processed file(s) to Redis...`);
      // Use Promise.all to save files concurrently, which is more performant.
      await Promise.all(filesToSave.map(file => {
        // Save the full file object using its 'ino' as the primary key.
        // The 'ino' is now also a field within the object itself, as required by the schema.
        return fileRepository.save(file.ino, file);
      }));
      console.log('[DIRT] Successfully saved processed files to Redis.');
      return; // Success, exit the function
    } catch (error) {
      console.error(`[DIRT] Attempt ${attempt} failed to save processed files to Redis:`, error.message);
      if (attempt < maxRetries) {
        console.log(`[DIRT] Retrying in ${delay / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        console.error('[DIRT] All retry attempts failed. Could not save processed files to Redis.');
        // As per requirements, we log the error and allow the job to complete.
      }
    }
  }
}

/**
 * Initializes a Map with basic file information.
 * @param {object[]} initialGroup - The initial group of files.
 * @returns {Map<string, object>} A map from inode to file info.
 */
function initializeFileInfo(initialGroup) {
    const fileInfoMap = new Map();
    initialGroup.forEach(file => {
        // The hasher is no longer needed on the main thread; it lives in the worker.
        fileInfoMap.set(file.ino, { fileObject: file });
    });
    return fileInfoMap;
}

/**
 * Opens file handles for all files in the group concurrently.
 * @param {object[]} initialGroup - The group of files to open.
 * @returns {Promise<Map<string, fs.promises.FileHandle>>} A map from inode to file handle.
 */
async function openFileHandles(initialGroup) {
    const fileHandles = new Map();
    const openPromises = initialGroup.map(async (file) => {
        const handle = await fs.promises.open(file.path[0], 'r');
        return { ino: file.ino, handle };
    });

    const results = await Promise.all(openPromises);
    for (const result of results) {
        fileHandles.set(result.ino, result.handle);
    }
    return fileHandles;
}

/**
 * Processes one chunk of data for a set of file groups in parallel, refining the groups based on intermediate hashes.
 * @param {Array<Array<object>>} activeGroups - The current groups of potential duplicates.
 * @param {Map<string, fs.promises.FileHandle>} fileHandles - A map of file handles.
 * @param {Worker[]} workerPool - The pool of worker threads.
 * @param {number} currentChunkSize - The size of the chunk to read.
 * @param {number} bytesRead - The offset where to start reading.
 * @returns {Promise<Array<Array<object>>>} The refined groups for the next iteration.
 */
async function processChunk(activeGroups, fileHandles, workerPool, currentChunkSize, bytesRead) {
    const nextIterationGroups = [];
    let workerIndex = 0;

    for (const currentGroup of activeGroups) {
        if (currentGroup.length <= 1) {
            // If a group has only one member, it's not a duplicate, but we might need to
            // carry it over if it's the only group left. However, the main loop logic handles this.
            continue;
        }

        // 1. Concurrently read the next chunk for all files in the current group.
        const readPromises = currentGroup.map(async (fileInfo) => {
            const handle = fileHandles.get(fileInfo.fileObject.ino);
            // Allocate a unique buffer for each concurrent read operation to avoid race conditions.
            const buffer = Buffer.alloc(currentChunkSize);
            const { bytesRead: read } = await handle.read(buffer, 0, currentChunkSize, bytesRead);

            if (read === 0) return null;

            // Return the file's inode and the actual data read.
            return { ino: fileInfo.fileObject.ino, buffer: buffer.slice(0, read) };
        });

        const readResults = (await Promise.all(readPromises)).filter(r => r !== null);

        // 2. Distribute the hashing work to the worker pool.
        const hashPromises = readResults.map(({ ino, buffer }) => {
            return new Promise((resolve, reject) => {
                const worker = workerPool[workerIndex];
                workerIndex = (workerIndex + 1) % workerPool.length;

                const messageHandler = (response) => {
                    // Ensure we are handling the response for the correct file (ino).
                    if (response.ino === ino) {
                        worker.off('message', messageHandler); // Clean up listener.
                        if (response.type === 'result') {
                            resolve({ ino, hash: response.hash });
                        } else if (response.type === 'error') {
                            reject(new Error(`Worker error for ino ${ino}: ${response.error}`));
                        }
                    }
                };
                worker.on('message', messageHandler);

                // Transfer the buffer to the worker to avoid a copy, improving performance.
                const transferableBuffer = new Uint8Array(buffer);
                worker.postMessage({ type: 'process', ino, buffer: transferableBuffer }, [transferableBuffer.buffer]);
            });
        });

        const hashResults = await Promise.all(hashPromises);

        // 3. Group files by their returned intermediate hashes.
        const hashesThisRound = new Map();
        const inoToInfoMap = new Map(currentGroup.map(info => [info.fileObject.ino, info]));

        for (const { ino, hash } of hashResults) {
            if (!hashesThisRound.has(hash)) {
                hashesThisRound.set(hash, []);
            }
            const fileInfo = inoToInfoMap.get(ino);
            if (fileInfo) {
                hashesThisRound.get(hash).push(fileInfo);
            }
        }

        // 4. Collect the new subgroups that are still potential duplicates.
        for (const [hash, subGroup] of hashesThisRound.entries()) {
            if (subGroup.length > 1) {
                nextIterationGroups.push({ hash, group: subGroup });
            }
        }
    }
    return nextIterationGroups;
}

/**
 * Finalizes the process by assigning the definitive hash to all files in confirmed duplicate groups.
 * @param {Array<object>} finalGroupsWithHashes - The groups of confirmed duplicates, including their final hash.
 */
function finalizeHashes(finalGroupsWithHashes) {
    if (finalGroupsWithHashes.length > 0) {
        console.log('[DIRT] Incremental comparison complete. Finalizing hashes...');
        for (const { hash: finalHash, group: finalGroup } of finalGroupsWithHashes) {
            // The check for finalGroup.length > 1 is already handled by processChunk,
            // but we keep it as a safeguard.
            if (finalGroup.length > 1) {
                for (const fileInfo of finalGroup) {
                    fileInfo.fileObject.hash = finalHash;
                    console.log(`[DIRT] Assigned final hash ${finalHash} to file object for path(s): ${fileInfo.fileObject.path.join(', ')}`);
                }
            }
        }
    } else {
        console.log('[DIRT] No identical files confirmed in this group.');
    }
}

/**
 * The main handler for 'file-group' jobs. Processes a group of files to find true duplicates.
 * @param {object} job The BullMQ job object.
 * @param {Worker[]} workerPool The pool of worker threads.
 */
const handleFileGroup = async (job, workerPool) => {
    const { files: initialGroup, size } = job.data;
    console.log(`[DIRT] Starting definitive incremental comparison for group of ${initialGroup.length} files with size ${size}.`);
    console.log();

    const fileInfoMap = initializeFileInfo(initialGroup);
    let activeGroups = [Array.from(fileInfoMap.values())];
    const fileHandles = await openFileHandles(initialGroup);

    let finalGroupsWithHashes = [];

    try {
        let bytesRead = 0;
        let lastTotalFiles = -1;

        while (activeGroups.length > 0 && bytesRead < size) {
            const currentChunkSize = Math.min(CHUNK_SIZE, size - bytesRead);
            const resultsWithHashes = await processChunk(activeGroups, fileHandles, workerPool, currentChunkSize, bytesRead);
            bytesRead += currentChunkSize;

            if (resultsWithHashes.length === 0) {
                activeGroups = [];
                finalGroupsWithHashes = [];
                break;
            }

            activeGroups = resultsWithHashes.map(r => r.group);
            finalGroupsWithHashes = resultsWithHashes;

            if (activeGroups.length > 0) {
                const totalFiles = activeGroups.reduce((sum, group) => sum + group.length, 0);

                if (totalFiles !== lastTotalFiles) {
                    if (process.stdout.isTTY) {
                        process.stdout.moveCursor(0, -1);
                        process.stdout.clearLine(0);
                        process.stdout.cursorTo(0);
                    }
                    console.log(`[DIRT] Chunk comparison complete. ${totalFiles} potential duplicates remain in ${activeGroups.length} group(s).`);
                    lastTotalFiles = totalFiles;
                }
            } else {
                break;
            }
        }

        finalizeHashes(finalGroupsWithHashes);

    } catch (error) {
        console.error(`[DIRT] Error during incremental comparison for size ${size}:`, error);
    } finally {
        for (const handle of fileHandles.values()) {
            await handle.close();
        }
        // Workers are not terminated here. Their lifecycle is managed by the calling process.
        // We do, however, need to reset their internal state for the next group.
        workerPool.forEach(worker => worker.postMessage({ type: 'reset' }));
        console.log(`[DIRT] Finished hashing group for size ${size}.`);
    }

    // After processing, prepare all files from the original group to be saved.
    const filesToSave = Array.from(fileInfoMap.values()).map(info => ({
        ...info.fileObject,
        size // Add the size back, as it's part of the schema but not the file object.
    }));

    await saveWithRetries(filesToSave);
    console.log(`[DIRT] Finished processing and saving data for group size ${size}.`);
};

module.exports = {
    handleFileGroup,
    saveWithRetries,
};