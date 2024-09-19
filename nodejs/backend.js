import express from 'express';
import * as util from 'util';
import * as functions from '../javascript/scan.js';
import {createClient, SchemaFieldTypes} from 'redis';
const app = express();


app.get("/scan", async () => {
  functions.getAllFiles('/mnt/user/downloads');
  console.debug("Saving files to database.")
  console.debug("Done saving files to database.")
});

app.get('/hash', async (req, res) => {
  findDuplicateSizes().catch(console.error);
});


const redis = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

const indexList = await redis.ft._list();

if (!indexList.includes('idx:files')) {
  await redis.ft.create('idx:files', {size: {type: SchemaFieldTypes.NUMERIC, SORTABLE: true}}, {ON: 'HASH'});
};


if (!process.argv.includes('--debug')) {
  console.debug = function() {}
}
const PORT = 3000;
const settings = functions.getSettings();
console.log(util.inspect(settings, false, null, true /* enable colors */ ));
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});