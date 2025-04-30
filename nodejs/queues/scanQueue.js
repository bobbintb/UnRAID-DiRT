import { Queue, Worker, FlowProducer } from 'bullmq';
import * as scan from '../scan.js';
import { fileRepository } from '../redisHelper.js';

const connection = {
	host: "localhost",
	port: 6379,
};


const queueConfig = {
	connection,
	prefix: "queues",
};

// Create queue with connection config and prefix
export const scanQueue = new Queue('scanQueue', queueConfig);


// Create a flow producer with connection config and prefix
const flowProducer = new FlowProducer(queueConfig);

// step 1: Scan all files in the given directories
// step 2: For each size group, query redis for other files with the same size
// step 3: If the group has only one file, add it to redis.
// step 4: If the group has more than one file, hash the files in intervals and add them to redis.

// TODO: need to account for a file in the new share being a hardlink to a file in the old share

export async function addSharesFlow(dirPaths) {
    console.debug('scanQueueListener.js: addShares() called with dirPaths:', dirPaths);
    await flowProducer.add({
        name: 'scanQueue-flow',
        queueName: 'scanQueue',
        children: [
            {
                name: 'saveToRedis',
                queueName: 'scanQueue',
                data: {}, // Will be populated by removeUniques
                children: [
                    {
                        name: 'removeUniques',
                        queueName: 'scanQueue',
                        data: {}, 
                        children: [
                            {
                                name: 'getAllFiles',
                                queueName: 'scanQueue',
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
}

export async function removeSharesJob(dirPaths) {
    await scanQueue.add('removeShares', { paths: dirPaths });
}

// Worker uses the same queue name and config to ensure consistent prefix
const scanQueueWorker = new Worker('scanQueue', async job => {
    console.debug('starting worker...');
    switch (job.name) {
        case 'removeShares':
            console.debug('Removing shares...');
            const paths = job.data.paths;
            for (const path of paths) {
                await fileRepository.removePathsStartingWith(path);
            }
            return true;

        case 'getAllFiles':
            console.debug('Starting file scan...');
            let results = scan.getAllFiles(job.data.input);
            return [...results.entries()];
            
        case 'removeUniques':
            console.debug('Removing unique files...');
            const filesData = Object.values(await job.getChildrenValues())[0];
            // const filesData = job.childrenValues?.[0] 

            for (const [size, files] of filesData) {
                if (files.length > 1) {
                    console.debug('hashing files...');
                    // const hashedFiles = await scan.hashFilesInIntervals(size, files);
                } else {
                    // await scanQueue.add('saveToRedis', { size, files }, { lifo: true });
                    return size, files;
                }
            }
            // return true;
        
            

        case 'saveToRedis':
            console.debug('Saving duplicate groups to Redis...');
            const { size, files } = Object.values(await job.getChildrenValues())[0];
            // const { size, files } = job.data;
            console.debug(`Saving size: ${size}, files: ${files}`);
            for (const file of files) {
                file.size = size;
                await fileRepository.save(file.ino, file);
            }
            return true;
    }
}, queueConfig);

scanQueueWorker.on('completed', job => {
    console.debug(`Job ${job.name} completed.`);
});

scanQueueWorker.on('failed', (job, err) => {
    console.error(`Job ${job.name} failed:`, err);
});
