import Queue from "bee-queue";
import {createClient} from "redis";
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


export const redis = await (async () => {
    const client = await createClient();
    await client.connect();
    return client;
})();


export const fileMetadataSchema = new Schema('ino', {
    path: {type: 'string[]'},
    size: {type: 'number'},
    nlink: {type: 'number'},
    atimeMs: {type: 'date'},
    mtimeMs: {type: 'date'},
    ctimeMs: {type: 'date'},
    hash: {type: 'string'}
}, {
    dataStructure: 'HASH'
})

export const configSchema = new Schema('dirt:settings', {
    shares: {type: 'string[]'},
    size: {type: 'number'},
    nlink: {type: 'number'},
    atimeMs: {type: 'date'},
    mtimeMs: {type: 'date'},
    ctimeMs: {type: 'date'},
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

async function findDuplicateHashes() {
    const result = await redis.call(
        'FT.AGGREGATE',
        'ino:index', '*',
        'GROUPBY', '1', '@hash',
        'REDUCE', 'COUNT', '0', 'AS', 'nb_of_files',
        'FILTER', '@nb_of_files > 1',
        'SORTBY', '2', '@nb_of_files', 'ASC',
        'LIMIT', '0', '10000'
    );
    console.log(result);
}

export async function findEntitiesWithNonUniqueHashOptimized() {

    // Step 1: Define the Lua script
    const luaScript = `
        local cursor = 0
        local result = {}
        local seen = {}

        repeat
            local res = redis.call('SCAN', cursor, 'MATCH', ARGV[1])
            cursor = tonumber(res[1])
            local keys = res[2]

            for i, key in ipairs(keys) do
                local hash = redis.call('HGET', key, ARGV[2])
                if hash then
                    if seen[hash] then
                        seen[hash] = seen[hash] + 1
                    else
                        seen[hash] = 1
                    end
                end
            end
        until cursor == 0

        for hash, count in pairs(seen) do
            if count > 1 then
                table.insert(result, hash)
            end
        end

        return result
    `;

    // Step 2: Execute the Lua script using node-redis `eval` method
    const nonUniqueHashes = await redis.eval(luaScript, {
        keys: [],
        arguments: ['*', 'hash']  // '*' scans all keys, 'hash' is the field name
    });

    // Step 3: Search for all entities with those non-unique 'hash' values
    const pipeline = redis.multi(); // Create a Redis pipeline (multi-exec)
    nonUniqueHashes.forEach(hash => {
        pipeline.call('FT.SEARCH', repository.schema.indexName, `@hash:{${hash}}`);
    });

    const result = await pipeline.exec(); // Execute all pipeline commands
    await redis.disconnect(); // Close Redis connection
    return result.flat();  // Flatten the results of the pipeline
}