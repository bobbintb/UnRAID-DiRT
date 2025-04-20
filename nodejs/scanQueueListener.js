import { Queue, Worker, FlowProducer } from 'bullmq';
import * as scan from './scan.js';

const connection = {
    host: 'localhost',
    port: 6379
};

// Create queue with connection config and prefix
export const scanQueue = new Queue('scanQueue', {
    connection,
    prefix: 'dirt'  // Change default 'bull' prefix to 'dirt'
});

// Create a flow producer with connection config
const flowProducer = new FlowProducer({ connection });

// Example flow creation function
export async function addShares(dirPaths) {
    console.debug('scanQueueListener.js: addShares() called with dirPaths:', dirPaths);
    const flow = await flowProducer.add({
        name: 'scanQueue-flow',
        queueName: scanQueue,
        children: [
            {
                name: 'summarize',
                data: {}, // Only needs child_result
                children: [
                    {
                        name: 'hashFiles',
                        data: {}, // Only needs child_result
                        children: [
                            {
                                name: 'removeUniques',
                                data: {}, // Only needs child_result
                                children: [
                                    {
                                        name: 'getAllFiles',
                                        data: {
                                            input: dirPaths
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    });
    return flow;
}

// Worker uses the same queue name, connection config and prefix
const worker = new Worker('scanQueue', async job => {
    console.debug('starting worker...');
    switch (job.name) {
        case 'getAllFiles':
            console.log('Starting file scan...');
            return scan.getAllFiles(job.data.input);
            
        case 'removeUniques':
            console.log('Removing unique files...');
            const filesData = job.data.child_result;
            return [...filesData.entries()].filter(([_, group]) => group.length > 1);
            
        case 'hashFiles':
            console.log('Hashing files...');
            const uniqueFiles = job.data.child_result;
            return uniqueFiles;
            
        case 'summarize':
            console.log('Creating summary...');
            const analyzed = job.data.child_result;
            return {
                ...analyzed,
                summary: 'Processing completed successfully',
                completed: true
            };
    }
}, { connection });

// Handle worker completion events
worker.on('completed', job => {
    console.log(`Job ${job.name} completed. Result:`, job.returnvalue);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.name} failed:`, err);
});