import fs from "fs";
import Redis from "ioredis";
import Queue from 'bee-queue';
import {processFiles} from "./addFile.js";


export const queue = new Queue('queue', {
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        options: {},
    },
    prefix: 'dedupe',
    removeOnSuccess: true
});

const redis = new Redis();
const sizeIndex = 'bq:indicies:sizeIndex'
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
    const pipeline = redis.pipeline();
    const stats = fs.statSync(file, {bigint: true});
    const fileInfo = {
        path: file,
        nlink: Number(stats.nlink),
        ino: stats.ino.toString(),
        size: Number(stats.size),
        atimeMs: Number(stats.atimeMs),
        mtimeMs: Number(stats.mtimeMs),
        ctimeMs: Number(stats.ctimeMs),
        birthtimeMs: Number(stats.birthtimeMs)
    };
    const sameSize = await redis.zrange(sizeIndex, stats.size, stats.size, "BYSCORE");
    if (sameSize.length > 0) {
        sameSize.unshift(file)
        console.debug('files of the same size')
        console.debug(sameSize)
        console.debug('processing for dupes')
        const results = await processFiles(sameSize);
        if (results.length > 0) {
            fileInfo.hash = results[0].hash;
            console.debug('*********')
            console.debug(results[0].file)
            console.debug(results[0].hash)
            console.debug('*********')
            for (const result of results.slice(1)) {
                console.debug(result.file);
                console.debug(result.hash);
                pipeline.hset(result.file, 'hash', result.hash);
            }

            console.debug(results)
            console.debug('+++++++++++++++++++++++++++++++++++++++++++++++++++++')
        }
    }
    console.debug(fileInfo)
    // What if the file changes size? What does that do to the index?
    pipeline.hset(file, fileInfo);
    pipeline.zadd(sizeIndex, stats.size, file);
    await pipeline.exec();
}


async function dequeueDeleteFile(file) {
    const pipeline = redis.pipeline();

    pipeline.del(file);
    pipeline.zrem(sizeIndex, ...file);
    await pipeline.exec();
}

async function dequeueMoveFile(src, dest) {
    const pipeline = redis.pipeline();
    const score = await redis.zscore(sizeIndex, src);
    pipeline.zrem(sizeIndex, ...src);
    pipeline.zadd(sizeIndex, score, dest);
    await pipeline.exec();
}

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