import fs from "fs";
import {hashFilesInIntervals} from "./hashHelper.js"
import {fileRepository, filesOfSize, scanQueue, redis} from "./redisHelper.js";


export function enqueueDeleteFile(src) {
    console.log(src)
    const jobData = {
        task: 'delete',
        src: src
    };
    scanQueue.add(jobData);
}

export function enqueueCreateFile(src) {
    const jobData = {
        task: 'create',
        src: src
    };
    scanQueue.add(jobData);
}

export function enqueueMoveFile(src, dest) {
    const jobData = {
        task: 'move',
        src: src,
        dest: dest
    };
    scanQueue.add(jobData);
}

export async function dequeueCreateFile(file) {
    const stats = fs.statSync(file, {bigint: true});
    const size = Number(stats.size)
    const key = stats.ino.toString()
    const fileInfo = {
        path: [file],
        nlink: Number(stats.nlink),
        size: size,
        atime: stats.atime,
        mtime: stats.mtime,
        ctime: stats.ctime
    };

        // Good enough for now but inefficient. Checks if the inode exists first (hardlink) and adds it to `path`.
    if (await redis.exists('ino:' + key) === 1) {
        const existingFile = await redis.hGetAll('ino:' + key);
        // Just in case. I see duplicates in the debugger but not in normal operation.
        if (!existingFile.path === fileInfo.path) {
            fileInfo.path.push(existingFile.path);
            fileInfo.hash = existingFile.hash
            await fileRepository.save(key, fileInfo);
        }
        return
    }

    let sameSizeFiles = await filesOfSize(size)
    if (sameSizeFiles.length > 0 && sameSizeFiles[0].size !== 0) {
        sameSizeFiles.splice(0, 0, fileInfo); // adds working file to the front of the array of same size files
        const results = await hashFilesInIntervals(sameSizeFiles);
        await fileRepository.save(key, results[0])    // add the new file first
        for (const result of results.slice(1)) {
            await fileRepository.save(result)
        }
    } else {
        await fileRepository.save(key, fileInfo);
    }
}

async function dequeueDeleteFile(file) {
    console.log('dequeueDeleteFile - file')
    console.log(file)
    const entity = await fileRepository.search()
        .where('path').contains(file)
        .return.first()
    console.log('dequeueDeleteFile - entity')
    console.log(entity)
    if (entity.path.length === 1) {
        console.log('entity.path.length === 1')
        await fileRepository.remove(entity[Object.getOwnPropertySymbols(entity).find(sym => sym.description === 'entityId')]);
    } else {
        entity.path = entity.path.filter(value => value !== file);
        await fileRepository.save(entity);
    }
}

async function dequeueMoveFile(src, dest) {
    await redis.rename(src, dest);
}

// Must be called to process the queue
scanQueue.process(async (job, done) => {
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
    done();
});