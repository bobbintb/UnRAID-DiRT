import fs from 'fs';
import blake3 from 'blake3';
import { createClient } from 'redis';

const redis = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

const CHUNK_SIZE = 1048576; // 1MB chunk size

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

async function hashFilesInIntervals(files) {
    // Create a hasher for each file
    const hashers = files.map(() => blake3.createHash());
    const processedBytes = files.map(() => 0); // Track how much of each file has been processed
    let allFilesProcessed = false;

    return new Promise((resolve, reject) => {
        function processNextChunk() {
            if (allFilesProcessed) {
                // All files have been processed, resolve the final hashes
                const finalHashes = hashers.map(hasher => hasher.digest('hex'));
                return resolve(finalHashes);
            }

            const fileChunkPromises = files.map((file, index) => {
                return new Promise((chunkResolve) => {
                    if (processedBytes[index] >= file.size) {
                        // File is already fully processed, skip
                        chunkResolve(null);
                    } else {
                        // Read the next 1MB chunk of the file
                        const stream = fs.createReadStream(file.filePath, {
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
                            console.error(`Error processing file: ${file.filePath}`, error);
                            chunkResolve(null); // Resolve with null in case of error
                        });
                    }
                });
            });

            // Wait for all file chunks to be processed for the current interval
            Promise.all(fileChunkPromises).then((results) => {
                // Check if all files have been processed
                allFilesProcessed = results.every(result => result === null);
                console.log('\n======================================================================================================================================');

                // Get the intermediate hash of the first file
                const firstFileHash = hashers[0].digest('hex');
                console.log(`Intermediate Hash of First File: ${firstFileHash}`);

                // Output progress and comparison for all files in this interval
                files.forEach((file, index) => {
                    const fileSize = parseInt(file.size, 10);
                    const progress = ((processedBytes[index] / fileSize) * 100).toFixed(2);
                    const currentHash = hashers[index].digest('hex');  // Get intermediate hash


                    console.log(`File ${index}: ${file.filePath}`);
                    console.log(`       ${processedBytes[index]} bytes processed (${progress}% done)`);
                    console.log(`       Current Hash: ${currentHash}`);

                    // Compare current file's hash with the first file's hash
                    if (index !== 0) {  // Skip comparison for the first file itself
                        const comparisonResult = currentHash === firstFileHash ? 'MATCH' : 'NO MATCH';
                        console.log(`Comparison with first file: ${comparisonResult}`);
                    }
                    if (index + 1 !== files.length) {
                        console.log('____________________________________________________________________________________________________________________________');
                    }
                });

                // Add separator after all files are processed for this interval
                console.log('======================================================================================================================================');
                console.log('||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||');


                // Move to the next chunk for all files
                processNextChunk();
            }).catch(reject);
        }

        // Start processing the first chunk
        processNextChunk();
    });
}



let sameSizeFiles = await searchBySize(12779642545);
//12779642545
//142454784
console.log(sameSizeFiles)
await blake3.load();
hashFilesInIntervals(sameSizeFiles)
    .then(result => console.log('Final Results:', result))
    .catch(err => console.error('Error processing files:', err));
