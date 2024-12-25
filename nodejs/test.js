import { blake3 } from '@noble/hashes/blake3';
import fs from 'fs';
import { TextEncoder } from 'util';

const filePath = './test.php';

// Read the file and hash its contents
const hashFile = (filePath) => {
    const fileStream = fs.createReadStream(filePath);
    const hash = blake3.create();

    fileStream.on('data', (chunk) => {
        hash.update(chunk); // Update the hash with chunks of the file

        // At this point, print the intermediate state as a hex string
        const intermediateHash = hash.state; // Get the internal state (intermediate hash)
        const hexIntermediateHash = Buffer.from(intermediateHash.buffer).toString('hex');
        console.log('Intermediate Hash (Hex):', hexIntermediateHash);

    });

    fileStream.on('end', () => {
        const finalHash = hash.digest(); // Get the final hash after reading the file
        console.log('BLAKE3 Hash of the file:', Buffer.from(finalHash).toString('hex'));
    });

    fileStream.on('error', (err) => {
        console.error('Error reading the file:', err);
    });
};

// Run the function with your file
hashFile(filePath);
