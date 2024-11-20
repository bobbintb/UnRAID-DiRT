import {fileRepository} from "./redisHelper.js";

async function dequeueDeleteFile(file) {
    console.log(file)
    const entity = await fileRepository.search()
        .where('path').contains(file)
        .return.first()
    console.log(entity)
    if (entity.path.length === 1) {
        await fileRepository.remove(entity[Object.getOwnPropertySymbols(entity).find(sym => sym.description === 'entityId')]);
    } else {
        entity.path = entity.path.filter(value => value !== file);
        await fileRepository.save(entity);
    }
}

dequeueDeleteFile('/mnt/user/downloads/TEST/New Text Document.txt')