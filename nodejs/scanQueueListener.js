import { Queue, Worker, FlowProducer } from 'bullmq';
import * as scan from './scan.js';
import { fileRepository } from './redisHelper.js';

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

// step 1: Scan all files in the given directories
// step 2: For each size group, query redis for other files with the same size
// step 3: If the group has only one file, add it to redis.
// step 4: If the group has more than one file, hash the files in intervals and add them to redis.

// Example flow creation function
export async function addShares(dirPaths) {
    console.debug('scanQueueListener.js: addShares() called with dirPaths:', dirPaths);
    const flow = await flowProducer.add({
        name: 'scanQueue-flow',
        queueName: QUEUE_NAME,
        children: [
            {
                name: 'saveToRedis',
                queueName: QUEUE_NAME,
                data: {}, // Only needs child_result
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
            return [...results.entries()];
            
        case 'removeUniques':
            console.debug('Removing unique files...');
            const filesData = Object.values(await job.getChildrenValues())[0];
            
            if (!Array.isArray(filesData)) {
                throw new Error('Files data is not in the expected format');
            }
            
            const duplicateGroups = filesData.filter(([_, group]) => group.length > 1);
            duplicateGroups.forEach(([size, files]) => {
                return files;
            });
            

        case 'saveToRedis':
            console.debug('Saving duplicate groups to Redis...');
            const groups = Object.values(await job.getChildrenValues())[0];
            console.debug('Groups:', groups);
            // Process each size group and save to Redis
            for (const [size, files] of groups) {
                // Hash the files in the group if they have the same size
                const hashedFiles = await scan.hashFilesInIntervals(size, files);
                
                // Save each file's metadata to Redis
                for (const file of hashedFiles) {
                    await fileRepository.save(file.ino, file);
                }
            }
            return;
    }
}, queueConfig);

//   const job2Worker = new Worker('main-queue', async (job) => {
//     if (job.name === 'job2' && !job.returnvalue.condition) {
//       // Only add job2b if condition is false
//       await flowProducer.add({
//         name: 'job2b',
//         queueName: 'scanQueue',
//         data: {},
//         children: [] // job3 is already scheduled
//       });
//     }
//   }, { autorun: false });

// Handle worker completion events
worker.on('completed', job => {
    console.debug(`Job ${job.name} completed.`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.name} failed:`, err);
});