import { Queue, Worker, FlowProducer } from "bullmq";
import * as scan from "../scan.js";
import { defaultQueueConfig, fileRepository, filesOfSize } from "../redisHelper.js";
import { fileQueue } from "./fileQueue.js";
import { hashQueue } from "./hashQueue.js";

export const scanQueue = new Queue("scanQueue", defaultQueueConfig);
const flowProducer = new FlowProducer(defaultQueueConfig);

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

async function removeUniques(job) {
    console.debug("    Starting file filtering...");
				const filesData = Object.values(await job.getChildrenValues())[0];
                console.debug(`        filesData: ${JSON.stringify(filesData)}`);
                console.debug("        Querying redis for files of the same size...");
                const filesDataWithRedis = await Promise.all(
                    filesData.map(async ([size, files]) => {
                        const redisResults = await filesOfSize(size);
                        console.debug(`        Redis Results for size ${size}: ${redisResults}`);
                        return [size, [...files, ...redisResults]];
                    })
                );

                console.debug(`        filesDataWithRedis: ${JSON.stringify(filesDataWithRedis)}`);

				// Transform single file groups to flatten structure and include size
				const singleFileItems = filesDataWithRedis
					.filter(([_, files]) => files.length === 1)
					.map(([size, files]) => ({
						...files[0], // spread the first (and only) file's properties
						size, // add the size property
					}));
                
                console.debug(`        singleFileItems: ${JSON.stringify(singleFileItems)}`);

				const multiFileGroups = filesDataWithRedis.filter(([_, files]) => files.length > 1);

                console.debug(`        multiFileGroups: ${JSON.stringify(multiFileGroups)}`);
                console.debug("        Sending single file items to fileQueue...");

				await fileQueue.addBulk(
					singleFileItems.map((item) => ({
						name: "upsert",
						data: item
					}))
				);

                console.debug("        Sending multi file items to hashQueue...");
                await hashQueue.addBulk(
					multiFileGroups.map((group) => ({
						name: "hash",
						data: group
					}))
				);
                console.debug("    done.");
}

const scanQueueWorker = new Worker(
	"scanQueue",
	async (job) => {
		console.debug("Starting scanQueueWorker...");
		switch (job.name) {
			case "removeShares":
				// I don't think this will work if stuff is being hashed
				console.debug("    Removing shares...");
				const paths = job.data.paths;
				for (const path of paths) {
					await fileRepository.removePathsStartingWith(path);
				}
				return true;

			case "getAllFiles":
				console.debug("    Starting file scan...");
				let results = scan.getAllFiles(job.data.input);
                console.debug("    done.");
				return [...results.entries()];

			case "removeUniques":
				removeUniques(job);
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
