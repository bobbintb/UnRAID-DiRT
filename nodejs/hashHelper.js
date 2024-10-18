import fs from 'fs';
import blake3 from 'blake3';

const CHUNK_SIZE = 1048576; // 1MB chunk size
await blake3.load();

export async function hashFilesInIntervals(files) {
    // Create a hasher and track processed bytes for each file
    let hashers = files.map(() => blake3.createHash());
    let processedBytes = files.map(() => 0);
    return new Promise(async (resolve, reject) => {
        try {
            // Continue processing as long as there's more than one file
            while (files.length > 1) {
                const fileChunkPromises = files.map((file, index) => {
                    return new Promise((chunkResolve, chunkReject) => {
                        if (processedBytes[index] >= file.size) {
                            // File fully processed
                            chunkResolve(null);
                        } else {
                            // Read the next 1MB chunk from the file
                            const stream = fs.createReadStream(file.path[0], {
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
                                console.error(`Error processing file: ${file.path[0]}`, error);
                                chunkReject(error);  // Reject if there's a stream error
                            });
                        }
                    });
                });

                // Wait for all chunk reads to complete
                await Promise.all(fileChunkPromises);

                // Compare the intermediate hashes
                for (let index = files.length - 1; index >= 0; index--) {
                    const currentHash = hashers[index].digest('hex');
                    if (index === 0 || currentHash === hashers[0].digest('hex')) {
                        // Keep the file if it matches the first file's hash
                        //console.debug(`File ${index}: \x1b[32m${currentHash}\x1b[0m`);
                    } else {
                        //console.debug(`File ${index}: \x1b[33m${currentHash}\x1b[0m (No match, removing from further processing.)`);
                        files.splice(index, 1);
                        hashers.splice(index, 1);
                        processedBytes.splice(index, 1);
                    }
                }

                // Log progress
                const progress = ((processedBytes[0] / files[0].size) * 100).toFixed(2);
                //console.debug(`${progress}% (${processedBytes[0]} bytes)`);

                // Check if the first file is fully processed
                if (processedBytes[0] >= files[0].size) {
                    files.forEach((file, index) => {
                        file.hash = hashers[index].digest('hex');
                    });
                    return resolve(files);  // Resolve once all files are hashed
                }
            }

            // If there's only one file left, resolve early
            if (files.length === 1) {
                //console.debug('Only one file left, stopping early.');
                files[0].hash = hashers[0].digest('hex');
                return resolve(files);
            }

        } catch (error) {
            console.error('Error during file hashing:', error);
            reject(error);  // Reject the promise if there's any error
        }
    });
}

if (!process.argv.includes('--debug')) {
    console.debug = function () {
    }
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
