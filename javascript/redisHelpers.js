import Queue from 'bee-queue';

const queue = new Queue('my-queue', {
    redis: {
        host: '192.168.1.2',
        port: 6379
    }
});

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

function dequeueCreateFile(job) {

    async function createHash() {
        await client.hSet('user:1000', {
            name: 'John Doe',
            age: '30',
            email: 'john@example.com'
        });
        console.log('Hash created');
    }


    if (stats !== undefined) {
        const jobData = {
            task: 'create',
            src: src,
            stats: stats
        };
        queue.createJob(jobData).save();
    } else {
        const jobData = {
            task: 'create',
            src: src
        };
        queue.createJob(jobData).save();
    }
}
