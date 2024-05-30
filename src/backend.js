import express from 'express';
const app = express();
import fsp from 'fs/promises';
import fs from 'fs';
import * as util from 'util';
import * as functions from './javascript/scan.js';
import { load, createHash } from 'blake3';
import { JSONFilePreset } from 'lowdb/node'

async function filterFiles(files) {
  for (const [key, value] of files) {
    if (value.length > 1) {
      const paths = [];
      for (const element of value) {
        for (const path of element.path) {
          paths.push(path);
        }
      }
      try {
        const hash = await hashAndCompareFiles(paths);
        if (hash !== null) {
          value.forEach(item => {
            item.hash = hash;
          });
        }
      } catch (err) {
        console.error('Error:', err.message);
      }
    }
  }
}

async function hashAndCompareFiles(filePaths) {
  await load();
  return new Promise((resolve, reject) => {
    const hashes = filePaths.map(() => createHash());
    const inputs = filePaths.map(filePath => fs.createReadStream(filePath));
    let chunkCount = 0;
    let filesMatch = true;
    inputs.forEach((input, index) => {
      input.on('data', chunk => {
        hashes[index].update(chunk);
        compareHashes();
      });
      input.on('error', err => reject(err));
    });
    function compareHashes() {
      if (++chunkCount % 100 === 0) {
        const currentHashes = hashes.map(hash => hash.digest('hex'));
        if (!currentHashes.every(hash => hash === currentHashes[0])) {
          filesMatch = false;
        }
      }
    }
    inputs.forEach(input => {
      input.on('end', () => { });
    });
    Promise.all(inputs.map(input => new Promise((resolve, reject) => {
      input.on('end', () => resolve());
    })))
        .then(() => {
          if (filesMatch) {
            const finalHashes = hashes.map(hash => hash.digest('hex'));
            resolve(finalHashes[0]);
          } else {
            resolve(null); // Resolve with null if files don't match
          }
        })
        .catch(err => reject(err));
  });
}

async function saveMapToFile(map, filePath) {
  const mapObject = Object.fromEntries(map);
  const db = await JSONFilePreset(filePath, mapObject)
  await db.write()
}

app.get("/scan", async (res) => {
  //const files = functions.getAllFiles(settings.include[0])
  //console.log('Enumerating files...');
  const files = functions.getAllFiles('/tmp');
  //console.log('\x1b[1A' + '\x1b[20G' + 'done.');
  await filterFiles(files); // Wait for filterFiles to complete
  //console.log(files);
  saveMapToFile(files, "./files.json")
});

// Route to perform addition
app.get("/add/:num1/:num2", (req, res) => {
  const num1 = parseInt(req.params.num1);
  const num2 = parseInt(req.params.num2);
  const sum = num1 + num2;
  res.send(`The sum of ${num1} and ${num2} is ${sum}.`);
});

const PORT = 3000;
const settings = functions.getSettings();
console.log(util.inspect(settings, false, null, true /* enable colors */));
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
