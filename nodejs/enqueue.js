import fs from "fs";
import {hashFilesInIntervals} from "./hashHelper.js"
import {fileRepository, filesOfSize, scanQueue, redis} from "./redisHelper.js";

// combine all these to just add to the queue and create a `task` parameter
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