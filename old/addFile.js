import { createHash, load } from 'blake3';
import { open } from 'node:fs/promises';
import path from 'path';

const CHUNK_SIZE = 1048576; // 1MB

async function hashFileChunk(fileHandle, hash, offset, filePath) {
    try {
        const buffer = Buffer.alloc(CHUNK_SIZE);
        const { bytesRead } = await fileHandle.read(buffer, 0, CHUNK_SIZE, offset);

        if (bytesRead > 0) {
            hash.update(buffer.slice(0, bytesRead)); // Update the hash with the read bytes

            // Create a temporary hash object to calculate the current hash state
            const tempHash = createHash();
            tempHash.update(hash.digest()); // Update tempHash with current hash state
            console.debug(`Processing file: ${path.basename(filePath)}, Current Hash (partial): ${tempHash.digest('hex')}`);
        }

        return bytesRead; // Return the number of bytes read
    } catch (error) {
        console.error(`Error reading file: ${filePath} - ${error.message}`);
        return 0; // Returning 0 indicates the file won't be read further
    }
}

function compareHashesAndFilter(filesWithHashes, fileHandles) {
    if (filesWithHashes.length === 0) return { filteredFiles: filesWithHashes, remainingFileHandles: fileHandles };

    const referenceHash = filesWithHashes[0].hash;
    const filteredFiles = filesWithHashes.filter(({ hash }) => hash === referenceHash);

    const remainingFileHandles = fileHandles.filter((_, index) => filesWithHashes[index].hash === referenceHash);
    const closedFileHandles = fileHandles.filter((_, index) => filesWithHashes[index].hash !== referenceHash);
    closedFileHandles.forEach(fileHandle => fileHandle.close());

    return { filteredFiles, remainingFileHandles };
}

export async function processFiles(filePaths) {
    let fileHandles = await Promise.all(
        filePaths.map(async (filePath) => {
            try {
                return await open(filePath, 'r');
            } catch (error) {
                console.error(`Error opening file: ${filePath} - ${error.message}`);
                return null; // Return null for files that cannot be opened
            }
        })
    );

    // Filter out null file handles (for files that couldn't be opened)
    fileHandles = fileHandles.filter(fileHandle => fileHandle !== null);
    filePaths = filePaths.filter((_, index) => fileHandles[index] !== null);

    let hashes = filePaths.map(() => createHash());
    let offsets = filePaths.map(() => 0);
    let allFilesProcessed = false;

    try {
        while (!allFilesProcessed) {
            const promises = fileHandles.map((fileHandle, index) => {
                return hashFileChunk(fileHandle, hashes[index], offsets[index], filePaths[index]);
            });

            const bytesRead = await Promise.all(promises);
            console.debug('==========================================');

            offsets = offsets.map((offset, index) => offset + bytesRead[index]);

            let filesWithHashes = filePaths.map((filePath, index) => ({
                file: filePath,
                hash: hashes[index].digest('hex') // Get current hash state without affecting ongoing hashing
            }));

            const { filteredFiles, remainingFileHandles } = compareHashesAndFilter(filesWithHashes, fileHandles);

            filePaths = filteredFiles.map(({ file }) => file);
            fileHandles = remainingFileHandles;

            allFilesProcessed = fileHandles.length === 1 || bytesRead.every(bytes => bytes === 0);
        }
    } finally {
        await Promise.all(fileHandles.map(fileHandle => fileHandle.close()));
    }

    return filePaths.map((filePath, index) => ({
        file: filePath,
        hash: hashes[index].digest('hex') // Finalize the hash after all updates
    }));
}

await load();
