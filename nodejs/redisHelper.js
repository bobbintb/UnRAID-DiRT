import Queue from "bee-queue";
import {AggregateGroupByReducers, AggregateSteps, createClient} from "redis";
import {Repository, Schema} from "redis-om";

export const queue = new Queue('queue', {
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        options: {},
    },
    prefix: 'dirt',
    removeOnSuccess: true
});

export const process = new Queue('process', {
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        options: {},
    },
    prefix: 'dirt',
    removeOnSuccess: true
});

export const redis = await (async () => {
    const client = await createClient();
    await client.connect();
    return client;
})();


export const fileMetadataSchema = new Schema('ino', {
    path: {type: 'string[]'},
    size: {type: 'number'},
    nlink: {type: 'number'},
    atimeMs: {type: 'number'},
    mtimeMs: {type: 'number'},
    ctimeMs: {type: 'number'},
    hash: {type: 'string'}
}, {
    dataStructure: 'HASH'
})

export const configSchema = new Schema('dirt:settings', {
    shares: {type: 'string[]'},
    size: {type: 'number'},
    nlink: {type: 'number'},
    atimeMs: {type: 'number'},
    mtimeMs: {type: 'number'},
    ctimeMs: {type: 'number'},
    hash: {type: 'string'}
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
                                id: entity.entityId,
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