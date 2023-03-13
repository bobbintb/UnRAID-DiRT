import logging
import sys
import logstuff
import mongoInstance
import os
import common
import time


def _scan(path):
    allFiles = {}
    for dirpath, dirnames, filenames in os.walk(path):
        for file in filenames:
            filepath = os.path.join(dirpath, file)
            statinfo = os.stat(filepath)
            size = statinfo.st_size
            inode = statinfo.st_ino
            allFiles.setdefault(size, {}).setdefault(inode, {}).setdefault('files', []).append(filepath)
            allFiles[size][inode]["st_nlink"] = statinfo.st_nlink
            allFiles[size][inode]["st_atime"] = statinfo.st_atime
            allFiles[size][inode]["st_mtime"] = statinfo.st_mtime
            allFiles[size][inode]["st_ctime"] = statinfo.st_ctime
    return allFiles


def hasher(allFiles, hashtype):
    num_of_groups = len(allFiles)
    if hashtype == "partialHash":
        size = 1024
    else:
        size = -1
    for i, item in enumerate(allFiles.items()):
        size_key, group = item
        for inode, file_attr in group.items():
            file_attr[hashtype] = common._hash_files(file_attr["files"][0], size_key, size)
        print(f"\rHashing file {format(i + 1, ',')}/{format(num_of_groups, ',')}", end="")
    print("")


def filter_unique_sizes(allFiles):
    allFiles_filtered = {}
    summed_value = 0
    file_count = 0
    for k, v in allFiles.items():
        if len(v) > 1:
            allFiles_filtered[k] = v
            summed_value += len(v)
            for item in v:
                file_count += len(v[item]["files"])
    logging.debug("")
    logging.debug(f"Sizes remaining after removing unique sizes: {format(len(allFiles_filtered), ',')}")
    logging.debug(f"Inodes remaining after removing unique sizes: {format(summed_value, ',')}")
    logging.debug(f"Files remaining after removing unique sizes: {format(file_count, ',')}")
    return allFiles_filtered


def filter_unique_hashes(allFiles, hashtype):
    hashCount = {}
    for key in allFiles:
        for innerKey in allFiles[key]:
            partialHash = allFiles[key][innerKey][hashtype]
            hashCount[partialHash] = hashCount.get(partialHash, 0) + 1
    nonUniqueHashes = {}
    for key in allFiles:
        innerNonUniqueHashes = {}
        for innerKey in allFiles[key]:
            partialHash = allFiles[key][innerKey][hashtype]
            if hashCount[partialHash] > 1:
                innerNonUniqueHashes[innerKey] = allFiles[key][innerKey]
        if innerNonUniqueHashes:
            nonUniqueHashes[key] = innerNonUniqueHashes
    return nonUniqueHashes


def prep_for_mongo(allFiles):
    return [{'file': os.path.basename(file),
             'dir': os.path.dirname(file),
             'st_size': size,
             'st_inode': inode,
             'st_nlink': allFiles[size][inode]['st_nlink'],
             'st_atime': allFiles[size][inode]['st_atime'],
             'st_mtime': allFiles[size][inode]['st_mtime'],
             'st_ctime': allFiles[size][inode]['st_ctime']}
            for size in allFiles for inode in allFiles[size] for file in allFiles[size][inode]['files']]


def main():
    logstuff.log()
    start_time = time.time()
    settings = common.loadConfig()
    try:
        instance = mongoInstance.Instance(settings['Mongodb'])
    except Exception as e:
        print(e)
        sys.exit()
    instance.settings.update_one({'_id': 1}, {'$set': {'status': 'scanning'}}, upsert=True)

    logging.info("Starting scan... ")
    allFiles = _scan(settings["Settings"]["dir"])
    logging.info("done.")

    logging.info("Filtering unique sizes... ")
    allFiles_no_unique_sizes = filter_unique_sizes(allFiles)
    logging.info("done.")

    hasher(allFiles_no_unique_sizes, "partialHash")
    allFiles_no_unique_partHashes = filter_unique_hashes(allFiles_no_unique_sizes, "partialHash")
    hasher(allFiles_no_unique_partHashes, "fullHash")
    allFiles_no_unique_Hashes = filter_unique_hashes(allFiles_no_unique_partHashes, "fullHash")

    mongo_list = prep_for_mongo(allFiles_no_unique_Hashes)

    # Add files to DB
    instance.collection.insert_many(mongo_list)
    instance.settings.update_one({'_id': 1}, {'$set': {'status': 'ready'}}, upsert=True)

    end_time = time.time()
    time_elapsed = end_time - start_time
    minutes, seconds = divmod(time_elapsed, 60)
    print("Time elapsed: {0:.0f} minutes and {1:.2f} seconds".format(minutes, seconds))


main()
