import express from 'express';
import * as util from 'util';
import * as functions from '../javascript/scan.js';
import Redis from 'ioredis';
const app = express();


app.get("/scan", async () => {
  functions.getAllFiles('/mnt/user/downloads');
  console.debug("Saving files to database.")
  console.debug("Done saving files to database.")
});

app.get('/hash', async (req, res) => {
  findDuplicateSizes().catch(console.error);
});


const redis = new Redis();
const indexList = await redis.call('FT._LIST');
if (!indexList.includes('idx:files'))
  await redis.call('FT.CREATE', 'idx:files', 'ON', 'HASH', 'SCHEMA', 'size', 'NUMERIC', 'SORTABLE');



async function findDuplicateSizes() {
  const result = await redis.call(
      'FT.AGGREGATE',
      'idx:files', '*',
      'GROUPBY', '1', '@size',
      'REDUCE', 'COUNT', '0', 'AS', 'nb_of_files',
      'FILTER', '@nb_of_files > 1',
      'SORTBY', '2', '@nb_of_files', 'ASC',
      'LIMIT', '0', '10000'
  );



  console.log(result);
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