import fs from 'fs';
import blake3 from 'blake3';
import { createClient } from 'redis';

const redis = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

async function searchBySize(size) {
    try {
        const result = await redis.ft.search('idx:file', `@size:[${size} ${size}]`, {
            LIMIT: { from: 0, size: 10000 },
            RETURN: ['id', 'size']
        });

        return result.documents.map(doc => ({
            filePath: doc.id,
            size: doc.value.size
        }));
    } catch (err) {
        console.error('Search error:', err);
        throw err;
    }
}

async function hashFileChunk(filePath, start, chunkSize) {
    //const hash = blake3.createHash();
    const end = start + chunkSize;

    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { start, end: end > fs.statSync(filePath).size ? undefined : end, highWaterMark: chunkSize });

        stream.on('data', chunk => {
            hash.update(chunk);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', err => {
            reject(err);
        });
    });
}

async function hashFilePaths(sameSizeFiles) {
    const chunkSize = 1048576; // 1MB chunk size
    //const results = [];
    let hashes = [];
    sameSizeFiles.forEach(file => {
        file.hash = blake3.createHash();
        console.log(file)
    })


    let start = 0;
    let moreChunks = true;

    while (moreChunks) {
        // Process each chunk concurrently
        console.log("============================================")
        const chunkPromises = sameSizeFiles.map(async file => {
            try {
                const hash = await hashFileChunk(file.filePath, start, chunkSize);
                return {
                    filePath: file.filePath,
                    size: file.size,
                    start,
                    chunkSize,
                    hash
                };
            } catch (err) {
                console.error(`Error hashing chunk for file ${file.filePath}:`, err);
                return {
                    filePath: file.filePath,
                    size: file.size,
                    start,
                    chunkSize,
                    hash: null
                };
            }
        });

        // Await all chunk promises
        const chunkResults = await Promise.all(chunkPromises);
        //results.push(...chunkResults);

        for (let i = chunkResults.length - 1; i > 0; i--) {
            if (chunkResults[i].hash !== chunkResults[0].hash) {
                console.log(`Object at index ${i + 1} has a different hash.`);
                chunkResults.splice(i, 1);
            } else {
                console.log(`Object at index 0 hash ${chunkResults[0].hash}.`);
                console.log(`Object at index ${i} has the same hash ${chunkResults[i].hash}.`);
            }
        }




        // Update start position for the next chunk
        start += chunkSize;

        // Check if we need to continue processing chunks
        moreChunks = sameSizeFiles.some(file => fs.statSync(file.filePath).size > start);
    }

    //return results;
}

let sameSizeFiles = await searchBySize(142454784);
//12779642545
//142454784

await blake3.load();
hashFilePaths(sameSizeFiles)
    .then(result => console.log('Final Results:', result))
    .catch(err => console.error('Error processing files:', err));
