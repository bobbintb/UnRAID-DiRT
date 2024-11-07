import express from 'express';
import * as scan from '../nodejs/scan.js';
import {enqueueFileAction} from "./processDuplicates.js";
import {findDuplicateHashes, redis} from "./redisHelper.js";
import fs from "fs";

const plugin = 'bobbintb.system.dirt';

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

const app = express();

app.use(express.json()); // Middleware to parse JSON bodies

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'POST'); // Ensure POST is included

    next();
});


// called from dirtSettings.page
app.get("/scan", async () => {
    const shares = (Array.isArray(settings.share) ? settings.share : [settings.share])
        .map(share => `/mnt/user/${share}`);
    for (const share of shares) {
        await scan.getAllFiles(share);
    }
    console.debug("Saving files to database.");
    console.debug("Done saving files to database.");
});


// called from dirtSettings.page
app.get('/load', async (req, res) => {
    const settings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);
    const ogs = await redis.hGetAll("dirt:process:og")
    console.log(ogs)
  try {
    const result = await findDuplicateHashes();
      res.json({
          result: result,
          datetime_format: settings.datetime_format,
          ogs: ogs
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// called from dirt.php
app.post("/process/", (req, res) => {
    enqueueFileAction(req.body)
    res.send();
});

// called from dirt.php
app.post("/get/", (req, res) => {

    res.send();
});

// MAIN
if (!process.argv.includes('--debug')) {
    console.debug = function () {
    }
}
const PORT = 3000;


const settings = loadSettings(`/boot/config/plugins/${plugin}/${plugin}.cfg`);
//console.log(util.inspect(settings, false, null, true /* enable colors */ ));
app.listen(PORT, () => {
    console.log(`dirt is running on port ${PORT}`);
});