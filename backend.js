import express from 'express';
import * as util from 'util';
import * as functions from './javascript/scan.js';
import Redis from 'ioredis';
const app = express();


app.get("/scan", async () => {
  functions.getAllFiles('/mnt/user/downloads');
  console.debug("Saving files to database.")
  console.debug("Done saving files to database.")
});


const redis = new Redis();

app.get('/hashes', async (req, res) => {
  findNonUniqueHashes().then(nonUniqueHashes => {
    console.log('Non-unique hash values and their keys:', nonUniqueHashes);
    redis.quit(); // Close the connection when done
  }).catch(err => {
    console.error('Error:', err);
    redis.quit();
  });
});


async function findNonUniqueHashes() {

  const hashField = 'hash'; // The field you're interested in
  const hashOccurrences = {}; // To track occurrences of each hash value
  const nonUniqueHashes = []; // To store keys with non-unique hash values

  let cursor = '0';

  do {
    const result = await redis.scan(cursor);
    cursor = result[0]; // New cursor position
    const keys = result[1]; // List of keys

    for (const key of keys) {
      const keyType = await redis.type(key);
      if (keyType !== 'hash') continue;
      const hashValue = await redis.hget(key, hashField);
      if (hashValue) {
        if (hashOccurrences[hashValue]) {
          hashOccurrences[hashValue].push(key);
        } else {
          hashOccurrences[hashValue] = [key];
        }
      }
    }
  } while (cursor !== '0'); // Continue scanning until the cursor wraps around
  for (const [hashValue, keys] of Object.entries(hashOccurrences)) {
    if (keys.length > 1) {
      nonUniqueHashes.push({
        hashValue,
        keys
      });
    }
  }
  return nonUniqueHashes;
}


if (!process.argv.includes('--debug')) {
  console.debug = function() {}
}
const PORT = 3000;
const settings = functions.getSettings();
console.log(util.inspect(settings, false, null, true /* enable colors */ ));
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});