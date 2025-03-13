import * as scan from '../nodejs/scan.js';
import {enqueueFileAction} from "./processDuplicates.js";
import {findDuplicateHashes, processQueue, redis, removePathsStartingWith, scanQueue} from "./redisHelper.js";
import fs from "fs";
import { WebSocketServer } from 'ws';

const dirt = new WebSocketServer({ port: 3000, host: '0.0.0.0' });

const clients = new Map();

const plugin = 'bobbintb.system.dirt';
const settings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);

function compareShares() {
    const oldShares = settings.share
    const newSettings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);
    const newShares = newSettings.share
    const added = newShares.filter(x => !oldShares.includes(x));
    const removed = oldShares.filter(x => !newShares.includes(x));
    Object.assign(settings, newSettings);
    return { added, removed };
}

function loadSettings(file) {
    const data = fs.readFileSync(file, 'utf8');
    const settings = {};
    data.split(/\r?\n/).forEach(line => {
        const [key, value] = line.split('=').map(item => item.replace(/^"|"$/g, ''));
        if (key && value !== undefined) {
            settings[key] = value.includes(',') ? value.split(',').map(item => item.replace(/^"|"$/g, '')) : value;
        }
    });
    return settings;
}

function sharesUpdated() {
    const { added, removed } = compareShares();
    removed.forEach(element => removeShare(element));
    const results = added.map(getAllFiles);
    results.forEach(hashFilesInIntervals);
}

async function removeShare (messageData) {
    console.log(messageData);
    messageData.forEach(share=>{
        console.log((share))
    });
    removePathsStartingWith()
};

async function addToProcessQueue (message) {
    enqueueFileAction(message)
};

async function processStart () {
    await processQueue.resume()
    await processQueue.pause()
};

async function clear () {
    console.log('clearing')
    await processQueue.obliterate()
    await redis.del('dirt:process:og').then(result => {
    })
};

async function scanStart (data) {
    console.log('Starting scan...')
    console.time('scan');
    for (const share of data) {
        scan.getAllFiles(`/mnt/user/${share}`);
    }
    console.log('Scan complete.')
    console.timeEnd('scan');
    console.debug("Saving files to database.");
    console.debug("Done saving files to database.");
}

async function loadTableData() {
    const ogs = await redis.hGetAll("dirt:process:og")
    const jobs = (await processQueue.getJobs('paused')).reduce((acc, job) => {
        acc[job.id] = job.data.action;
        return acc;
    }, {});
    
    try {
        const result = await findDuplicateHashes();
        return {
            result: result,
            datetime_format: settings.datetime_format,
            jobs: jobs,
            ogs: ogs
        };
    } catch (error) {
        console.error(error);
        return{ error: 'Internal Server Error' };
    }
}

dirt.on('connection', async (ws, req) => {
    const queryParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const clientId = queryParams.get('clientId');
    // Close existing connections if the same client is already connected. Fixes page reloading issue.
    if (clients.has(clientId)) {
        const existingConnection = clients.get(clientId);
        existingConnection.close();
        console.log(`Closed existing connection for client ${clientId}`);
      }
    clients.set(clientId, ws);
    switch (clientId) {
        case "dirt.php":
            const data = JSON.stringify(await loadTableData());
            const client = clients.get(clientId);
            client.send(data);
            break;
    }

    ws.on('message', (message) => {
        try {
            const { clientId, type, data } = JSON.parse(message);
            clients.set(clientId, ws);
            const key = `${clientId}:${type}`;
            switch (key) {
                case "dirtSettings.page:scan":
                    console.log("scan");
                    scanStart(data);
                    break;
                case "dirtSettings.page:removeShare":
                    removeShare(data);
                    break;
                case "dirt.php:addToProcessQueue":
                    addToProcessQueue(data);
                    break;
                case "dirt.php:process":
                    processStart();
                    break;
                case "dirt.php:clear":
                    console.log("Clearing queue...")
                    clear();
                    break;
                default:
                    ws.send(JSON.stringify({ error: "Unknown message type" }));
                    }
        } catch (error) {
            ws.send(JSON.stringify({ error: `Invalid message format: ${message}` }));
        }
    });
    
    ws.on('close', () => {
        clients.delete(clientId);
    });
});


console.log('WebSocket server running on ws://127.0.0.1:3000');

process.on('SIGINT', () => {
    redis.quit(() => {
        console.log('Redis connection closed');
        process.exit(0); // Graceful shutdown
    });
});