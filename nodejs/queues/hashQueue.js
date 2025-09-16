import { Queue, Worker, FlowProducer } from 'bullmq';
import { defaultQueueConfig, fileRepository } from '../redisHelper.js';
import { fileQueue } from './fileQueue.js';
import { hashFilesInIntervals } from '../scan.js';

/**
 * The queue for hashing files.
 * @type {import('bullmq').Queue}
 */
export const hashQueue = new Queue('hashQueue', defaultQueueConfig);

/**
 * Worker for the hash queue.
 * @param {import('bullmq').Job} job - The job to process.
 * @returns {Promise<boolean>} A promise that resolves to true if the job is successful.
 */
const hashQueueWorker = new Worker('hashQueue', async job => {
    console.debug('starting worker...');
            const file = job.data;
            console.debug('hashQueueWorker', file);
            let results = await hashFilesInIntervals(file[0], file[1]);
            results = results.map(obj => ({ ...obj, size: file[0] }))
            console.debug('hashQueueWorker results', results);
            await fileQueue.addBulk(
                results.map((group) => ({
                    name: "upsert",
                    data: group
                }))
            );
            return true;
}, defaultQueueConfig);

hashQueueWorker.on('completed', job => {
    console.debug(`Job ${job.name} completed.`);
});

hashQueueWorker.on('failed', (job, err) => {
    console.error(`Job ${job.name} failed:`, err);
});

