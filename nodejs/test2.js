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
console.log('test')
processQueue.process(async (job, done) => {
    console.log(`Processing job ${job.id}`);
    done();
})
console.log('test')
// const newjob = await processQueue.add({ foo: 'bar' }, { jobId: 'unique-job-id' });
const newjob = await processQueue.isPaused;

console.log(newjob)
// await processQueue.process(function (job, done) {
    // Processors can also return promises instead of using the done callback
    // return done();
// });