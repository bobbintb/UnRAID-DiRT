import express from 'express';
import * as util from 'util';
import * as functions from '../javascript/scan.js';
import {AggregateGroupByReducers, AggregateSteps, createClient, SchemaFieldTypes} from 'redis';
const app = express();


app.get("/scan", async () => {
  functions.getAllFiles('/mnt/user/downloads');
  console.debug("Saving files to database.")
  console.debug("Done saving files to database.")
});

app.get('/hash', async (req, res) => {
  findDuplicateSizes().catch(console.error);
});

async function findDuplicateSizes() {
  try {
    const result = await redis.ft.aggregate('idx:files', '*', {
      STEPS: [
        {   type: AggregateSteps.GROUPBY,
          properties: ['@size'],
          REDUCE: [
            {   type: AggregateGroupByReducers.COUNT,
              property: '@size',
              AS: 'nb_of_files'
            }
          ]
        },
        {
          type: AggregateSteps.FILTER,
          expression: '@nb_of_files > 1'
        },
        {
          type: AggregateSteps.SORTBY,
          BY: {
            BY: '@nb_of_files',
            DIRECTION: 'DESC'
          }
        },
        {
          type: AggregateSteps.LIMIT,
          from: 0,
          size: 10000
        }
      ]
    });
    //console.log(JSON.stringify(result.results));  // Log the result for debugging
    return result;        // Return the result so it can be used elsewhere
  } catch (error) {
    console.error('Error running aggregation:', error);
    throw error;          // Re-throw the error if needed
  }
}


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