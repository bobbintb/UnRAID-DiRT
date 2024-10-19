import {process} from "./redisHelper.js"
import CryptoJS from 'crypto-js';

export function enqueueFileAction(action, src) {
    const jobData = {
        action: action,
        src: src
    };
    process.createJob(jobData)
        .setId(CryptoJS.MD5(src).toString())
        .save()
        .then(() => {
        })
        .catch(err => {
            console.error(`Failed to add job ${jobId}:`, err);
        });
}

