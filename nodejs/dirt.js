import * as scan from "../nodejs/scan.js";
import { findDuplicateHashes, redis, filesOfSize, removePathsStartingWith } from "./redisHelper.js";
import fs from "fs";
import { addSharesFlow, removeSharesJob } from "./queues/scanQueue.js";
import { WebSocketServer } from "ws";
import { processQueue, upsert, clear } from "./queues/processQueue.js";

const dirt = new WebSocketServer({ port: 3000, host: "0.0.0.0" });
const clients = new Map();

const plugin = "bobbintb.system.dirt";
const configFile = `/boot/config/plugins/${plugin}/${plugin}.cfg`;
var settings = loadSettings(configFile);

/**
 * Loads settings from a configuration file.
 * @param {string} file - The path to the configuration file.
 * @returns {object} The settings object.
 */
function loadSettings(file) {
	createDefaultConfig(file);
	const data = fs.readFileSync(file, "utf8");
	const settings = {};
	data.split(/\r?\n/).forEach((line) => {
		const [key, value] = line.split("=").map((item) => item.replace(/^"|"$/g, ""));
		if (key && value !== undefined) {
			settings[key] = value.includes(",") ? value.split(",").map((item) => item.replace(/^"|"$/g, "")) : value;
		}
	});
	return settings;
}

/**
 * Creates a default configuration file if one does not exist.
 * @param {string} filePath - The path to the configuration file.
 */
function createDefaultConfig(filePath) {
	if (!fs.existsSync(filePath)) {
		fs.writeFileSync(
			filePath,
			`share=""\ndatetime_format="f"\ndbdir="/boot/config/plugins/${plugin}/"
`
		);
	}
}

/**
 * Loads initial data for the client, including duplicate hashes, settings, and queued jobs.
 * @returns {Promise<object>} An object containing the initial data.
 */
async function load() {
	const settings = loadSettings(configFile);
	const ogs = await redis.hGetAll("originals");
	const jobs = (await processQueue.getJobs("paused")).map((job) => ({ name: job.name, data: job.data }));
	try {
		const result = await findDuplicateHashes();
		return {
			result: result,
			datetime_format: settings.datetime_format,
			jobs: jobs,
			ogs: ogs,
		};
	} catch (error) {
		console.error(error);
		return { error: "Internal Server Error" };
	}
}

/**
 * Retrieves files of a specific size.
 * @param {number} data - The size of the files to retrieve.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of file objects.
 */
async function newproc(data) {
	return await filesOfSize(data);
}

/**
 * Handles new WebSocket connections.
 * @param {WebSocket} ws - The WebSocket instance for the connection.
 * @param {import('http').IncomingMessage} req - The HTTP request object.
 */
dirt.on("connection", async (ws, req) => {
	const queryParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
	const clientId = queryParams.get("clientId");
	// Close existing connections if the same client is already connected. Fixes page reloading issue.
	if (clients.has(clientId)) {
		const existingConnection = clients.get(clientId);
		existingConnection.close();
		console.log(`Closed existing connection for client ${clientId}`);
	}
	clients.set(clientId, ws);
	switch (clientId) {
	case "dirt.php":
		const raw = await load();
		const data = JSON.stringify({ type: "load", ...raw });
		const client = clients.get(clientId);
		client.send(data);
		break;
}



	ws.on("message", async (message) => {
		try {
			const { clientId, action, data } = JSON.parse(message);
			clients.set(clientId, ws);
			const key = `${clientId}:${action}`;
			switch (key) {
				// complete
				case "dirtSettings.page:addShare":
					console.debug("dirt.js: adding shares");
					addSharesFlow(data);
					break;
				// complete
				case "dirt.php:addToOriginals":
					console.debug(`addToOriginals: ${JSON.stringify(data)}`);
					await redis.hSet("originals", data.hash, data.path);
					break;
				// complete
				case "dirt.php:clearProcessQueue":
					console.log("Clearing queue...");
					clear();
					break;
				// complete
				case "dirt.php:addToProcessQueue":
					console.debug(`addToProcessQueue: ${JSON.stringify(data)}`);
					await upsert(data.action, data.inode);
					break;

				case "dirt.php:process":
					console.debug("dirt.php:process");
					processQueue.resume();
					break;
				case "dirtSettings.page:removeShare":
					// This should probably be added to the queue, on the off chance that the user is removing a share while the scan is running.
					console.error("removeShare");
					removeSharesJob(data);
					break;

				case "ebpf:remove":
					console.debug("");
					break;
				case "ebpf:add":
					console.debug("");
					break;
				case "ebpf:move":
					console.debug("");
					break;

				// case "dirtSettings.page:scan":
				// 	console.log("scan");
				// 	scanStart(data);
				// 	break;
				case "dirtSettings.page:test":
					const result = await newproc(0);
					console.debug("Test result:", result);
					break;
				default:
					console.log(`Unknown message action: ${action}`);
					console.log(JSON.stringify(message));
					ws.send(JSON.stringify({ error: "Unknown message action" }));
			}
		} catch (error) {
			ws.send(JSON.stringify({ error: `Invalid message format: ${message}` }));
		}
	});

	ws.on("close", () => {
		clients.delete(clientId);
	});
});

/**
 * Gets a client from the clients map.
 * @param {string} id - The ID of the client to get.
 * @returns {WebSocket} The client's WebSocket connection.
 */
export const getClient = (id) => clients.get(id);


/**
 * Sends a message to a specific client.
 * @param {WebSocket} client - The client to send the message to.
 * @param {string} type - The type of the message.
 * @param {*} message - The message payload.
 */
export const sendMessageToClient = (client, type, message) => {
  if (client.readyState === WebSocket.OPEN) {
	client.send(JSON.stringify({ type: type, message }));
    // client.send(message);
  }
};

console.log("WebSocket server running on ws://127.0.0.1:3000");
console.log("Settings:");
console.log(settings);

process.on("SIGINT", () => {
	redis.quit(() => {
		console.log("Redis connection closed");
		process.exit(0); // Graceful shutdown
	});
});
