import express from 'express';
import * as scan from '../nodejs/scan.js';
import {AggregateGroupByReducers, AggregateSteps, SchemaFieldTypes} from 'redis';
import {enqueueFileAction} from "./process.js";
import {fileRepository} from "./redisHelper.js";

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
  const { action, src } = req.params;
  enqueueFileAction(action, src)
  res.send();
});


async function findDuplicateSizes() {
  try {
    const sizes = await fileRepository
        .search()
        .groupBy('size')
        .count()
        .returnFields('size', 'count')
        .execute();

    const result =
    console.error('result', result);
    const hashes = result.results.map(group => group.hash);
    console.error('hashes', hashes);

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

    //console.log('resultsArray', resultsArray);

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
if (!process.argv.includes('--debug')) {
  console.debug = function() {}
}
const PORT = 3000;
//const settings = scan.getSettings();
//console.log(util.inspect(settings, false, null, true /* enable colors */ ));
app.listen(PORT, () => {
  console.log(`dirt is running on port ${PORT}`);
});