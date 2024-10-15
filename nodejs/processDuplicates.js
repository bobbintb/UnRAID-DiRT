import {queue} from "./redisHelper.js"

export function enqueueFileAction(action, src) {
    const jobData = {
        action: action,
        src: src
    };
    queue.createJob(jobData).save();
}

