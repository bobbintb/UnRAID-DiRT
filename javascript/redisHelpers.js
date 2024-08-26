import Queue from 'bee-queue';

const queue = new Queue('my-queue', {
    redis: {
        host: '192.168.1.2',
        port: 6379
    }
});

export function queueDeleteFile(src) {
    const jobData = {
        task: 'delete',
        src: src
    };
    queue.createJob(jobData).save();
}

export function queueMoveFile(src, dest) {
    const jobData = {
        task: 'move',
        src: src,
        dest: dest
    };
    queue.createJob(jobData).save();
}