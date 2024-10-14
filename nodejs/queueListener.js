import fs from "fs";
import * as test from "./hashHelper.js"
import {fileRepository, filesOfSize, queue, redis} from "./redisHelper.js";


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
    const size = Number(stats.size)
    const fileInfo = {
        path: [file],
        nlink: Number(stats.nlink),
        size: size,
        atimeMs: Number(stats.atimeMs),
        mtimeMs: Number(stats.mtimeMs),
        ctimeMs: Number(stats.ctimeMs)
    };

    let sameSizeFiles = await filesOfSize(size)
    if (sameSizeFiles.length > 0) {
        console.log('checkpoint 3 - sameSizeFiles')
        console.log(sameSizeFiles)
        let files = sameSizeFiles;
        files.splice(0, 0, fileInfo); // adds working file to the front of the array of same size files
        console.log('checkpoint 4')
        const results = await test.hashFilesInIntervals(files);
        console.log('checkpoint 5')

        const pipeline = redis.multi(); // 'pipeline' in node-redis is 'multi'
        console.log('checkpoint 6')
        await pipeline.hSet(file, sameSizeFiles[0]);

        for (const result of results) {
            await pipeline.hSet(result.path, 'hash', result.hash);
        }
        await pipeline.exec();
    } else {
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

    }
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