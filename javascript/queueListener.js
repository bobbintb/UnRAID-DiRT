import fs from "fs";
import Redis from "ioredis"; // remove this
import Queue from 'bee-queue';
import {processFiles} from "../nodejs/addFile.js";
import * as test from "./hashHelper.js"
import * as readline from "node:readline";


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
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
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
    let sameSizeFiles = await test.searchBySize(stats.size);
    console.debug('\x1b[96m%s\x1b[0m','========================================================================');
    console.debug(`file: ${file}`);
    console.debug(fileInfo);
    console.debug('sameSizeFiles:');
    console.debug(sameSizeFiles);
    if (sameSizeFiles.length > 0){
        let files = sameSizeFiles
        files.splice(0, 0, fileInfo) // adds working file to the front of the array of same size files
        const results = await test.hashFilesInIntervals(files)
        //const pipeline = redis.pipeline();
        //await pipeline.hset(file, sameSizeFiles[0]);
        redis.hset(file, sameSizeFiles[0]);
        //.log('files')
        //console.log(files.length)
        //console.log(files)
        //await pauseForUserInput('press Enter to continue.');

        for (const result of results) {
            //await pipeline.hset(result.path, 'hash', result.hash);
            redis.hset(result.path, 'hash', result.hash);
            console.log('result')
            console.log(result)
            console.debug('This should match the above!:');
            console.debug(await redis.hgetall(result))
            //console.log('hash')
            //console.log(hash)  // where is this coming from? should be literal text but it shows multiple values.
            //console.log('result.hash')
            //console.log(result.hash) // why is this NaN% (0 bytes)


        }
        //await pipeline.exec();

        //console.log('Pipeline execution results:', execResults);
    } else {
        console.debug('Only one files of that size. Adding to Redis:');
        console.debug(fileInfo)
        await redis.hset(file, fileInfo);
        console.debug('This should match the above!:');
        const redisresult = await redis.hgetall(file)
        console.debug(await redis.hgetall(file))
        for (const key of fileInfo) {
            if (fileInfo[key] !== redisresult[key]) {
                console.debug('NO MATCH!');
            } else
                console.debug('MATCH!');
        }

        //await redis.hset('key', 'field', Buffer.from('value'));

    }
}

function pauseForUserInput(message) {
    return new Promise((resolve) => {
        console.log(message);
        rl.question('Press Enter to continue...', () => {
            resolve();
        });
    });
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