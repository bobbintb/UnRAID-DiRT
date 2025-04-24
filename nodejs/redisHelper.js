import { Queue, Worker, FlowProducer } from "bullmq";
import {AggregateGroupByReducers, AggregateSteps, createClient} from "redis";
import {Repository, Schema} from "redis-om";
import fs from "fs";
import { exec } from 'child_process';

// export const scanQueue = await new Queue('queue', {
//     connection: {
//         host: '127.0.0.1',
//         port: 6379,
//         db: 0,
//         options: {},
//     },
//     prefix: 'dirt',
//     defaultJobOptions: {
//         removeOnComplete: true
//     }
// });

export const processQueue = await new Queue('process', {
    connection: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        options: {},
    },
    prefix: 'dirt',
    defaultJobOptions: {
        removeOnComplete: true
    }
});

// processQueue.pause();
// processQueue.process(async (job, done) => {
//     switch (job.data.action) {
//         case 'delete':
//             console.log('rm', job.data.path);
//             // fs.unlink(job.data.path, (err) => {
//             //     if (err) {
//             //         console.error('Error deleting file:', err);
//             //     } else {
//             //         console.log('File deleted successfully');
//             //     }
//             // });
//             break;
//         case 'link':
//             exec(`ln -f ${existingFilePath} ${hardLinkPath}`, (err, stdout, stderr) => {
//                 if (err) {
//                     console.error('Error creating hard link:', err);
//                     return;
//                 }
//                 if (stderr) {
//                     console.error('stderr:', stderr);
//                     return;
//                 }
//                 console.log('Hard link created successfully');
//             });
//             break;
//     }
//     console.log(`Processing job ${job.data.path}`);
//     done();
// })


// const worker = new Worker('queueName', async (job) => {
//     switch (job.data.action) {
//         case 'delete':
//             console.log('rm', job.data.path);
//             // fs.unlink(job.data.path, (err) => {
//             //     if (err) {
//             //         console.error('Error deleting file:', err);
//             //     } else {
//             //         console.log('File deleted successfully');
//             //     }
//             // });
//             break;
//         case 'link':
//             exec(`ln -f ${existingFilePath} ${hardLinkPath}`, (err, stdout, stderr) => {
//                 if (err) {
//                     console.error('Error creating hard link:', err);
//                     return;
//                 }
//                 if (stderr) {
//                     console.error('stderr:', stderr);
//                     return;
//                 }
//                 console.log('Hard link created successfully');
//             });
//             break;
//     }
//     console.log(`Processing job ${job.data.path}`);
// }, {
//     connection: { host: '127.0.0.1', port: 6379 }
// });

// Pause the worker when needed
// worker.pause();

export const redis = await (async () => {
    const client = await createClient();
    await client.connect();
    return client;
})();


export const fileMetadataSchema = new Schema('ino', {
    path: {type: 'string[]'},
    size: {type: 'number'},
    nlink: {type: 'number'},
    atime: {type: 'date'},
    mtime: {type: 'date'},
    ctime: {type: 'date'},
    hash: {type: 'string'},
    action: {type: 'string'}
}, {
    dataStructure: 'HASH'
})

export const fileRepository = await (async () => {
    const repo = new Repository(fileMetadataSchema, redis);
    await repo.createIndex();
    return repo;
})();

export async function filesOfSize(size) {
    return await fileRepository.search()
        .where('size').equals(size)
        .return.all()
}

export async function findDuplicateHashes() {
    try {
        await fileRepository.createIndex();
        const result = await redis.ft.aggregate('ino:index', '*', {
            LOAD: ['@hash'],
            STEPS: [
                {
                    type: AggregateSteps.FILTER,
                    expression: 'exists(@hash)'
                },
                {
                    type: AggregateSteps.GROUPBY,
                    properties: ['@hash'],
                    REDUCE: [
                        {
                            type: AggregateGroupByReducers.COUNT,
                            property: '@hash',
                            AS: 'nb_of_files'
                        }
                    ]
                },
                {
                    type: AggregateSteps.SORTBY,
                    BY: {
                        BY: '@nb_of_files',
                        DIRECTION: 'DESC'
                    }
                },
                {
                    type: AggregateSteps.FILTER,
                    expression: '@nb_of_files > 1'
                },
                {
                    type: AggregateSteps.LIMIT,
                    from: 0,
                    size: 10000
                }
            ]
        });

        const hashes = result.results.map(group => group.hash); // Assuming group.hash contains an object

        const resultsArray = await Promise.all(
            hashes.map(hash =>
                fileRepository
                    .search()
                    .where('hash')
                    .eq(hash)
                    .return.all()
                    .then(entities => ({
                        hash,
                        documents: entities.map(entity => {
                            return {
                                id: entity[Object.getOwnPropertySymbols(entity).find(sym => sym.description === 'entityId')],
                                ...entity // Spread the properties of the entity
                            };
                        })
                    }))
            )
        );

        // const formattedResults = resultsArray.flatMap(({ hash, documents }) =>
        //     documents.map(doc => ({
        //         ...doc,    // Spread document properties (e.g., id, path, size, etc.)
        //         hash      // Add the hash as a separate field for grouping in Tabulator
        //     }))
        // );
        return resultsArray.flatMap(result => result.documents); // Return array format suitable for Tabulator
    } catch (error) {
        console.error('Error running aggregation:', error);
        throw error;
    }
}

export async function removePathsStartingWith(before) {
    const entities = await fileRepository.search()
        .where('path').matches(`${before}*`)
        .return.all();

    for (const entity of entities) {
        const updatedPaths = entity.path.filter(p => !p.startsWith(before));

        if (updatedPaths.length > 0) {
            await fileRepository.save({ ...entity, path: updatedPaths });
        } else {
            await fileRepository.remove(entity[Object.getOwnPropertySymbols(entity).find(sym => sym.description === 'entityId')]);
        }
    }
}

