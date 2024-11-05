import {fileRepository, process, redis} from "./redisHelper.js";
import {dequeueCreateFile} from "./queueListener.js";



const results = await fileRepository.search().where('action').eq('link').return.all();


console.log(results)