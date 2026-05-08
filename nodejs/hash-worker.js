const { parentPort } = require('worker_threads');
const blake3 = require('blake3');

let createHash = null;
const hashers = new Map();

// Initialize blake3 and get the createHash function. This promise ensures
// we don't process messages until the wasm is loaded.
const initPromise = blake3.load().then(() => {
    createHash = blake3.createHash;
}).catch(err => {
    console.error("Worker failed to load blake3:", err);
    // This error will be caught by any await on initPromise.
    throw err;
});

parentPort.on('message', async (msg) => {
    // Ensure initialization is complete before processing any message.
    await initPromise;

    // If createHash is still null, it means initialization failed.
    if (!createHash) {
        parentPort.postMessage({ type: 'error', ino: msg.ino, error: 'Worker blake3 module not loaded.' });
        return;
    }

    try {
        if (msg.type === 'process') {
            const { ino, buffer } = msg;

            // Get or create the hasher for this specific file (by its inode).
            if (!hashers.has(ino)) {
                hashers.set(ino, createHash());
            }
            const hasher = hashers.get(ino);

            // Update the hasher with the new chunk. The buffer is a Uint8Array
            // after being transferred from the main thread.
            hasher.update(buffer);

            // Calculate the intermediate hash for this point in the stream.
            const intermediateHash = hasher.digest('hex');

            // Send the successful result back to the main thread.
            parentPort.postMessage({ type: 'result', ino, hash: intermediateHash });

        } else if (msg.type === 'reset') {
            // When the main thread finishes processing a top-level file group,
            // it will instruct all workers to clear their internal state (the hashers map)
            // to free memory before the next job.
            hashers.clear();
        }
    } catch (error) {
        // In case of an unexpected error during hashing, notify the main thread.
        parentPort.postMessage({ type: 'error', ino: msg.ino, error: error.message });
    }
});