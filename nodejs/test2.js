import Queue from "bull";
console.log('test')
const processQueue = await new Queue('process', {
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        options: {},
    },
    prefix: 'dirt',
    defaultJobOptions: {
        removeOnComplete: true
    }
});
const jobs = (await processQueue.getJobs('paused')).reduce((acc, job) => {
    acc[job.id] = job.data.action;
    return acc;
}, {});
console.log(jobs)