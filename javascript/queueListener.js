import fs from "fs";
import redis from "redis";
import Queue from "bee-queue";

const queue = new Queue('my-queue', {
    redis: {
        host: '192.168.1.2'
    }
});
const redisClient = redis.createClient({
    host: '192.168.1.2',
    db: 1
});


function addFile(file) {
    const stats = fs.statSync(file, { bigint: true });
    const fileInfo = {
        path: file,
        nlink: Number(stats.nlink),
        ino: stats.ino.toString(),
        size: Number(stats.size),
        atimeMs: Number(stats.atimeMs),
        mtimeMs: Number(stats.mtimeMs),
        ctimeMs: Number(stats.ctimeMs),
        birthtimeMs: Number(stats.birthtimeMs)
    };
    const fileInfoKey = `file:${file}`;
    redisClient.hset(fileInfoKey, fileInfo, (err, reply) => {
        if (err) {
            console.error('Error saving to Redis:', err);
        } else {
            console.log('File info saved to Redis:', reply);
        }
    });
}


queue.process(function (job, done) {
    console.log(`Processing job ${job.id}`);
    return done(null, job.data.x + job.data.y);
});