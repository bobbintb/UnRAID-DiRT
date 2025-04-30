import { Queue, Worker, FlowProducer } from "bullmq";
import * as scan from "../scan.js";
import { defaultQueueConfig, fileRepository } from "../redisHelper.js";
import { fileQueue } from "./fileQueue.js";
import { hashQueue } from "./hashQueue.js";


// Create queue with connection config and prefix
export const scanQueue = new Queue("scanQueue", defaultQueueConfig);

// Create a flow producer with connection config and prefix
const flowProducer = new FlowProducer(defaultQueueConfig);

// step 1: Scan all files in the given directories
// step 2: For each size group, query redis for other files with the same size
// step 3: If the group has only one file, add it to redis.
// step 4: If the group has more than one file, hash the files in intervals and add them to redis.

// TODO: need to account for a file in the new share being a hardlink to a file in the old share

export async function addSharesFlow(dirPaths) {
	console.debug("scanQueueListener.js: addShares() called with dirPaths:", dirPaths);
	await flowProducer.add({
		name: "scanQueue-flow",
		queueName: "scanQueue",
		children: [
			{
				name: "removeUniques",
				queueName: "scanQueue",
				data: {},
				children: [
					{
						name: "getAllFiles",
						queueName: "scanQueue",
						data: {
							input: dirPaths,
						},
					},
				],
			},
		],
	});
}

export async function removeSharesJob(dirPaths) {
	await scanQueue.add("removeShares", { paths: dirPaths });
}

// Worker uses the same queue name and config to ensure consistent prefix
const scanQueueWorker = new Worker(
	"scanQueue",
	async (job) => {
		console.debug("starting worker...");
		switch (job.name) {
			case "removeShares":
				console.debug("Removing shares...");
				const paths = job.data.paths;
				for (const path of paths) {
					await fileRepository.removePathsStartingWith(path);
				}
				return true;

			case "getAllFiles":
				console.debug("Starting file scan...");
				let results = scan.getAllFiles(job.data.input);
				return [...results.entries()];

			case "removeUniques":
				console.debug("Removing unique files...");
				const filesData = Object.values(await job.getChildrenValues())[0];
				// Transform single file groups to flatten structure and include size
				const singleFileItems = filesData
					.filter(([_, files]) => files.length === 1)
					.map(([size, files]) => ({
						...files[0], // spread the first (and only) file's properties
						size, // add the size property
					}));

				const multiFileGroups = filesData.filter(([_, files]) => files.length > 1);



				await fileQueue.addBulk(
					singleFileItems.map((item) => ({
						name: "upsert",
						data: item
					}))
				);

                await hashQueue.addBulk(
					multiFileGroups.map((group) => ({
						name: "hash",
						data: group
					}))
				);
		}
	},
	defaultQueueConfig
);

scanQueueWorker.on("completed", (job) => {
	console.debug(`Job ${job.name} completed.`);
});

scanQueueWorker.on("failed", (job, err) => {
	console.error(`Job ${job.name} failed:`, err);
});
