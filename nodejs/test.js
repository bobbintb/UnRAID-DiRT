import {fileRepository, process, redis} from "./redisHelper.js";
import {dequeueCreateFile} from "./queueListener.js";



const results = await redis.hGetAll('dirt:process:og')


console.log(results)