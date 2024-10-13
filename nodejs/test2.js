import {createClient} from "redis";
import {Repository, Schema} from "redis-om";

const redis = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();


const fileMetadataSchema = new Schema('ino', {
    path: { type: 'string[]' },
    size: { type: 'number' },
    nlink: { type: 'number' },
    atimeMs: { type: 'date' },
    mtimeMs: { type: 'date' },
    ctimeMs: { type: 'date' }
}, {
    dataStructure: 'HASH'
})
const fileRepository = new Repository(fileMetadataSchema, redis);

const fileInfo = {
    path: ["/mnt/user/downloads/aaaaa2.mkv"],  // get rid of path
    nlink: Number(3),
    //ino: stats.ino.toString(),
    size: Number(12779642545),
    atimeMs: Number(1651538358526),
    mtimeMs: Number(1651539803854),
    ctimeMs: Number(1725219303278)
};
for (const [key, value] of Object.entries(fileInfo)) {
    console.log(`${key}: ${typeof value}`);
}
const key = '649362771271510040'
const exists = await redis.exists("ino:" + key, fileInfo);
if (await redis.exists('ino:' + key) === 1) {
    console.log(exists)
    const existingPath = await redis.hGet('ino:' + key, 'path');
    console.log(existingPath)
}

// const result = await redis.hGetAll("ino:649362771271510040")
// console.log(result)