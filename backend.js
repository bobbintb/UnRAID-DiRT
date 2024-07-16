import express from 'express';
import fs from 'fs';
import * as util from 'util';
import * as functions from './javascript/scan.js';
import {createHash, load} from 'blake3';
import {JSONFilePreset} from 'lowdb/node'
import {Memory, Low} from 'lowdb'
import path from "path";
const app = express();
import rethinkdbdash from 'rethinkdbdash';
import {checkDatabaseExists} from "./javascript/rethink.js";
import * as xattrs from './javascript/xattrs.js';
import {addDedupeHashAttribute} from "./javascript/xattrs.js";


async function processFiles(files) {
  for (const value of files.values()) {
    if (value.length > 1) {
      const paths = [];
      for (const element of value) {
        paths.push(element.path[0]);
      }
      console.debug(`Processing the following files: ${paths.map(path => path.join(...path)).join(', ')}`);

      const hashes = await hashFilesSequentially(paths);
      for (const element of value) {
        console.debug("begin loop.")
        element.hash = hashes.get(path.join(...element.path[0]));
        console.debug("end loop.")
      }
      console.debug("Done processing files.")
    }
  }
}

async function hashFilesSequentially(filePaths) {
  filePaths = filePaths.map(filePath => path.join(...filePath));
  await load();
  const streams = filePaths.map(filePath => fs.createReadStream(filePath, {
    highWaterMark: 1024 * 1024
  }));
  const hashes = new Map();
  filePaths.forEach((filePath, i) => {
    hashes.set(filePath, createHash());
  });
  let done = Array(filePaths.length).fill(false);
  let iteration = 0;
  let hashFrequency = new Map();
  while (!done.every(Boolean)) {
    await Promise.all(streams.map((stream, i) => new Promise(resolve => {
      let previousHash = hashes.get(filePaths[i]).digest('hex');
      if (hashFrequency.get(previousHash) === 1) {
        console.debug('The current hash for ' + filePaths[i] + ' is unique. Further hashing not needed.');
        done[i] = true;
      }
      if (done[i]) {
        resolve();
      } else {
        stream.once('readable', () => {
          let chunk = stream.read();
          if (chunk !== null) {
            hashes.get(filePaths[i]).update(chunk);
            let digest = hashes.get(filePaths[i]).digest('hex');
            hashFrequency.set(digest, (hashFrequency.get(digest) || 0) + 1);
            resolve();
          } else {
            console.debug('No more data to read from ' + filePaths[i] + '.');
            done[i] = true;
            resolve();
            console.debug('   done[i] = ' + done[i]);
            if (stream.readableEnded) {
              stream.emit('readable');
            }
          }
        });
      }
    })));
    process.stdout.moveCursor(0, -1) // up one line
    process.stdout.clearLine(1) // from cursor to end

    process.stdout.write('\r' + 'Iteration ' + `${++iteration}: ${Array.from(hashes, ([filePath, hash]) => `${filePath}: ${hash.digest('hex')}`).join(', ')}` + '\r');
  }
  console.debug("Done hashing files.")
  return new Map(Array.from(hashes, ([filePath, hash]) => [filePath, hash.digest('hex')]));
}

async function saveMapToFile(map, r) {
  // lowdb
  const mapObject = Object.fromEntries(map);
  const db = await JSONFilePreset("files.json", mapObject)
  await db.write()

  // rethinkdb
  const filesArray = Array.from(map, ([key, value]) => ({key, ...value}));
  await r.db('dedupe').table('files').insert(filesArray).run();
}

app.get("/scan", async () => {
  const db = new Low(new Memory(), {})
  //console.log(db);
  const r = rethinkdbdash();
  await checkDatabaseExists(r, 'dedupe');
  //const files = functions.getAllFiles(settings.include[0])
  const files = functions.getAllFiles('/mnt/user/downloads');
  //console.log('\x1b[1A' + '\x1b[20G' + 'done.');
  await processFiles(files);
  //console.log(files);
  console.debug("Saving files to database.")
  await saveMapToFile(files, r)
  console.debug("Done saving files to database.")
});

app.get("/hash", async () => {
  await addDedupeHashAttribute('/mnt/user/downloads/testfile.txt', 'test');
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