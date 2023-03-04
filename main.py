import shelve
import sys
from itertools import groupby
from statistics import mean
from timeit import timeit, repeat
from collections import Counter
import mongoInstance
import os
import common
import logging
from collections import defaultdict
import time
from humanfriendly import format_size


def _scan(path):
    #logthing = logging.getLogger('_scan')
    file_groups = {}
    attributes = ["file",
                  "st_nlink",
                  "st_atime",
                  "st_mtime",
                  "st_ctime"]
    for entry in os.scandir(path):
        if entry.is_file():
            stats = entry.stat()
            size = stats.st_size
            inode = stats.st_ino
            if size not in file_groups:
                file_groups[size] = {}
            if inode not in file_groups[size]:
                file_groups[size][inode] = {'files': []}
            file_groups[size][inode]['files'].append(entry.path)
            file_groups[size][inode].update({key: getattr(stats, key) for key in dir(stats) if key in attributes})
        elif entry.is_dir():
            file_groups.update(_scan(entry.path))
    return file_groups

def prettySize(dict_of_dicts):
    #total_size = sum(size for size in dict_of_dicts.values())
    return format_size(0)

def remove_unique_attr(allFiles, attr):
    logthing = logging.getLogger('remove_unique_attr')
    unique_attr = set()
    #allFiles_non_unique = {key: value for key, value in allFiles.items() if value[attr] not in unique_attr and not unique_attr.add(value[attr])}
    # not sure if this is right...
    all_partial_hashes = [attributes['partialHash']
                          for files in allFiles.values()
                          for attributes in files.values()]
    for item in all_partial_hashes:
        print(item)

    with open('partial_hashes.txt', 'w') as file:
        for partial_hash in all_partial_hashes:
            file.write(partial_hash + '\n')
    allFiles_non_unique = {size: {inode: attributes for inode, attributes in files.items()
                                  if len([i for i in files.values() if i['partialHash'] == attributes['partialHash']]) > 1}
                           for size, files in allFiles.items()
                           if any(len([i for i in files.values() if i['partialHash'] == attributes['partialHash']]) > 1
                                  for inode, attributes in files.items())}

    length = len(allFiles)
    new_length = len(allFiles_non_unique)
    match attr:
        case "partialHash":
            attrName = "partial hashes"
        case "fullHash":
            attrName = "hashes"
    logthing.info(f"After omitting {format(length - new_length, ',')} unique {attrName}: {format(new_length, ',')} ({prettySize(allFiles_non_unique)})")
    return allFiles_non_unique


def hash(files, type):
    num_of_groups = len(files)
    if type == "partialHash":
        size = 1024
    else:
        size = -1
    for i, item in enumerate(files.items()):
        size_key, group = item
        for inode, file_attr in group.items():
            file_attr[type] = common._hash_files(file_attr["files"][0], size_key, size)
        print(f"\r     Hashing file {format(i+1, ',')}/{format(num_of_groups, ',')}", end="")
    print("")

def log():
    logging.basicConfig(level=logging.DEBUG,
                        format='%(asctime)s %(name)-12s %(levelname)-8s %(message)s',
                        datefmt='%m-%d %H:%M',
                        filename='main.log',
                        filemode='w')
    # define a Handler which writes INFO messages or higher to the sys.stderr
    console = logging.StreamHandler()
    console.setLevel(logging.INFO)
    # tell the handler to use this format
    console.setFormatter(common.CustomFormatter())
    # add the handler to the root logger
    logging.getLogger().addHandler(console)


def main():
    start_time = time.time()

    log()
    mainLog = logging.getLogger('main')
    mainLog.debug('Loading settings.')
    settings = common.loadConfig()
    mainLog.debug('Connecting to and creating database.')
    try:
        instance = mongoInstance.Instance(settings['Mongodb'])
    except Exception as e:
        print(e)
        sys.exit()
    instance.settings.update_one({'_id': 1}, {'$set': {'status': 'scanning'}}, upsert=True)

    mainLog.debug('Beginning scan.')
    allFiles = _scan(settings["Settings"]["dir"])
    mainLog.info(f"Unique file inodes found: {format(len(allFiles), ',')} ({prettySize(allFiles)})")

    mainLog.debug('Hashing middle 1k of possible duplicates.')
    hash(allFiles, "partialHash")
    allFiles_no_unique_partHashes = remove_unique_attr(allFiles, "partialHash")

    '''mainLog.debug('Fully hashing remaining possible duplicates.')
    hash(allFiles_no_unique_partHashes, "fullHash")
    remove_unique_attr(allFiles_no_unique_partHashes, "fullHash")
    mainLog.debug('Done.')'''


    #instance.settings.update_one({'_id': 1}, {'$set': {'status': 'ready'}}, upsert=True)

    end_time = time.time()
    time_elapsed = end_time - start_time
    minutes, seconds = divmod(time_elapsed, 60)
    print("Time elapsed: {0:.0f} minutes and {1:.2f} seconds".format(minutes, seconds))

 # Add files to DB
    #mainLog.debug('Adding file metadata to database.')
    #instance.collection.insert_many(allFiles)








main()

'''with shelve.open('scan_cache.db') as cache:
    if 'result' in cache:
        result = cache['result']
    else:
        # The cached result doesn't exist, so we need to run the slow method
        result = allFiles_no_unique_sizes
        # Save the result to the shelf file for future use
        cache['result'] = result'''

# with shelve.open('cache.db') as cache:
#   allFiles_no_unique_sizes = cache['result']