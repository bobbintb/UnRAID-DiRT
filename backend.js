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
await redis.call('FT.CREATE', 'idx:file', 'ON', 'HASH', 'SCHEMA', 'size', 'NUMERIC', 'SORTABLE');

app.get('/hash', async (req, res) => {
  findDuplicateSizes().catch(console.error);
});


async function findDuplicateSizes() {
  const results = await redis.call('FT.SEARCH', 'idx:file', '*', 'RETURN', '1', 'size', 'LIMIT', '0', '10000');

  const sizeToKeys = new Map();

  for (let i = 1; i < results.length; i += 2) {
    const key = results[i];
    const size = results[i + 1][1];  // Get the size directly, assuming 'RETURN 1 size' always returns 'size' first

    if (!sizeToKeys.has(size)) {
      sizeToKeys.set(size, []);
    }
    sizeToKeys.get(size).push(key);  // Add the key to the list of keys for this size
  }

  const duplicates = [...sizeToKeys.entries()].filter(([_, keys]) => keys.length > 1);

  const pipeline = redis.pipeline();

  duplicates.forEach(([_, keys]) => {
    keys.forEach(key => pipeline.hgetall(key));
  });

  const responses = await pipeline.exec();
  console.log(responses);
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