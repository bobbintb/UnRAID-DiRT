import {fileRepository} from "./redisHelper.js";
import {dequeueCreateFile} from "./queueListener.js";

// const fileInfo = {
//     path: ["/mnt/user/downloads/aaaaa2.mkv"],  // get rid of path
//     nlink: Number(3),
//     //ino: stats.ino.toString(),
//     size: Number(12779642545),
//     atimeMs: Number(1651538358526),
//     mtimeMs: Number(1651539803854),
//     ctimeMs: Number(1725219303278)
// };
// for (const [key, value] of Object.entries(fileInfo)) {
//     console.log(`${key}: ${typeof value}`);
// }
// const key = '649362771271510040'



// const result = await redis.hGetAll("ino:649362771271510040")
console.log(await dequeueCreateFile('/mnt/user/downloads/New Text Document.txt'))