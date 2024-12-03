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
                // Limit concurrency to avoid memory overload (use a concurrency limit, e.g., 3)
                const concurrencyLimit = 3;
                let activePromises = [];

                for (let i = 0; i < files.length; i++) {
                    if (processedBytes[i] >= files[i].size) {
                        continue; // Skip already processed files
                    }

                    activePromises.push(new Promise((chunkResolve, chunkReject) => {
                        // Process the chunk of the current file
                        const stream = fs.createReadStream(files[i].path[0], {
                            start: processedBytes[i],
                            end: Math.min(processedBytes[i] + CHUNK_SIZE - 1, files[i].size - 1)
                        });

                        stream.on('data', (chunk) => {
                            // This is the correct place to process the chunk
                            hashers[i].update(chunk); // Update hash incrementally without holding all data in memory
                        });

                        stream.on('end', () => {
                            // The chunk is processed by the `data` event, so we don't need to reference it here
                            processedBytes[i] += files[i].size - processedBytes[i]; // We can directly update the bytes processed
                            chunkResolve(true);
                        });

                        stream.on('error', (error) => {
                            console.error(`Error processing file: ${files[i].path[0]}`, error);
                            chunkReject(error); // Reject if there's a stream error
                        });
                    }));

                    // Ensure that the number of active promises doesn't exceed the concurrency limit
                    if (activePromises.length >= concurrencyLimit) {
                        await Promise.race(activePromises); // Wait for at least one to finish before continuing
                    }
                }

                // Wait for all chunk reads to complete
                await Promise.all(activePromises);

                // Compare the intermediate hashes
                for (let index = files.length - 1; index >= 0; index--) {
                    const currentHash = hashers[index].digest('hex');
                    if (index === 0 || currentHash === hashers[0].digest('hex')) {
                        // Keep the file if it matches the first file's hash
                    } else {
                        files.splice(index, 1); // Remove mismatched file from further processing
                        hashers.splice(index, 1);
                        processedBytes.splice(index, 1);
                    }
                }

                // Check if the first file is fully processed
                if (processedBytes[0] >= files[0].size) {
                    files.forEach((file, index) => {
                        file.hash = hashers[index].digest('hex');
                    });
                    return resolve(files); // Resolve once all files are hashed
                }
            }

            // If there's only one file left, resolve early
            if (files.length === 1) {
                files[0].hash = hashers[0].digest('hex');
                return resolve(files);
            }

        } catch (error) {
            console.error('Error during file hashing:', error);
            reject(error); // Reject the promise if there's any error
        }
    });
}

if (!process.argv.includes('--debug')) {
    console.debug = function () {};
}


// 1. Handling Streams Efficiently
// You're using a combination of streams and buffers to read data in chunks and compute the hash. However, you're
// accumulating entire chunks in memory before hashing them. The problem is that when there are many large files being
// processed simultaneously, the chunks array can grow too large in memory, especially with multiple files. Here's how
// to improve it:
//
// Process each chunk in a streaming manner instead of accumulating it in memory. The hash function itself can process
// the data chunk by chunk without holding all the data in memory.
// 2. Managing the Files and Streams in Parallel
// The Promise.all() is processing multiple files at the same time. This can be overwhelming if many large files are
// processed concurrently, leading to memory overload. Consider limiting the number of concurrent file operations to
// avoid overloading the system.
//
// 3. Optimizing Memory Usage for File Processing
// Instead of collecting all chunks into an array and then hashing them all at once, you can update the hash
// incrementally as each chunk is read.
//
//
//     Key Changes:
//     Incremental Hashing: Each chunk is hashed as it is read without accumulating the entire chunk in memory
//     (hashers[i].update(chunk)).
//     Concurrency Limiting: Instead of launching all file processing tasks at once, a concurrency limit (e.g., 3 files)
//     is used to prevent excessive memory consumption. You can adjust this value based on your system's capabilities.
// Reduced Memory Footprint: The code now processes chunks one-by-one per file and doesn't hold chunks in memory, thus
// reducing memory usage.
// Further Optimizations:
//     Buffer Reuse: You could consider reusing buffers for chunk processing instead of allocating new memory for each
//     chunk.
//     File Size Checks: Before processing files, check whether they are too large for the available memory and consider
//     additional optimizations for exceptionally large files.
