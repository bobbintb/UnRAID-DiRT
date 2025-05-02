import { Queue, Worker, FlowProducer } from 'bullmq';
import { defaultQueueConfig, fileRepository } from '../redisHelper.js';

// Create queue with connection config and prefix
export const fileQueue = new Queue('fileQueue', defaultQueueConfig);

const fileQueueWorker = new Worker('fileQueue', async job => {
    console.debug('Starting fileQueueWorker...');
    switch (job.name) {
        case 'upsert':
            const file = job.data;
            await fileRepository.save(file.ino, file);
            return true;
    }
}, defaultQueueConfig);

fileQueueWorker.on('completed', job => {
    console.debug(`Job ${job.name} completed.`);
});

fileQueueWorker.on('failed', (job, err) => {
    console.error(`Job ${job.name} failed:`, err);
});