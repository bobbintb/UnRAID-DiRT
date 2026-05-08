const fs = require('fs').promises;
const { getFileMetadataRepository, getRedisClient, actionQueue } = require('./redis.js');

/**
 * Processes all currently waiting jobs in the action queue.
 * This is a batch process that runs once when triggered.
 */
const processActionQueue = async () => {
    console.log('[ACTION-PROCESSOR] Starting batch processing of action queue...');

    // Get all jobs currently in 'waiting' state.
    // We rely on the fact that we are the only consumer of this queue.
    const jobs = await actionQueue.getJobs(['waiting']);
    console.log(`[ACTION-PROCESSOR] Found ${jobs.length} jobs to process.`);

    if (jobs.length === 0) {
        console.log('[ACTION-PROCESSOR] No jobs to process.');
        return;
    }

    const redisClient = getRedisClient();
    const repo = getFileMetadataRepository();

    // Fetch the state hash to find originals
    // Key: hash, Value: ino of the original file
    const state = await redisClient.hGetAll('state');

    for (const job of jobs) {
        const { ino, path } = job.data;
        const action = job.name;
        const jobId = job.id;

        try {
            // 1. Find the duplicate file metadata to get its hash
            const targetIno = ino || (jobId.startsWith('ino-') ? jobId.split('-')[1] : null);

            if (!targetIno) {
                 throw new Error(`Job data missing "ino" and could not parse from ID: ${jobId}`);
            }

            const duplicateFile = await repo.fetch(targetIno);

            if (!duplicateFile || !duplicateFile.hash) {
                 throw new Error(`Could not fetch metadata or hash for file ino: ${targetIno}`);
            }

            const hash = duplicateFile.hash;
            const originalIno = state[hash];

            if (!originalIno) {
                throw new Error(`No original file designated for hash: ${hash}`);
            }

            // 2. Check if original file exists
            const originalFile = await repo.fetch(originalIno);

            if (!originalFile || !originalFile.path || originalFile.path.length === 0) {
                throw new Error(`Original file metadata not found for ino: ${originalIno}`);
            }

            let originalExists = false;
            let validOriginalPath = null;

            // Check if any of the paths for the original file exist
            for (const p of originalFile.path) {
                try {
                    await fs.access(p);
                    originalExists = true;
                    validOriginalPath = p;
                    break; // Found one that exists
                } catch (err) {
                    // This path doesn't exist, try next
                }
            }

            if (!originalExists) {
                throw new Error(`Original file physically missing. Searched paths: ${originalFile.path.join(', ')}`);
            }

            // 3. Perform (Simulate) Action
            console.log(`[ACTION-PROCESSOR] Processing job ${jobId}: ${action} on ${path}`);

            if (action === 'delete') {
                console.log(`[ACTION-PROCESSOR] [SIMULATION] Would DELETE file: ${path}`);
                // Implementation:
                // await fs.unlink(path);
            } else if (action === 'link') {
                console.log(`[ACTION-PROCESSOR] [SIMULATION] Would LINK file: ${path} -> ${validOriginalPath} (force)`);
                // Implementation:
                // await fs.link(validOriginalPath, path); // Note: fs.link doesn't have a force flag, would need to unlink first if using native fs.link
            } else {
                 throw new Error(`Unknown action: ${action}`);
            }

            // 4. Mark Complete
            // We use remove() because we cannot use moveToCompleted without a lock (which requires a Worker).
            await job.remove();
            console.log(`[ACTION-PROCESSOR] Job ${jobId} COMPLETED (and removed from queue).`);

        } catch (error) {
            console.error(`[ACTION-PROCESSOR] Job ${jobId} FAILED: ${error.message}`);
            // We leave the job in 'waiting' state so it appears in the UI and can be retried or removed by the user.
        }
    }
    console.log('[ACTION-PROCESSOR] Batch processing finished.');
};

module.exports = { processActionQueue };
