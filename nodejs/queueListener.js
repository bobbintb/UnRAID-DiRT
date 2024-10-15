import fs from "fs";
import {hashFilesInIntervals} from "./hashHelper.js"
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

export async function dequeueCreateFile(file) {
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
        let files = sameSizeFiles;
        files.splice(0, 0, fileInfo); // adds working file to the front of the array of same size files
        const results = await hashFilesInIntervals(files);
        // let pipeline = redis.multi();
        console.log('checkpoint 6')
        await redis.hSet(file, sameSizeFiles[0]);    // add the new file first
        for (const result of results.slice(1)) {
            await redis.hSet(result[Object.getOwnPropertySymbols(result).find(sym => sym.description === 'entityKeyName')], 'hash', result.hash);
        }
        console.log('checkpoint 7')
        // await pipeline.exec();
        console.log('checkpoint 8')


    } else {
        const key = stats.ino.toString()
        try {
            // Good enough for now but inefficient. Checks if the inode exists first (hardlink) and adds it to `path`.
            if (await redis.exists('ino:' + key) === 1) {
                const existingPath = await redis.hGet('ino:' + key, 'path');
                fileInfo.path.push(existingPath);
            }
            await fileRepository.save(key, fileInfo);
        } catch (error) {
            console.error('Error saving file info:', error);
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