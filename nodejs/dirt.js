import express from 'express';
import * as scan from '../nodejs/scan.js';
import {enqueueFileAction} from "./processDuplicates.js";

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// called from dirtSettings.page
app.get("/scan", async () => {
    scan.getAllFiles('/mnt/user/downloads'); // need to eventually fix this
    console.debug("Saving files to database.")
    console.debug("Done saving files to database.")
});

// called from dirtSettings.page
// app.get('/hash', async (req, res) => {
//   try {
//     const result = await findDuplicateSizes();
//     res.json(result);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// called from left.php
app.get("/process/:action/:src?", (req, res) => {
    const {action, src} = req.params;
    enqueueFileAction(action, src)
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