import {fileRepository, processQueue, redis} from "./redisHelper.js";


// const isPaused = await processQueue.get;
await redis.del('dirt:process:og').then(result => {
    redis.quit();
})