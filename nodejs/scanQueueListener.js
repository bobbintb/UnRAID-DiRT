import { Queue, Worker, FlowProducer } from 'bullmq';
import * as scan from './scan.js';

const connection = {
    host: 'localhost',
    port: 6379
};

const QUEUE_NAME = 'scanQueue';

const queueConfig = {
    connection,
    prefix: 'dirt'
};

// Create queue with connection config and prefix
export const scanQueue = new Queue(QUEUE_NAME, queueConfig);

// Create a flow producer with connection config and prefix
const flowProducer = new FlowProducer(queueConfig);

// Example flow creation function
export async function addShares(dirPaths) {
    console.debug('scanQueueListener.js: addShares() called with dirPaths:', dirPaths);
    const flow = await flowProducer.add({
        name: 'scanQueue-flow',
        queueName: QUEUE_NAME,
        children: [
            {
                name: 'removeUniques',
                queueName: QUEUE_NAME,
                data: {}, // Only needs child_result
                children: [
                    {
                        name: 'getAllFiles',
                        queueName: QUEUE_NAME,
                        data: {
                            input: dirPaths
                        }
                    }
                ]
            }
        ]
    });
    return flow;
}

// Worker uses the same queue name and config to ensure consistent prefix
const worker = new Worker(QUEUE_NAME, async job => {
    console.debug('starting worker...');
    switch (job.name) {
        case 'getAllFiles':
            console.debug('Starting file scan...');
            let results = scan.getAllFiles(job.data.input);
            // console.debug('File scan results:', results);
            return Array.from(results);
            
        case 'removeUniques':
            console.debug('Removing unique files...');
            const filesData = await job.getChildrenValues();
            console.debug('Files data:', filesData);
            return Array.from(filesData).filter(([_, group]) => group.length > 1);
    }
}, queueConfig);

// Handle worker completion events
worker.on('completed', job => {
    console.debug(`Job ${job.name} completed.`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.name} failed:`, err);
});