import Queue from "bee-queue";
import {createClient} from "redis";

export const queue = new Queue('process', {
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

export function enqueueFileAction(action, src) {
    const jobData = {
        action: action,
        src: src
    };
    queue.createJob(jobData).save();
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