import express from 'express';
import fs from 'fs';
import * as util from 'util';
import * as functions from './javascript/scan.js';
import {createHash, load} from 'blake3';
import {JSONFilePreset} from 'lowdb/node'
import path from "path";
const app = express();


app.get("/scan", async () => {
  functions.getAllFiles('/mnt/user/downloads');
  console.debug("Saving files to database.")
  console.debug("Done saving files to database.")
});


if (!process.argv.includes('--debug')) {
  console.debug = function() {}
}
const PORT = 3000;
const settings = functions.getSettings();
console.log(util.inspect(settings, false, null, true /* enable colors */ ));
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});