import {process} from "./redisHelper.js"

export function enqueueFileAction(action, src) {
    const jobData = {
        action: action,
        src: src
    };
    process.createJob(jobData).save();
}

