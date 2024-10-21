import express from 'express';
import * as scan from '../nodejs/scan.js';
import {enqueueFileAction} from "./processDuplicates.js";
import {findDuplicateHashes} from "./redisHelper.js";

const app = express();

app.use(express.json()); // Middleware to parse JSON bodies

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST'); // Ensure POST is included

    next();
});


// called from dirtSettings.page
app.get("/scan", async () => {
    scan.getAllFiles('/mnt/user/downloads'); // need to eventually fix this
    console.debug("Saving files to database.")
    console.debug("Done saving files to database.")
});

// called from dirtSettings.page
app.get('/hash', async (req, res) => {
  try {
    const result = await findDuplicateHashes();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// called from left.php
app.post("/process/", (req, res) => {
    console.error('test')
    console.error(req.body)
    enqueueFileAction(req.body)
    res.send();
});

// MAIN
if (!process.argv.includes('--debug')) {
    console.debug = function () {
    }
}
const PORT = 3000;
//const settings = scan.getSettings();
//console.log(util.inspect(settings, false, null, true /* enable colors */ ));
app.listen(PORT, () => {
    console.log(`dirt is running on port ${PORT}`);
});