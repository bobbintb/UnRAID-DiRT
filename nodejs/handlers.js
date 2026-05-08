const fs = require('fs');
const { getFileMetadataRepository, getRedisPublisherClient } = require('./redis.js');
const { getShareFromPath } = require('./utils.js');
const { getFileStats } = require('./scan.js');
const { handleUpsertGroup } = require('./upsert-processor.js');
const { saveWithRetries } = require('./file-group-processor.js');

const handleUpsert = async (job, workerPool) => {
  const { path: upsertedPath } = job.data;
  console.log(`[HANDLER] Processing file.upsert job ${job.id} for path: ${upsertedPath}`);

  // 1. Get file stats.
  const stats = await getFileStats(upsertedPath);
  if (!stats) {
    console.error(`[HANDLER] Could not stat file ${upsertedPath}. Aborting upsert.`);
    return;
  }
  const { ino: upsertedIno, size: upsertedSize } = stats;

  const fileRepository = getFileMetadataRepository();

  // Handle zero-byte files as a special case, consistent with initial scan logic.
  if (upsertedSize === 0) {
    console.log(`[HANDLER] Zero-byte file detected: ${upsertedPath}. Assigning static hash.`);
    const upsertedFile = {
      ...stats,
      path: [upsertedPath],
      shares: [getShareFromPath(upsertedPath)],
      size: upsertedSize,
      hash: 'af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262', // Static hash for zero-byte files
    };
    await saveWithRetries([upsertedFile]);
    console.log(`[HANDLER] Finished processing zero-byte upsert for ${upsertedPath}`);
    return;
  }

  // 2. Query for files of the same size, excluding the current file's inode.
  console.log(`[HANDLER] Searching for files with size ${upsertedSize} and different inode...`);
  const candidateFiles = await fileRepository.search()
    .where('size').equals(upsertedSize)
    .and('ino').not.equals(upsertedIno)
    .return.all();

  const upsertedFile = {
    ...stats,
    path: [upsertedPath],
    shares: [getShareFromPath(upsertedPath)],
    size: upsertedSize,
  };

  let filesToSave = [];

  // 3. Handle based on whether candidates were found.
  if (candidateFiles.length === 0) {
    // No other files of the same size exist. It's unique.
    console.log(`[HANDLER] No files of same size found. Preparing to save as unique file: ${upsertedPath}`);
    filesToSave.push(upsertedFile);
  } else {
    // 4. Candidates found. Proceed with definitive hash comparison.
    console.log(`[HANDLER] Found ${candidateFiles.length} candidate(s) of the same size. Starting hash comparison.`);
    filesToSave = await handleUpsertGroup(upsertedFile, candidateFiles, workerPool);
  }

  // 5. Save all necessary files (either the single unique file or the group of duplicates) to Redis.
  if (filesToSave.length > 0) {
    await saveWithRetries(filesToSave);
  } else {
    console.warn(`[HANDLER] No files were marked for saving for upserted path: ${upsertedPath}`);
  }

  console.log(`[HANDLER] Finished processing upsert for ${upsertedPath}`);
};

const handleRemove = async (job) => {
  const { path: removedPath } = job.data;
  console.log(`[HANDLER] Processing file.removed job ${job.id} for path: ${removedPath}`);

  try {
    // 1. Publish cancellation signal immediately.
    const pubClient = getRedisPublisherClient();
    const channel = `cancel-hashing:${removedPath}`;
    await pubClient.publish(channel, 'cancel');
    console.log(`[HANDLER] Published cancellation signal to ${channel}`);

    // 2. Search for the file record by its path, getting all results.
    const fileRepository = getFileMetadataRepository();
    const fileEntities = await fileRepository.search().where('path').contains(removedPath).return.all();

    // 3. If no record is found, log and exit gracefully.
    if (!fileEntities || fileEntities.length === 0) {
      console.warn(`[HANDLER] Received 'remove' event for a path not in the database: ${removedPath}. No action taken.`);
      return;
    }

    const fileEntity = fileEntities[0]; // Use the first result
    // The entityId is stored in a symbol property. Find it by its description.
    const entityIdSymbol = Object.getOwnPropertySymbols(fileEntity).find(s => s.description === 'entityId');
    const ino = entityIdSymbol ? fileEntity[entityIdSymbol] : null;

    if (!ino) {
      console.error(`[HANDLER] Could not retrieve entity ID (ino) for path ${removedPath}. The record may be malformed. Aborting removal.`);
      return;
    }

    // 4. Check if the file has multiple paths (is a hard link).
    if (fileEntity.path.length <= 1) {
      // This is the last path, remove the entire entity.
      await fileRepository.remove(ino);
      console.log(`[HANDLER] File entity ${ino} had one path. Deleted entity.`);
    } else {
      // This is a hard link; remove only this path.
      const pathIndex = fileEntity.path.indexOf(removedPath);
      if (pathIndex > -1) {
        fileEntity.path.splice(pathIndex, 1);
        // Also remove the corresponding share.
        if (fileEntity.shares && fileEntity.shares.length > pathIndex) {
          fileEntity.shares.splice(pathIndex, 1);
        }
        await fileRepository.save(fileEntity);
        console.log(`[HANDLER] Removed path '${removedPath}' from entity ${ino}. ${fileEntity.path.length} paths remain.`);
      } else {
        console.warn(`[HANDLER] Path '${removedPath}' not found in record ${ino}, despite being found by search. No action taken.`);
      }
    }
  } catch (error) {
    console.error(`[HANDLER] Error processing file.removed job for path ${removedPath}:`, error);
    throw error;
  }
};

const handleRename = async (job) => {
  const { oldPath, newPath } = job.data;
  console.log(`[HANDLER] Processing file.rename job ${job.id} from ${oldPath} to ${newPath}`);

  try {
    // 1. Search for the file record by its old path. This is safer against race conditions.
    const fileRepository = getFileMetadataRepository();
    const fileEntities = await fileRepository.search().where('path').contains(oldPath).return.all();

    // 2. If no record is found, it was likely already updated by a concurrent upsert job.
    if (!fileEntities || fileEntities.length === 0) {
      console.warn(`[HANDLER] 'rename' job: No record found for oldPath: ${oldPath}. The record may have been updated by another job. No action taken.`);
      return;
    }

    // Although we expect only one, handle the case of multiple results.
    if (fileEntities.length > 1) {
      console.warn(`[HANDLER] 'rename' job: Found multiple records containing path: ${oldPath}. Proceeding with the first result.`);
    }
    const fileEntity = fileEntities[0];

    // 3. Update the path array.
    const pathIndex = fileEntity.path.indexOf(oldPath);
    if (pathIndex > -1) {
      fileEntity.path[pathIndex] = newPath;
    } else {
      // If the record was found by searching for oldPath, but oldPath is not in its path array,
      // something is critically wrong with the data consistency. Do not try to 'fix' it.
      const entityIdSymbol = Object.getOwnPropertySymbols(fileEntity).find(s => s.description === 'entityId');
      const ino = entityIdSymbol ? fileEntity[entityIdSymbol] : '[unknown]';
      throw new Error(`[HANDLER] CRITICAL: Record ${ino} found by oldPath '${oldPath}', but path was not present in record's path array.`);
    }

    // 4. For robustness, always rebuild the shares array from the paths array.
    fileEntity.shares = fileEntity.path.map(getShareFromPath).filter(share => share !== null);

    // 5. Save the updated record back to Redis.
    await fileRepository.save(fileEntity);
    const entityIdSymbol = Object.getOwnPropertySymbols(fileEntity).find(s => s.description === 'entityId');
    const ino = entityIdSymbol ? fileEntity[entityIdSymbol] : '[unknown]';
    console.log(`[HANDLER] Successfully updated path for ino ${ino}. New path: ${newPath}`);

  } catch (error) {
    console.error(`[HANDLER] Error processing file.rename job from ${oldPath} to ${newPath}:`, error);
    // Re-throw the error to allow BullMQ to handle the job failure (e.g., retry).
    throw error;
  }
};

module.exports = {
    handleUpsert,
    handleRemove,
    handleRename,
};