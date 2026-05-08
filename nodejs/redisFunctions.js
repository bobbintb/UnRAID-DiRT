let getRedisClient;
let getFileMetadataRepository;
let findWithMultiplePathsScriptSha;
let findWithNonUniqueHashesScriptSha;
let findDuplicatesScriptSha;

function init(dependencies) {
    getRedisClient = dependencies.getRedisClient;
    getFileMetadataRepository = dependencies.getFileMetadataRepository;
    findWithMultiplePathsScriptSha = dependencies.findWithMultiplePathsScriptSha;
    findWithNonUniqueHashesScriptSha = dependencies.findWithNonUniqueHashesScriptSha;
    findDuplicatesScriptSha = dependencies.findDuplicatesScriptSha;
}

function parseHGetAll(result) {
	const parsed = {};
	for (let i = 0; i < result.length; i += 2) {
		parsed[result[i]] = result[i + 1];
	}
	return parsed;
}

async function findBySize(size) {
	const repository = getFileMetadataRepository();
	return await repository.search().where("size").equals(size).return.all();
}

async function findByPath(path) {
    const repository = getFileMetadataRepository();
    // For a TAG index on a string array, .contains() provides an exact match for one of the elements.
    return await repository.search().where('path').contains(path).return.all();
}

async function findWithMultiplePaths() {
	const repository = getFileMetadataRepository();
    const redisClient = getRedisClient();
	const prefix = 'ino';

	const keys = await redisClient.evalSha(
		findWithMultiplePathsScriptSha,
		{
			keys: [],
			arguments: [`${prefix}:*`],
		},
	);

	return Promise.all(keys.map(key => repository.fetch(key.split(':').pop())));
}

async function findWithNonUniqueHashes() {
	const repository = getFileMetadataRepository();
    const redisClient = getRedisClient();
	const prefix = 'ino';
	const separator = ':';


	const groupedKeys = await redisClient.evalSha(
		findWithNonUniqueHashesScriptSha,
		{
			keys: [],
			arguments: [`${prefix}${separator}*`],
		},
	);

	// The Lua script returns an array of arrays, where each inner array
	// is a group of keys for a set of duplicate files.
	return Promise.all(
		groupedKeys.map(keyGroup =>
			Promise.all(keyGroup.map(key => repository.fetch(key.split(':').pop())))
		)
	);
}

async function getAllFiles() {
    const repository = getFileMetadataRepository();
    // An empty search returns all entities.
    return await repository.search().return.all();
}

async function findDuplicates() {
    const repository = getFileMetadataRepository();
    const redisClient = getRedisClient();

    const flatResult = await redisClient.evalSha(findDuplicatesScriptSha, {
        keys: [],
        arguments: [],
    });

    // Parse the flat array: [hash, key1, key2, '---', hash2, keyA, keyB]
    const groupedKeys = [];
    let currentGroup = null;
    for (const item of flatResult) {
        if (item === '---') {
            if (currentGroup) {
                groupedKeys.push(currentGroup);
            }
            currentGroup = null;
        } else if (currentGroup === null) {
            currentGroup = { hash: item, keys: [] };
        } else {
            currentGroup.keys.push(item);
        }
    }
    if (currentGroup) {
        groupedKeys.push(currentGroup);
    }

    // Fetch the full entity for each key and structure the final result
    const result = await Promise.all(
        groupedKeys.map(async (group) => {
            const files = await Promise.all(
                group.keys.map(async (key, index) => {
                    // Extract the entity ID from the full Redis key (e.g., 'ino:12345')
                    const entityId = key.split(':').pop();
                    const fileEntity = await repository.fetch(entityId);
                    return {
                        ino: entityId,
                        path: fileEntity.path.join('<br>'), // Join for display on new lines
                        size: fileEntity.size,
                        nlink: fileEntity.nlink,
                        atime: fileEntity.atime,
                        mtime: fileEntity.mtime,
                        ctime: fileEntity.ctime,
                        isFirstChild: index === 0, // Flag the first child for default radio selection
                    };
                })
            );

            // Calculate the total size of all files in the group
            const totalSize = files.reduce((acc, file) => acc + file.size, 0);

            return {
                hash: group.hash,
                count: files.length,
                totalSize: totalSize,
                files: files,
            };
        })
    );

    return result;
}

async function getActionQueue() {
    const redisClient = getRedisClient();
    return await redisClient.hGetAll('queue');
}

module.exports = {
    init,
    getActionQueue,
    parseHGetAll,
    findBySize,
    findByPath,
    findWithMultiplePaths,
    findWithNonUniqueHashes,
    getAllFiles,
    findDuplicates,
};