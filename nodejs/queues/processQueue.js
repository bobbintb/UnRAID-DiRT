import { Queue, Worker, FlowProducer } from "bullmq";
import { defaultQueueConfig, fileRepository, redis } from "../redisHelper.js";
import fs from "fs/promises";

export const processQueue = new Queue("processQueue", defaultQueueConfig);
processQueue.pause();

export async function upsert(action, inode) {
	const jobs = await processQueue.getJobs(["waiting", "delayed"]);
	const existingJob = jobs.find((job) => job.data === inode);
	if (existingJob) {
		await existingJob.remove();
	}
	if (action) {
		await processQueue.add(action, inode);
	}
}

export async function clear() {
	await processQueue.obliterate()
	await redis.del("originals");
}

const processQueueWorker = new Worker("processQueue",
	async (job) => {
		try {
			console.debug("Starting processQueueWorker...");
			console.debug("processQueueWorker", job.data);
		  } catch (e) {
			console.error("Worker error:", e);
		  }
		
		switch (job.name) {
			case "delete":
				// check if original file exists in file system
				// double check if metadata in redis matches file system
				// delete file from file system
				const inode = job.data;
				const file = await fileRepository.fetch(inode);
				console.debug("File to be deleted", file);
				console.debug("atime", file.atime.getTime());
				console.debug("atime", (file.atime));

				const stats = await fs.stat(file.path[0]);
    			console.log("File stats:", stats);
				const og = await redis.hGet('originals', file.hash)
				console.debug("og", og);
				console.debug("file.atime", file.atime);
				console.debug("stats.atime", stats.atime);
				console.debug("stats.atimeMs", stats.atimeMs);
				if (file.atime.getTime() === stats.atime) {
					console.debug("Timestamps match");
				} else {
					console.debug("Timestamps do not match");
				}


				// const checkFilesExist = async (filenames, expectedMetadata) => {
				// 	const results = await Promise.all(
				// 		filenames.map(async (file) => {
				// 			try {
				// 				const stats = await fs.stat(file);
				// 				const mismatchedProperties = [];

				// 				if (stats.size !== expectedMetadata.size) mismatchedProperties.push("size");
				// 				if (stats.mtime.getTime() !== expectedMetadata.mtime.getTime())
				// 					mismatchedProperties.push("mtime");

				// 				if (mismatchedProperties.length > 0) {
				// 					console.log(
				// 						`File ${file} failed because the following properties don't match: ${mismatchedProperties.join(
				// 							", "
				// 						)}`
				// 					);
				// 				}

				// 				return { file, exists: true, mismatchedProperties };
				// 			} catch {
				// 				return { file, exists: false };
				// 			}
				// 		})
				// 	);

				// 	return results.filter((result) => result.mismatchedProperties.length > 0);
				// };
				return true;
		}
	},
	defaultQueueConfig
);

processQueueWorker.on("completed", (job) => {
	console.debug(`Job ${job.name} completed.`);
});

processQueueWorker.on("failed", (job, err) => {
	console.error(`Job ${job.name} failed:`, err);
});

processQueueWorker.on('drained', async () => {
	await processQueue.pause();
  });