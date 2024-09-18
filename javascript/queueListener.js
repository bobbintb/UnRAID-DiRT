import fs from "fs";
import Redis from "ioredis";
import Queue from 'bee-queue';
import {processFiles} from "../nodejs/addFile.js";


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
        path: file,
        nlink: Number(stats.nlink),
        ino: stats.ino.toString(),
        size: Number(stats.size),
        atimeMs: Number(stats.atimeMs),
        mtimeMs: Number(stats.mtimeMs),
        ctimeMs: Number(stats.ctimeMs),
        birthtimeMs: Number(stats.birthtimeMs)
    };
    console.debug(fileInfo);
    await redis.hset(file, ...Object.entries(fileInfo).flat());
}


async function dequeueDeleteFile(file) {
    const pipeline = redis.pipeline();
    pipeline.del(file);
    await pipeline.exec();
}

async function dequeueMoveFile(src, dest) {
    const pipeline = redis.pipeline();
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