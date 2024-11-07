import {fileRepository, process, redis} from "./redisHelper.js";
import {dequeueCreateFile} from "./queueListener.js";



const results = await redis.hGetAll('dirt:process:jobs:652177527557600889')


console.log(results)