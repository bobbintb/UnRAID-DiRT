import { Queue, Worker, FlowProducer } from 'bullmq';
import { defaultQueueConfig, fileRepository } from '../redisHelper.js';

/**
 * The queue for file operations.
 * @type {import('bullmq').Queue}
 */
export const fileQueue = new Queue('fileQueue', defaultQueueConfig);

/**
 * Worker for the file queue.
 * @param {import('bullmq').Job} job - The job to process.
 * @returns {Promise<boolean>} A promise that resolves to true if the job is successful.
 */
const fileQueueWorker = new Worker('fileQueue', async job => {
    console.debug('Starting fileQueueWorker...');
    switch (job.name) {
        case 'upsert':
            const file = job.data;
            await fileRepository.save(file.ino, file);
            return true;
        case 'delete':
            // const file = job.data;
            // await fileRepository.save(file.ino, file);
            return true;
    }
}, defaultQueueConfig);

fileQueueWorker.on('completed', job => {
    console.debug(`Job ${job.name} completed.`);
});

fileQueueWorker.on('failed', (job, err) => {
    console.error(`Job ${job.name} failed:`, err);
});