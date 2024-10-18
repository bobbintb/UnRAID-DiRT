import {fileRepository, redis} from "./redisHelper.js";
import {dequeueCreateFile} from "./queueListener.js";

async function findNonUniqueHashes() {

    const hashField = 'hash'; // The field you're interested in
    const hashOccurrences = {}; // To track occurrences of each hash value
    const nonUniqueHashes = []; // To store keys with non-unique hash values

    let cursor = '0';

    do {
        const result = await redis.scan(cursor);
        cursor = result[0]; // New cursor position
        const keys = result[1]; // List of keys

        for (const key of keys) {
            const keyType = await redis.type(key);
            if (keyType !== 'hash') continue;
            const hashValue = await redis.hget(key, hashField);
            if (hashValue) {
                if (hashOccurrences[hashValue]) {
                    hashOccurrences[hashValue].push(key);
                } else {
                    hashOccurrences[hashValue] = [key];
                }
            }
        }
    } while (cursor !== '0'); // Continue scanning until the cursor wraps around
    for (const [hashValue, keys] of Object.entries(hashOccurrences)) {
        if (keys.length > 1) {
            nonUniqueHashes.push({
                hashValue,
                keys
            });
        }
    }
    return nonUniqueHashes;
}
console.log(findNonUniqueHashes())