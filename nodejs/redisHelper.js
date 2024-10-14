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
    path: { type: 'string[]' },
    size: { type: 'number' },
    nlink: { type: 'number' },
    atimeMs: { type: 'date' },
    mtimeMs: { type: 'date' },
    ctimeMs: { type: 'date' }
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