import express from 'express';
import * as scan from '../nodejs/scan.js';
import {enqueueFileAction} from "./processDuplicates.js";
import {findDuplicateHashes, processQueue, redis, removePathsStartingWith, scanQueue} from "./redisHelper.js";
import fs from "fs";
import * as url from 'url';

import {dirtySock} from "./socket.js";
import {dequeueCreateFile, enqueueCreateFile, enqueueDeleteFile, enqueueMoveFile} from "./queueListener.js";
import path from "path";
import { WebSocketServer } from 'ws';

const dirt = new WebSocketServer({ port: 3000, host: '0.0.0.0' });

const clients = new Map();

const plugin = 'bobbintb.system.dirt';
// const app = express();

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
    // const shares = (Array.isArray(settings.share) ? settings.share : [settings.share])
    // .map(share => `/mnt/user/${share}`);
    // for (const share of shares) {
    //     await scan.getAllFiles(share);
    }
    console.log('Scan complete.')
    console.timeEnd('scan');
    console.debug("Saving files to database.");
    console.debug("Done saving files to database.");
}

async function load() {
    const settings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);
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
            const data = JSON.stringify(await load());
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
// app.use(express.json()); // Middleware to parse JSON bodies

// app.use((req, res, next) => {
    //     res.header('Access-Control-Allow-Origin', '*');
    //     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    //     res.header('Access-Control-Allow-Methods', 'POST'); // Ensure POST is included
    //     next();
    // });
    
    
    // called from dirtSettings.page
    // app.get("/dirt/scan", async () => {
        //     console.log('Starting scan...')
        //     console.time('scan');
        //     const shares = (Array.isArray(settings.share) ? settings.share : [settings.share])
        //         .map(share => `/mnt/user/${share}`);
        //     for (const share of shares) {
            //         await scan.getAllFiles(share);
            //     }
            //     console.log('Scan complete.')
            //     console.timeEnd('scan');
            //     console.debug("Saving files to database.");
            //     console.debug("Done saving files to database.");
            // });
            
            
            // called from dirtSettings.page
            // app.get('/dirt/load', async (req, res) => {
                //     const settings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);
                //     const ogs = await redis.hGetAll("dirt:process:og")
                //     const jobs = (await processQueue.getJobs('paused')).reduce((acc, job) => {
                    //         acc[job.id] = job.data.action;
                    //         return acc;
//     }, {});

//     try {
    //     const result = await findDuplicateHashes();
    //       res.json({
//           result: result,
//           datetime_format: settings.datetime_format,
//           jobs: jobs,
//           ogs: ogs
//       });
//   } catch (error) {
    //     console.error(error);
    //     res.status(500).json({ error: 'Internal Server Error' });
    //   }
    // });
    
    // called from dirtSettings.page
    // app.post("/dirt/removeShare", async (req, res) => {
        //     console.log(req);
        //     req.body.forEach(share=>{
//         console.log((share))
//     });
//     // removePathsStartingWith()
// });

// // called from dirt.php
// app.post("/dirt/addToProcessQueue", (req, res) => {
    //     enqueueFileAction(req.body)
    //     res.send();
    // });
    
    // app.get("/dirt/process", async () => {
        //     await processQueue.resume()
        //     await processQueue.pause()
        // });
        
        // // called from dirt.php
        // app.get("/dirt/clear", async () => {
            //     console.log('clearing')
//     await processQueue.obliterate()
//     await redis.del('dirt:process:og').then(result => {
    //     })
    // });
    
    // MAIN
    // if (!process.argv.includes('--debug')) {
//     console.debug = function () {
//     }
// }



// const PORT = 3000;


// const settings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);
//console.log(util.inspect(settings, false, null, true /* enable colors */ ));
// app.listen(PORT, () => {
    //     console.log(`dirt is running on port ${PORT}`);
    // });
    // dirtySock((messages) => {
    //     console.log(messages)
        // try {
        //     if (messages[0].data.key) {
            //     switch (messages[0].data.key) {
                //         case 'create':
        //             // enqueueCreateFile()
        //             break;
        //         case 'move':
        //             // enqueueMoveFile()
        //             break;
        //         case 'delete_monitor':
        //             console.log('delete triggered')
        //             console.log(messages)
        //             // delete from terminal. does not work for SMB.
        //             enqueueDeleteFile(messages[3].data.name.toString());
        //             break;
        //     }}
        // } catch (err) {
            //     console.error('Failed to parse data:', messages.toString(), err);
        // }
    // });
   
    // scanQueue.process(async (job, done) => {
        //     switch (job.data.task) {
    //         case 'create':
    //             await dequeueCreateFile(job.data.src)
    //             break;
    //         case 'move':
    //             await dequeueMoveFile(job.data.src, job.data.dest)
    //             break;
    //         case 'delete':
    //             await dequeueDeleteFile(job.data)
    //             break;
    //     }
    //     done();
    // });