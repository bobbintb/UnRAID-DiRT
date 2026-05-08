const fs = require('fs');
const { Worker } = require('worker_threads');

const CHUNK_SIZE = 1024 * 1024; // 1MB

/**
 * Opens file handles for all files in the group concurrently.
 * @param {object} upsertedFile - The file that was upserted.
 * @param {object[]} candidateFiles - The group of candidate files to open.
 * @returns {Promise<Map<string, fs.promises.FileHandle>>} A map from inode to file handle.
 */
async function openFileHandles(upsertedFile, candidateFiles) {
    const fileHandles = new Map();
    const allFiles = [upsertedFile, ...candidateFiles];
    const openPromises = allFiles.map(async (file) => {
        // Use the first path available for reading.
        const path = Array.isArray(file.path) ? file.path[0] : file.path;
        const handle = await fs.promises.open(path, 'r');
        return { ino: file.ino, handle };
    });

    const results = await Promise.all(openPromises);
    for (const result of results) {
        fileHandles.set(result.ino, result.handle);
    }
    return fileHandles;
}

/**
 * Processes one chunk of data for a set of files, comparing them against the upserted file.
 * @param {object} upsertedFile - The file being checked.
 * @param {object[]} activeCandidates - The current group of potential duplicate candidates.
 * @param {Map<string, fs.promises.FileHandle>} fileHandles - A map of file handles.
 * @param {Worker[]} workerPool - The pool of worker threads.
 * @param {number} currentChunkSize - The size of the chunk to read.
 * @param {number} bytesRead - The offset where to start reading.
 * @returns {Promise<{upsertedHash: string, matchingCandidates: object[]}|null>} The refined group for the next iteration.
 */
async function processChunk(upsertedFile, activeCandidates, fileHandles, workerPool, currentChunkSize, bytesRead) {
    let workerIndex = 0;
    const filesToHash = [upsertedFile, ...activeCandidates];

    // 1. Concurrently read the next chunk for all files.
    const readPromises = filesToHash.map(async (file) => {
        const handle = fileHandles.get(file.ino);
        const buffer = Buffer.alloc(currentChunkSize);
        const { bytesRead: read } = await handle.read(buffer, 0, currentChunkSize, bytesRead);
        if (read === 0) return null;
        return { ino: file.ino, buffer: buffer.slice(0, read) };
    });

    const readResults = (await Promise.all(readPromises)).filter(r => r !== null);
    if (readResults.length === 0) return null;


    // 2. Distribute the hashing work to the worker pool.
    const hashPromises = readResults.map(({ ino, buffer }) => {
        return new Promise((resolve, reject) => {
            const worker = workerPool[workerIndex];
            workerIndex = (workerIndex + 1) % workerPool.length;

            const messageHandler = (response) => {
                if (response.ino === ino) {
                    worker.off('message', messageHandler);
                    if (response.type === 'result') resolve({ ino, hash: response.hash });
                    else if (response.type === 'error') reject(new Error(`Worker error for ino ${ino}: ${response.error}`));
                }
            };
            worker.on('message', messageHandler);

            const transferableBuffer = new Uint8Array(buffer);
            worker.postMessage({ type: 'process', ino, buffer: transferableBuffer }, [transferableBuffer.buffer]);
        });
    });

    const hashResults = await Promise.all(hashPromises);

    // 3. Find the hash of the upserted file for this chunk.
    const upsertedResult = hashResults.find(r => r.ino === upsertedFile.ino);
    if (!upsertedResult) {
        // This can happen if the upserted file is smaller than other files.
        console.log('[UPSERT] Upserted file hashing complete, no more candidates can match.');
        return null;
    }
    const upsertedHash = upsertedResult.hash;

    // 4. Filter the candidates to find whose hash matches the upserted file's hash.
    const matchingCandidateInos = new Set(
        hashResults
            .filter(r => r.ino !== upsertedFile.ino && r.hash === upsertedHash)
            .map(r => r.ino)
    );

    const matchingCandidates = activeCandidates.filter(candidate => matchingCandidateInos.has(candidate.ino));

    return { upsertedHash, matchingCandidates };
}


/**
 * The main handler for 'upsert' jobs that require hashing. Processes a file against a group of candidates.
 * @param {object} upsertedFile The file that was upserted.
 * @param {object[]} candidateFiles The list of potential duplicates by size.
 * @param {Worker[]} workerPool The pool of worker threads.
 * @returns {Promise<object[]>} A list of file objects to be saved to Redis.
 */
const handleUpsertGroup = async (upsertedFile, candidateFiles, workerPool) => {
    const { size } = upsertedFile;
    console.log(`[UPSERT] Starting definitive comparison for upserted file ${upsertedFile.path[0]} against ${candidateFiles.length} candidates.`);

    let activeCandidates = [...candidateFiles];
    const fileHandles = await openFileHandles(upsertedFile, candidateFiles);

    let finalHash = null;

    try {
        let bytesRead = 0;
        while (activeCandidates.length > 0 && bytesRead < size) {
            const currentChunkSize = Math.min(CHUNK_SIZE, size - bytesRead);

            const result = await processChunk(upsertedFile, activeCandidates, fileHandles, workerPool, currentChunkSize, bytesRead);
            bytesRead += currentChunkSize;

            if (!result || result.matchingCandidates.length === 0) {
                finalHash = result ? result.upsertedHash : finalHash; // Keep the last hash
                activeCandidates = []; // No more matches, clear the candidates
                break;
            }

            finalHash = result.upsertedHash;
            activeCandidates = result.matchingCandidates;

            console.log(`[UPSERT] Chunk comparison complete. ${activeCandidates.length} potential duplicates remain.`);
        }

        // After the loop, if activeCandidates has members, they are confirmed duplicates.
        if (activeCandidates.length > 0) {
            console.log(`[UPSERT] Confirmed ${activeCandidates.length} duplicate(s) for file ${upsertedFile.path[0]}`);

            // Set the hash on the upserted file and all confirmed duplicates
            upsertedFile.hash = finalHash;
            activeCandidates.forEach(file => file.hash = finalHash);

            return [upsertedFile, ...activeCandidates];
        } else {
            console.log(`[UPSERT] No duplicates confirmed for file ${upsertedFile.path[0]}.`);
            // The upserted file is unique, return it without a hash.
            return [upsertedFile];
        }

    } catch (error) {
        console.error(`[UPSERT] Error during incremental comparison for ${upsertedFile.path[0]}:`, error);
        // In case of error, we can't be sure. Return the file as unique.
        return [upsertedFile];
    } finally {
        for (const handle of fileHandles.values()) {
            await handle.close();
        }
        workerPool.forEach(worker => worker.postMessage({ type: 'reset' }));
        console.log(`[UPSERT] Finished hashing process for ${upsertedFile.path[0]}.`);
    }
};

module.exports = {
    handleUpsertGroup,
};