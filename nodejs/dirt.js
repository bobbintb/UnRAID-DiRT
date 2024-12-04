import express from 'express';
import * as scan from '../nodejs/scan.js';
import {enqueueFileAction} from "./processDuplicates.js";
import {findDuplicateHashes, processQueue, redis, scanQueue} from "./redisHelper.js";
import fs from "fs";
import {dirtySock} from "./socket.js";
import {dequeueCreateFile, enqueueCreateFile, enqueueDeleteFile, enqueueMoveFile} from "./queueListener.js";
import path from "path";

const plugin = 'bobbintb.system.dirt';
const app = express();

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

app.use(express.json()); // Middleware to parse JSON bodies

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'POST'); // Ensure POST is included
    next();
});


// called from dirtSettings.page
app.get("/scan", async () => {
    console.log('Starting scan...')
    console.time('scan');
    const shares = (Array.isArray(settings.share) ? settings.share : [settings.share])
        .map(share => `/mnt/user/${share}`);
    for (const share of shares) {
        await scan.getAllFiles(share);
    }
    console.log('Scan complete.')
    console.timeEnd('scan');
    console.debug("Saving files to database.");
    console.debug("Done saving files to database.");
});


// called from dirtSettings.page
app.get('/load', async (req, res) => {
    const settings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);
    const ogs = await redis.hGetAll("dirt:process:og")
    const jobs = (await processQueue.getJobs('paused')).reduce((acc, job) => {
        acc[job.id] = job.data.action;
        return acc;
    }, {});

    try {
    const result = await findDuplicateHashes();
      res.json({
          result: result,
          datetime_format: settings.datetime_format,
          jobs: jobs,
          ogs: ogs
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// called from dirt.php
app.post("/addToProcessQueue", (req, res) => {
    enqueueFileAction(req.body)
    res.send();
});

app.get("/process", async () => {
    await processQueue.resume()
    await processQueue.pause()
});

// called from dirt.php
app.get("/clear", async () => {
    console.log('clearing')
    await processQueue.obliterate()
    await redis.del('dirt:process:og').then(result => {
    })
});

// MAIN
// if (!process.argv.includes('--debug')) {
//     console.debug = function () {
//     }
// }
const PORT = 3000;


const settings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);
//console.log(util.inspect(settings, false, null, true /* enable colors */ ));
app.listen(PORT, () => {
    console.log(`dirt is running on port ${PORT}`);
});

process.on('SIGINT', () => {
    redis.quit(() => {
        console.log('Redis connection closed');
        process.exit(0); // Graceful shutdown
    });
});


dirtySock((messages) => {
    console.log(messages)
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
});

//   - -a always,exit -F arch=b64 -F success=1 -F dir=/mnt/user/downloads/ -S unlink -S unlinkat -S rmdir -k delete_monitor
//   - -a always,exit -F arch=b32 -F success=1 -F dir=/mnt/user/downloads/ -S unlink -S unlinkat -S rmdir -k delete_monitor

//   - -a always,exit -F arch=b64 -F success=1 -F dir=/mnt/user/downloads/ -S rename -S renameat -S renameat2 -k move_monitor

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