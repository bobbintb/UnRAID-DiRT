import {fileRepository, process, redis} from "./redisHelper.js";
import {dequeueCreateFile} from "./queueListener.js";



const results = await redis.hGetAll('dirt:process:og')
const test = await process.getJobs('waiting', {start: 0, end: 25});

console.log(test)