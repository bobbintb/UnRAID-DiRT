export async function checkDatabaseExists(r, dbName) {
    let dbList = await r.dbList().run();
    if (dbList.includes(dbName)) {
        console.log(`Database '${dbName}' exists.`);
    } else {
        console.log(`Database '${dbName}' does not exist. Creating it now.`);
        await r.dbCreate(dbName).run();
        console.log(`Database '${dbName}' has been created.`);
    }
    await checkTableExists(r, dbName, 'files');
}

async function checkTableExists(r, dbName, tableName) {
    let tableList = await r.db(dbName).tableList().run();
    if (tableList.includes(tableName)) {
        console.log(`Table '${tableName}' exists in database '${dbName}'.`);
    } else {
        console.log(`Table '${tableName}' does not exist in database '${dbName}'. Creating it now.`);
        await r.db(dbName).tableCreate(tableName).run();
        console.log(`Table '${tableName}' has been created in database '${dbName}'.`);
    }
}

export async function deleteFromDB(r, dbName, tableName, ino, pathToRemove) {
    let document = await r.db(dbName).table(tableName).filter({ino: ino}).run();
    if (document.length > 0) {
        const paths = document[0].paths;
        if (paths.length === 1 && paths.includes(pathToRemove)) {
            let result = await r.db(dbName).table(tableName).get(document[0].id).delete().run();
            console.log(`Document with inode '${ino}' deleted from table '${tableName}' in database '${dbName}' as it had only one path.`);
            return result;
        } else if (paths.includes(pathToRemove)) {
            let updatedPaths = paths.filter(path => path !== pathToRemove);
            let result = await r.db(dbName).table(tableName).get(document[0].id).update({paths: updatedPaths}).run();
            console.log(`Path '${pathToRemove}' removed from inode '${ino}' in table '${tableName}' in database '${dbName}'.`);
            return result;
        } else {
            console.log(`Path '${pathToRemove}' does not exist in the document.`);
            return null;
        }
    } else {
        console.log(`Document with inode '${ino}' not found.`);
        return null;
    }
}