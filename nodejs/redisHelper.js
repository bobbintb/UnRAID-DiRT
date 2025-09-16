import { AggregateGroupByReducers, AggregateSteps, createClient } from "redis";
import { Repository, Schema } from "redis-om";

/**
 * @typedef {import('redis-om').Schema} Schema
 */

/**
 * The default configuration for the message queues.
 * @type {object}
 * @property {object} connection - The connection options for Redis.
 * @property {string} connection.host - The host of the Redis server.
 * @property {number} connection.port - The port of the Redis server.
 * @property {string} prefix - The prefix for all queue keys.
 * @property {object} defaultJobOptions - The default options for jobs.
 * @property {boolean} defaultJobOptions.removeOnComplete - Whether to remove jobs when they complete successfully.
 */
export const defaultQueueConfig = {
	connection: {
        host: 'localhost',
        port: 6379
    },
	prefix: "queues",
	defaultJobOptions: {
        removeOnComplete: true
    }
};

/**
 * The Redis client instance.
 * @type {import('redis').RedisClientType}
 */
export const redis = await (async () => {
	const client = await createClient();
	await client.connect();
	return client;
})();

/**
 * The schema for file metadata in Redis.
 * @type {Schema}
 */
export const fileMetadataSchema = new Schema(
	"ino",
	{
		path: { type: "string[]" },
		size: { type: "number" },
		nlink: { type: "number" },
		atime: { type: "date" },
		mtime: { type: "date" },
		ctime: { type: "date" },
		hash: { type: "string" },
		action: { type: "string" },
	},
	{
		dataStructure: "HASH",
	}
);

/**
 * The repository for interacting with file metadata in Redis.
 * @type {import('redis-om').Repository}
 */
export const fileRepository = await (async () => {
	const repo = new Repository(fileMetadataSchema, redis);
	await repo.createIndex();
	return repo;
})();

/**
 * Finds all files of a given size.
 * @param {number} size - The size of the files to find.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of file objects.
 */
export async function filesOfSize(size) {
	return await fileRepository.search().where("size").equals(size).return.all();
}

/**
 * Finds all duplicate file hashes in the repository.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of duplicate file objects.
 * @throws {Error} If there is an error running the aggregation.
 */
export async function findDuplicateHashes() {
	try {
		await fileRepository.createIndex();
		const result = await redis.ft.aggregate("ino:index", "*", {
			LOAD: ["@hash"],
			STEPS: [
				{
					type: AggregateSteps.FILTER,
					expression: "exists(@hash)",
				},
				{
					type: AggregateSteps.GROUPBY,
					properties: ["@hash"],
					REDUCE: [
						{
							type: AggregateGroupByReducers.COUNT,
							property: "@hash",
							AS: "nb_of_files",
						},
					],
				},
				{
					type: AggregateSteps.SORTBY,
					BY: {
						BY: "@nb_of_files",
						DIRECTION: "DESC",
					},
				},
				{
					type: AggregateSteps.FILTER,
					expression: "@nb_of_files > 1",
				},
				{
					type: AggregateSteps.LIMIT,
					from: 0,
					size: 10000,
				},
			],
		});

		const hashes = result.results.map((group) => group.hash); // Assuming group.hash contains an object

		const resultsArray = await Promise.all(
			hashes.map((hash) =>
				fileRepository
					.search()
					.where("hash")
					.eq(hash)
					.return.all()
					.then((entities) => ({
						hash,
						documents: entities.map((entity) => {
							return {
								id: entity[Object.getOwnPropertySymbols(entity).find((sym) => sym.description === "entityId")],
								...entity, // Spread the properties of the entity
							};
						}),
					}))
			)
		);

		// const formattedResults = resultsArray.flatMap(({ hash, documents }) =>
		//     documents.map(doc => ({
		//         ...doc,    // Spread document properties (e.g., id, path, size, etc.)
		//         hash      // Add the hash as a separate field for grouping in Tabulator
		//     }))
		// );
		return resultsArray.flatMap((result) => result.documents); // Return array format suitable for Tabulator
	} catch (error) {
		console.error("Error running aggregation:", error);
		throw error;
	}
}

/**
 * Gets the entity ID from a Redis OM entity.
 * @param {object} entity - The Redis OM entity.
 * @returns {string} The entity ID.
 */
function getEntityId(entity) {
	return entity[Object.getOwnPropertySymbols(entity).find((sym) => sym.description === "entityId")];
}

/**
 * Removes all paths starting with a given prefix from the file repository.
 * @param {string} sharePrefix - The prefix of the paths to remove.
 * @returns {Promise<void>} A promise that resolves when the paths have been removed.
 */
export async function removePathsStartingWith(sharePrefix) {
	// console.debug('Removing paths starting with:', before);
	var entities = await fileRepository.search().where("path").contains(`${sharePrefix}*`).return.all();
	// console.debug('Entities found:', entities);
	while (entities.length > 0) {
		console.debug("length:", entities.length);
		for (const entity of entities) {
			const updatedPaths = entity.path.filter((p) => !p.startsWith(sharePrefix));
			// console.debug('Updated paths:', updatedPaths);

			if (updatedPaths.length > 0) {
				await fileRepository.save({ ...entity, path: updatedPaths });
			} else {
				const test = await fileRepository.fetch(getEntityId(entity));
				console.debug("Test:", test);
				await fileRepository.remove(getEntityId(entity));
			}
		}
		entities = await fileRepository.search().where("path").contains(`${sharePrefix}*`).return.all();
		console.debug("Entities found:", entities);
	}
}
