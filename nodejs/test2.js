import {fileRepository, processQueue, redis} from "./redisHelper.js";
import {dequeueCreateFile} from "./queueListener.js";

processQueue.getJobs('waiting').then((jobs) => {
    jobs.forEach((job) => {
        // console.log(`Job ID: ${job.id}, Data: ${JSON.stringify(job.data)}`);
        console.log(`action: ${JSON.stringify(job.data.action)}`);
        console.log(`path: ${JSON.stringify(job.data.path)}`);
    });
}).catch((err) => {
    console.error('Error fetching jobs:', err);
});

// await fileRepository.remove(file);
// let file = await fileRepository.fetch('11540474084581453')
// console.log(file)
// console.log(file.path[0])