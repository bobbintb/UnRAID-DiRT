import {fileRepository, processQueue, redis} from "./redisHelper.js";


// const isPaused = await processQueue.get;
console.log(await processQueue.jobs())