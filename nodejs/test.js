import {fileRepository, processQueue, redis} from "./redisHelper.js";

await processQueue.process(async (job) => {
    console.log(`Processing job ${job}`);
    return job.data.x + job.data.y;
});
const TIMEOUT = 30 * 1000;
process.on('uncaughtException', async () => {
    // Queue#close is idempotent - no need to guard against duplicate calls.
    try {
        await processQueue.close(TIMEOUT);
    } catch (err) {
        console.error('bee-queue failed to shut down gracefully', err);
    }
    process.exit(1);
});