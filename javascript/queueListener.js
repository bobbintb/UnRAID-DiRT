import fs from "fs";
import Redis from "ioredis";
import Queue from 'bee-queue';
import {processFiles} from "./addFile.js";


export const queue = new Queue('dedupe', {
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        options: {},
    },
    removeOnSuccess: true
});

const data = new Redis({ db: 1 });
const index = new Redis({ db: 2 });

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
    const sameSize = await index.zrange("sortedSet", stats.size, stats.size, "BYSCORE");
    if (sameSize.length > 0) {
        sameSize.push(file)
        console.debug('files of the same size')
        console.debug(sameSize)
        console.debug('processing for dupes')
        const results = await processFiles(sameSize);
        if (results.length > 0) {
            fileInfo.hash = results[0].hash;
            console.debug('*********')
            console.debug(results[0].hash)
            console.debug(results[0].file)
            console.debug('*********')
            for (const { file, hash } of results.slice(1)) {
                console.debug(file)
                console.debug(hash)
                await data.hset(file, 'hash', hash);
            }
            console.debug(results)
            console.debug('+++++++++++++++++++++++++++++++++++++++++++++++++++++')
        }
    }
    console.debug(fileInfo)

    await data.hset(file, fileInfo);
    await index.zadd("sortedSet", stats.size, file);
}


queue.process(async (job) => {
    switch (job.data.task) {
        case 'create':
            await dequeueCreateFile(job.data.src)
            break;
        case 'move':
            break;
        case 'delete':
            break;
    }
    return job.data.x + job.data.y;
});