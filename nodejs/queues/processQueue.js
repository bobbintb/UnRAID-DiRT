import { Queue, Worker, FlowProducer } from 'bullmq';
import * as scan from '../scan.js';
import { fileRepository } from '../redisHelper.js';

const connection = {
    host: 'localhost',
    port: 6379
};


const queueConfig = {
    connection,
    prefix: 'queues'
};

// Create queue with connection config and prefix
export const processQueue = new Queue('processQueue', queueConfig);

const flowProducer = new FlowProducer(queueConfig);



const processWorker = new Worker('hashQueue', async job => {
    for (const [size, files] of groups) {
        // Hash the files in the group if they have the same size
        const hashedFiles = await scan.hashFilesInIntervals(size, files);
    }
    return;
})