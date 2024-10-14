import fs from "fs";
import Redis from "ioredis"; // remove this
import Queue from 'bee-queue';
import * as test from "./hashHelper.js"
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

const redis = createClient()
await redis.connect();


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
export function enqueueDeleteFile(src) {
    const jobData = {
        task: 'delete',
        src: src
    };
    queue.createJob(jobData).save();
}

export function enqueueCreateFile(src) {
    const jobData = {
        task: 'create',
        src: src
    };
    queue.createJob(jobData).save();
}

export function enqueueMoveFile(src, dest) {
    const jobData = {
        task: 'move',
        src: src,
        dest: dest
    };
    queue.createJob(jobData).save();
}

async function dequeueCreateFile(file) {
    const stats = fs.statSync(file, {bigint: true});
    const fileInfo = {
        path: [file],
        nlink: Number(stats.nlink),
        //ino: stats.ino.toString(),
        size: Number(stats.size),
        atimeMs: Number(stats.atimeMs),
        mtimeMs: Number(stats.mtimeMs),
        ctimeMs: Number(stats.ctimeMs)
    };

    // fileInfo.$id=stats.ino.toString();

    // let sameSizeFiles = await test.searchBySize(stats.size);
    // if (sameSizeFiles.length > 0) {
    //     let files = sameSizeFiles;
    //     files.splice(0, 0, fileInfo); // adds working file to the front of the array of same size files
    //     const results = await test.hashFilesInIntervals(files);
    //
    //     const pipeline = redis.multi(); // 'pipeline' in node-redis is 'multi'
    //
    //     await pipeline.hSet(file, sameSizeFiles[0]);
    //     for (const result of results) {
    //         await pipeline.hSet(result.path, 'hash', result.hash);
    //     }
    //     await pipeline.exec();
    // } else {
    const key = stats.ino.toString()
    try {
        if (await redis.exists('ino:'+key) === 1) {
            const existingPath = await redis.hGet('ino:' + key, 'path');
            console.log('existingPath')
            fileInfo.path.push(existingPath);
            console.log(existingPath)
        }
            await fileRepository.save(key, fileInfo);

        // await fileRepository.save(stats.ino.toString(), fileInfo);
    } catch (error) {
        console.error('Error saving file info:', error);
        // Handle the error as needed (e.g., rethrow, return a response, etc.)
    }

    //}
}

async function dequeueDeleteFile(file) {
    redis.delete(file);
}

async function dequeueMoveFile(src, dest) {
    await redis.rename(src, dest);
}

// Must be called to process the queue
queue.process(async (job) => {
    switch (job.data.task) {
        case 'create':
            await dequeueCreateFile(job.data.src)
            break;
        case 'move':
            await dequeueMoveFile(job.data.src, job.data.dest)
            break;
        case 'delete':
            await dequeueDeleteFile(job.data.src)
            break;
    }
    return job.data.x + job.data.y;
});