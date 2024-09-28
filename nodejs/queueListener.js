import fs from "fs";
import Redis from "ioredis"; // remove this
import Queue from 'bee-queue';
import * as test from "./hashHelper.js"
import {createClient} from "redis";

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

const redis = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

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
        path: file,  // get rid of path
        nlink: Number(stats.nlink),
        ino: stats.ino.toString(),
        size: Number(stats.size),
        atimeMs: Number(stats.atimeMs),
        mtimeMs: Number(stats.mtimeMs),
        ctimeMs: Number(stats.ctimeMs),
        birthtimeMs: Number(stats.birthtimeMs)
    };

    let sameSizeFiles = await test.searchBySize(stats.size);
    if (sameSizeFiles.length > 0) {
        let files = sameSizeFiles;
        files.splice(0, 0, fileInfo); // adds working file to the front of the array of same size files
        const results = await test.hashFilesInIntervals(files);

        const pipeline = redis.multi(); // 'pipeline' in node-redis is 'multi'

        await pipeline.hSet(file, sameSizeFiles[0]);
        for (const result of results) {
            await pipeline.hSet(result.path, 'hash', result.hash);
        }
        await pipeline.exec();
    } else {
        await redis.hSet(file, fileInfo);
    }
}


function verify(result, redisresult) {
    if (result.path == redisresult.path) {
        console.debug('\x1b[32m%s\x1b[0m', `Paths match: ${result.path} ${redisresult.path}`);
    } else {
        console.debug('\x1b[31m%s\x1b[0m', `Paths DO NOT match: ${result.path} ${redisresult.path}`);
    }

    if (result.nlink == redisresult.nlink) {
        console.debug('\x1b[32m%s\x1b[0m', `nlink match: ${result.nlink} ${redisresult.nlink}`);
    } else {
        console.debug('\x1b[31m%s\x1b[0m', `nlink DO NOT match: ${result.nlink} ${redisresult.nlink}`);
    }

    if (result.ino == redisresult.ino) {
        console.debug('\x1b[32m%s\x1b[0m', `ino match: ${result.ino} ${redisresult.ino}`);
    } else {
        console.debug('\x1b[31m%s\x1b[0m', `ino DO NOT match: ${result.ino} ${redisresult.ino}`);
    }

    if (result.size == redisresult.size) {
        console.debug('\x1b[32m%s\x1b[0m', `size match: ${result.size} ${redisresult.size}`);
    } else {
        console.debug('\x1b[31m%s\x1b[0m', `size DO NOT match: ${result.size} ${redisresult.size}`);
    }

    if (result.atimeMs == redisresult.atimeMs) {
        console.debug('\x1b[32m%s\x1b[0m', `atimeMs match: ${result.atimeMs} ${redisresult.atimeMs}`);
    } else {
        console.debug('\x1b[31m%s\x1b[0m', `atimeMs DO NOT match: ${result.atimeMs} ${redisresult.atimeMs}`);
    }

    if (result.mtimeMs == redisresult.mtimeMs) {
        console.debug('\x1b[32m%s\x1b[0m', `mtimeMs match: ${result.mtimeMs} ${redisresult.mtimeMs}`);
    } else {
        console.debug('\x1b[31m%s\x1b[0m', `mtimeMs DO NOT match: ${result.mtimeMs} ${redisresult.mtimeMs}`);
    }

    if (result.ctimeMs == redisresult.ctimeMs) {
        console.debug('\x1b[32m%s\x1b[0m', `ctimeMs match: ${result.ctimeMs} ${redisresult.ctimeMs}`);
    } else {
        console.debug('\x1b[31m%s\x1b[0m', `ctimeMs DO NOT match: ${result.ctimeMs} ${redisresult.ctimeMs}`);
    }

    if (result.birthtimeMs == redisresult.birthtimeMs) {
        console.debug('\x1b[32m%s\x1b[0m', `birthtimeMs match: ${result.birthtimeMs} ${redisresult.birthtimeMs}`);
    } else {
        console.debug('\x1b[31m%s\x1b[0m', `birthtimeMs DO NOT match: ${result.birthtimeMs} ${redisresult.birthtimeMs}`);
    }

    if (result.hash == redisresult.hash) {
        console.debug('\x1b[32m%s\x1b[0m', `hash match: ${result.hash} ${redisresult.hash}`);
    } else {
        console.debug('\x1b[31m%s\x1b[0m', `hash DO NOT match: ${result.hash} ${redisresult.hash}`);
    }
}

async function dequeueDeleteFile(file) {
    redis.delete(file);
}

async function dequeueMoveFile(src, dest) {
    await redis.rename(src, dest);
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