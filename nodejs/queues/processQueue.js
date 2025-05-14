import { Queue, Worker, FlowProducer } from "bullmq";
import { defaultQueueConfig, fileRepository, redis } from "../redisHelper.js";
import fs from "fs/promises";
import { getClient, sendMessageToClient } from "../dirt.js";

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
	await processQueue.obliterate();
	await redis.del("originals");
}

const processQueueWorker = new Worker(
	"processQueue",
	async (job) => {
		try {
			console.debug("Starting processQueueWorker...");
			console.debug("processQueueWorker", job.data);
		} catch (e) {
			console.error("Worker error:", e);
		}
		// this does not yet account for hardlinks
				const inode = job.data;
				const repoFile = await fileRepository.fetch(inode);
				const stats = await fs.stat(repoFile.path[0], { bigint: true });
				const og = await redis.hGet("originals", repoFile.hash);

				if (
					repoFile.atime.getTime() === stats.atime.getTime() &&
					repoFile.mtime.getTime() === stats.mtime.getTime() &&
					repoFile.ctime.getTime() === stats.ctime.getTime() &&
					Number(repoFile.size) === Number(stats.size)
				) {
					console.debug("Timestamps match");
				} else {
					console.debug("Timestamps do not match");
				}
				console.debug("repoFile.atime.getTime():            ", repoFile.atime.getTime());
				console.debug("stats.atime.getTime():               ", stats.atime.getTime());
				console.debug("repoFile.mtime.getTime():            ", repoFile.mtime.getTime());
				console.debug("stats.mtime.getTime():               ", stats.mtime.getTime());
				console.debug("repoFile.ctime.getTime():            ", repoFile.ctime.getTime());
				console.debug("stats.ctime.getTime():               ", stats.ctime.getTime());
				console.debug("repoFile.size:            ", Number(repoFile.size));
				console.debug("stats.size:               ", Number(stats.size));

		switch (job.name) {
			case "delete":
				console.debug("Deleting file:", repoFile.path[0]);
				const client = getClient('dirt.php');
				if (client && client.readyState === WebSocket.OPEN) {
					client.send(JSON.stringify({ type: "delete", text: "Are you still there?" }));
				}

				sendMessageToClient(client, "delete", repoFile.path[0]);
				

				return true;
			case "link":
				console.debug("Linking file:", repoFile.path[0]);
				// require('child_process').execSync(`ln -f source target`)

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

processQueueWorker.on("drained", async () => {
	await processQueue.pause();
});
