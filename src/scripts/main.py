import common
import json
import logging
import logstuff
import os
import time
import sqlinstance


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
    logging.info('Hashing files...')
    num_of_groups = len(allFiles)
    if hashtype == "partialHash":
        size = 1024
    else:
        size = -1
    for i, item in enumerate(allFiles.items()):
        size_key, group = item
        for inode, file_attr in group.items():
            file_attr[hashtype] = common.hashFiles(file_attr["files"][0], size_key, size)
        print(f"\r     {format(i + 1, ',')}/{format(num_of_groups, ',')}", end="")
    print("")

def filter_unique_sizes(allFiles):
    allFiles_filtered = {}
    for size in allFiles:
        if len(allFiles[size]) > 1:
            #logging.debug(f'There are {len(allFiles[size])} inode(s) of length {size}')
            allFiles_filtered[size] = allFiles[size]
            continue
        for inode in allFiles[size]:
            if len(allFiles[size][inode]['files']) > 1:
                #logging.debug(f'There are {len(allFiles[size])} inode(s) of length {size}')
                #logging.debug(f'There are {len(allFiles[size][inode]["files"])} files with inode {inode}')
                allFiles_filtered[size] = allFiles[size]
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


def prep_for_sql(allFiles):
    # inode is stored as string because JavaScript has issues with numbers over 15 digits. They are converted later.
    return [json.dumps({'dir': os.path.join(os.path.dirname(file), ""),
                        'file': os.path.basename(file),
                        'st_inode': str(inode),
                        'st_nlink': allFiles[size][inode]['st_nlink'],
                        'st_size': size,
                        'st_atime': allFiles[size][inode]['st_atime'],
                        'st_mtime': allFiles[size][inode]['st_mtime'],
                        'st_ctime': allFiles[size][inode]['st_ctime'],
                        'partialHash': allFiles[size][inode].get('partialHash'),
                        'fullHash': allFiles[size][inode].get('fullHash')})
            for size in allFiles for inode in allFiles[size] for file in allFiles[size][inode]['files']]


def main():
    logstuff.log('deduper.log')
    start_time = time.time()
    settings = common.loadConfig()

    # Scan
    logging.info(f"Scanning for files in \"{settings['Settings']['dir']}\"...")
    allFiles = _scan(settings["Settings"]["dir"])
    logging.info("done.")

    # Filter sizes
    logging.info("Filtering unique sizes... ")
    allFiles_no_unique_sizes = filter_unique_sizes(allFiles)
    logging.info("done.")

    # Filter hashes
    hasher(allFiles_no_unique_sizes, "partialHash")
    allFiles_no_unique_partHashes = filter_unique_hashes(allFiles_no_unique_sizes, "partialHash")
    logging.info("done.")

    # Filter hashes #2
    hasher(allFiles_no_unique_partHashes, "fullHash")
    allFiles_no_unique_Hashes = filter_unique_hashes(allFiles_no_unique_partHashes, "fullHash")
    logging.info("done.")

    # Add files to DB
    json_list = prep_for_sql(allFiles)
    dbFile = os.path.join(settings["Settings"]["dbfile"].strip('"'), "deduper.db")
    db = sqlinstance.JsonDatabase(dbFile)
    db.insert_data(json_list,logging)
    db.close()

    end_time = time.time()
    time_elapsed = end_time - start_time
    minutes, seconds = divmod(time_elapsed, 60)
    print("Time elapsed: {0:.0f} minutes and {1:.2f} seconds".format(minutes, seconds))

main()
