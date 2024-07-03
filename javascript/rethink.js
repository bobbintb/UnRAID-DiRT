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

export async function deleteFromDB(r, dbName, tableName, id) {
    let result = await r.db(dbName).table(tableName).get(id).delete().run();
    console.log(`Deleted item with id '${id}' from table '${tableName}' in database '${dbName}'.`);
    return result;
}