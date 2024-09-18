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

// New parameter: `onChunkProcessed` for post-chunk processing
async function hashFile(filePath, onChunkProcessed) {
    const hash = blake3.createHash();
    const chunkSize = 1048576; // 1MB chunk size

    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });

        stream.on('data', chunk => {
            hash.update(chunk);
            if (typeof onChunkProcessed === 'function') {
                const currentHash = hash.digest('hex');
                onChunkProcessed(currentHash);
            }
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
    const hashPromises = sameSizeFiles.map(async item => {
        try {
            const onChunkProcessed = (currentHash) => {
                console.log(`${currentHash}: ${item.filePath}`);
            };
            const hash = await hashFile(item.filePath, onChunkProcessed);
            const result = {
                filePath: item.filePath,
                size: item.size,
                hash
            };
            console.log(result);
            return result;
        } catch (err) {
            console.error(`Hashing error for file ${item.filePath}:`, err);
            return {
                filePath: item.filePath,
                size: item.size,
                hash: null
            };
        }
    });
    return Promise.all(hashPromises);
}

let sameSizeFiles = await searchBySize(12779642545);

await blake3.load();
hashFilePaths(sameSizeFiles)
    .then(result => console.log(result))
    .catch(err => console.error('Error processing files:', err));
