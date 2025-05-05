import { Queue, Worker, FlowProducer } from "bullmq";
import { defaultQueueConfig, fileRepository } from "../redisHelper.js";
import { newQueue } from "./newQueue.js";

export const processQueue = new Queue("processQueue", defaultQueueConfig);
processQueue.pause();

export async function upsert(action, inode) {
	const jobs = await processQueue.getJobs(["waiting", "delayed", "active"]);
	const existingJob = jobs.find((job) => job.data === inode);
	if (existingJob) {
		await existingJob.remove();
	}
	if (action) {
		await processQueue.add(action, inode);
	}
}

const processQueueWorker = new Worker(
	"processQueue",
	async (job) => {
		console.debug("Starting processQueueWorker...");
		console.debug("processQueueWorker", job.data.input);
		switch (job.name) {
			case "delete":
				// check if original file exists in file system
				// double check if metadata in redis matches file system
				// delete file from file system
				const data = job.data.input;
				const filenames = data.path;

				const checkFilesExist = async (filenames, expectedMetadata) => {
					const results = await Promise.all(
						filenames.map(async (file) => {
							try {
								const stats = await fs.stat(file);
								const mismatchedProperties = [];

								if (stats.size !== expectedMetadata.size) mismatchedProperties.push("size");
								if (stats.mtime.getTime() !== expectedMetadata.mtime.getTime())
									mismatchedProperties.push("mtime");

								if (mismatchedProperties.length > 0) {
									console.log(
										`File ${file} failed because the following properties don't match: ${mismatchedProperties.join(
											", "
										)}`
									);
								}

								return { file, exists: true, mismatchedProperties };
							} catch {
								return { file, exists: false };
							}
						})
					);

					return results.filter((result) => result.mismatchedProperties.length > 0);
				};
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
