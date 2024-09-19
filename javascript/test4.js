import fs from 'fs';
import blake3 from 'blake3';
import { createClient } from 'redis';

const redis = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

const CHUNK_SIZE = 1048576; // 1MB chunk size

export async function searchBySize(size) {
    try {
        const result = await redis.ft.search('idx:files', `@size:[${size} ${size}]`, {
            LIMIT: { from: 0, size: 10000 },
            RETURN: ['id', 'size']
        });

        return result.documents.map(doc => ({
            path: doc.id,
            size: doc.value.size
        }));
    } catch (err) {
        console.error('Search error:', err);
        throw err;
    }
}


export async function hashFilesInIntervals(files) {
    await blake3.load();
    let hashers = files.map(() => blake3.createHash());
    console.debug(hashers)
    let processedBytes = files.map(() => 0); // Track how much of each file has been processed
    return new Promise(async (resolve, reject) => {
        while (files.length > 1) {
            const fileChunkPromises = files.map((file, index) => {
                return new Promise((chunkResolve) => {
                    if (processedBytes[index] >= file.size) {
                        // File is already fully processed, skip
                        chunkResolve(null);
                    } else {
                        // Read the next 1MB chunk of the file
                        const stream = fs.createReadStream(file.path, {
                            start: processedBytes[index],
                            end: Math.min(processedBytes[index] + CHUNK_SIZE - 1, file.size - 1)
                        });
                        const chunks = [];
                        stream.on('data', (chunk) => chunks.push(chunk));
                        stream.on('end', () => {
                            const combinedChunk = Buffer.concat(chunks);
                            hashers[index].update(combinedChunk);
                            processedBytes[index] += combinedChunk.length;
                            chunkResolve(true);
                        });
                        stream.on('error', (error) => {
                            console.error(`Error processing file: ${file.path}`, error);
                            chunkResolve(null);
                        });
                    }
                });
            });

            // Wait for all file chunks to be processed for the current interval
            await Promise.all(fileChunkPromises).then((results) => {
                // Get the intermediate hash of the first file
                const firstFileHash = hashers[0].digest('hex');
                const remainingFiles = [];
                const remainingHashers = [];
                const remainingProcessedBytes = [];
                files.forEach((file, index) => {
                    const currentHash = hashers[index].digest('hex');  // Get intermediate hash
                    if (index === 0 || currentHash === firstFileHash) {
                        // Keep the first file and those that match the first file's hash
                        console.debug(`File ${index}: \x1b[32m${currentHash}\x1b[0m`);
                        remainingFiles.push(file);
                        remainingHashers.push(hashers[index]);
                        remainingProcessedBytes.push(processedBytes[index]);
                    } else {
                        console.debug(`File ${index}: \x1b[33m${currentHash}\x1b[0m (No match, removing from further processing.)`);
                    }
                });
                const progress = ((processedBytes[0] / files[0].size) * 100).toFixed(2);
                console.debug(`${progress}% (${processedBytes[0]} bytes)`);

                // Update the files, hashers, and processedBytes arrays with remaining items
                files = remainingFiles;
                hashers = remainingHashers;
                processedBytes = remainingProcessedBytes;
                console.debug('\x1b[96m%s\x1b[0m','========================================================================');
            }).catch(reject);
            if (processedBytes[0] >= files[0].size) {
                files.forEach((file, index) => {
                    file.hash = hashers[index].digest('hex');
                    console.debug(file)
                });
                return resolve(files);
            }
        }

        if (files.length === 1) {
            console.debug(`Only one file left, stopping early.`);
            return resolve(files);
        }
    });
}
if (!process.argv.includes('--debug')) {
    console.debug = function() {}
}
//let sameSizeFiles = await searchBySize(12779642545);
//12779642545
//142454784
//console.debug(`Files of size ${sameSizeFiles[0].size}:`)

//sameSizeFiles.forEach((file, index) => {
//    console.debug(`File ${index}: ${file.path}`)
//});
//console.debug('\x1b[96m%s\x1b[0m','========================================================================');


//hashFilesInIntervals(sameSizeFiles)
//    .then(result => console.log('Final Results:', result))
//    .catch(err => console.error('Error processing files:', err));
