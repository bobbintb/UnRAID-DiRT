const { findBySize, findByPath, findWithMultiplePaths, findWithNonUniqueHashes } = require('./redis');

async function debugFindFileByPath(path) {
    console.log(`Executing debug query: findByPath with path ${path}`);
    const results = await findByPath(path);
    console.log(`Found ${results.length} files with path ${path}:`);
    console.dir(results, { depth: null });
    return results;
}

async function debugFindFilesBySize(size) {
    console.log(`Executing debug query: findBySize with size ${size}`);
    const results = await findBySize(size);
    console.log(`Found ${results.length} files of size ${size}:`);
    console.dir(results, { depth: null });
    return results;
}

async function debugFindFilesWithMultiplePaths() {
    console.log('Executing debug query: findWithMultiplePaths');
    const results = await findWithMultiplePaths();
    console.log(`Found ${results.length} files with multiple paths:`);
    console.dir(results, { depth: null });
    return results;
}

async function debugFindFilesWithNonUniqueHashes() {
    console.log('Executing debug query: findWithNonUniqueHashes');
    const results = await findWithNonUniqueHashes();
    console.log(`Found ${results.length} files with non-unique hashes:`);
    console.dir(results, { depth: null });
    return results;
}

module.exports = {
    debugFindFileByPath,
    debugFindFilesBySize,
    debugFindFilesWithMultiplePaths,
    debugFindFilesWithNonUniqueHashes,
};