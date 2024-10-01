import express from 'express';
import * as util from 'util';
import * as scan from '../nodejs/scan.js';
import {AggregateGroupByReducers, AggregateSteps, createClient, SchemaFieldTypes} from 'redis';

const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get("/scan", async () => {
  scan.getAllFiles('/mnt/user/downloads'); // need to eventually fix this
  console.debug("Saving files to database.")
  console.debug("Done saving files to database.")
});

app.get('/hash', async (req, res) => {
  try {
    const result = await findDuplicateSizes();
    res.json(result); // Send the result back to the client
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' }); // Send error response
  }
});


async function findDuplicateSizes() {
  try {
    const result = await redis.ft.aggregate('idx:files', '*', {
      LOAD: ['@hash'],
      STEPS: [
        {
          type: AggregateSteps.FILTER,
          expression: 'exists(@hash)'
        },
        {
          type: AggregateSteps.GROUPBY,
          properties: ['@hash'],
          REDUCE: [
            {
              type: AggregateGroupByReducers.COUNT,
              property: '@hash',
              AS: 'nb_of_files'
            }
          ]
        },
        {
          type: AggregateSteps.SORTBY,
          BY: {
            BY: '@nb_of_files',
            DIRECTION: 'DESC'
          }
        },
        {
          type: AggregateSteps.FILTER,
          expression: '@nb_of_files > 1'
        },
        {
          type: AggregateSteps.LIMIT,
          from: 0,
          size: 10000
        }
      ]
    });

    const hashes = result.results.map(group => group.hash);
    console.log('hashes', hashes);

    const resultsArray = await Promise.all(
        hashes.map(hash =>
            redis.ft.search('idx:files', `@hash:${hash}`)
                .then(result => ({
                  hash,
                  documents: result.documents.map(doc => ({
                    id: doc.id,
                    ...doc.value
                  }))
                }))
        )
    );

    console.log('resultsArray', resultsArray);

    // Convert the final results into an array of objects for Tabulator
    const formattedResults = resultsArray.flatMap(({ hash, documents }) =>
        documents.map(doc => ({
          ...doc,    // Spread document properties (e.g., id, path, size, etc.)
          hash      // Add the hash as a separate field for grouping in Tabulator
        }))
    );

    console.log('formattedResults', formattedResults);

    return formattedResults; // Return array format suitable for Tabulator
  } catch (error) {
    console.error('Error running aggregation:', error);
    throw error;
  }
}


// MAIN
const redis = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

const indexList = await redis.ft._list();

if (!indexList.includes('idx:files')) {
  await redis.ft.create('idx:files', {
    size: {type: SchemaFieldTypes.NUMERIC, SORTABLE: true},
    hash: {type: SchemaFieldTypes.TEXT}
  }, {ON: 'HASH'});
};


if (!process.argv.includes('--debug')) {
  console.debug = function() {}
}
const PORT = 3000;
const settings = scan.getSettings();
console.log(util.inspect(settings, false, null, true /* enable colors */ ));
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});