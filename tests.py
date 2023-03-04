import common
import logging
import os
import shelve
import time
from humanfriendly import format_size

use_1_cache = True
use_2_cache = True
use_3_cache = True
use_4_cache = True
use_5_cache = True


def _scan(path):
    #logthing = logging.getLogger('_scan')
    file_groups = {}
    attributes = ["file",
                  "st_nlink",
                  "st_size",
                  "st_atime",
                  "st_mtime",
                  "st_ctime"]
    for entry in os.scandir(path):
        if entry.is_file():
            stats = entry.stat()
            inode = stats.st_ino
            if inode not in file_groups:
                file_groups[inode] = {'files': []}
            file_groups[inode]['files'].append(entry.path)
            file_groups[inode].update({key: getattr(stats, key) for key in dir(stats) if key in attributes})
        elif entry.is_dir():
            file_groups.update(_scan(entry.path))
    return file_groups

def prettySize(dict_of_dicts):
    total_size = sum(inner_dict['st_size'] for inner_dict in dict_of_dicts.values())
    return format_size(total_size)

def remove_unique_attr(allFiles, attr):
    logthing = logging.getLogger('remove_unique_attr')
    unique_attr = set()
    allFiles_non_unique = {key: value for key, value in allFiles.items() if value[attr] not in unique_attr and not unique_attr.add(value[attr])}
    length = len(allFiles)
    new_length = len(allFiles_non_unique)
    match attr:
        case "st_size":
            attrName = "file sizes"
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
    for i, item in enumerate(files.values()):
        item[type] = common._hash_files(item["files"][0], item["st_size"], size)
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






def main_shelve_scan():
    start_time = time.time()

    log()
    mainLog = logging.getLogger('main')

    # Load settings
    mainLog.debug('Loading settings.')
    settings = common.loadConfig()

    # Scan root directory for all files and get their metadata
    mainLog.debug('Beginning scan.')

    # allFiles = _scan(settings["Settings"]["dir"])
    if use_1_cache:
        with shelve.open('1-scan_cache.db') as cache:
            if 'allFiles' in cache:
                allFiles = cache['allFiles']
            else:
                allFiles = _scan(settings["Settings"]["dir"])
                cache['allFiles'] = allFiles
        cache.close()
    else:
        allFiles = _scan(settings["Settings"]["dir"])

    mainLog.info(f"Unique file inodes found: {format(len(allFiles), ',')} ({prettySize(allFiles)})")

    # get partial hash (middle 1k) of possible dupes (files of exact same size. can't be dupes if different size)
    # if the middle 1k is different, then they can't be dupes. saves time hashing large files.


    #allFiles_no_unique_sizes = remove_unique_attr(allFiles, "st_size")

    if use_2_cache:
        with shelve.open('2-allFiles_no_unique_sizes_cache.db') as cache:
            if 'allFiles_no_unique_sizes' in cache:
                allFiles_no_unique_sizes = cache['allFiles_no_unique_sizes']
            else:
                allFiles_no_unique_sizes = remove_unique_attr(allFiles, "st_size")
                cache['allFiles_no_unique_sizes'] = allFiles_no_unique_sizes
        cache.close()
    else:
        allFiles_no_unique_sizes = remove_unique_attr(allFiles, "st_size")


    mainLog.debug('Hashing middle 1k of possible duplicates.')

    # hash(allFiles_no_unique_sizes, "partialHash")

    if use_3_cache:
        with shelve.open('3-partialHash.db') as cache:
            if 'partialHash' in cache:
                allFiles_no_unique_sizes = cache['partialHash']
            else:
                allFiles_no_unique_sizes = remove_unique_attr(allFiles, "st_size")
                cache['allFiles_no_unique_sizes'] = allFiles_no_unique_sizes
        cache.close()
    else:
        allFiles_no_unique_sizes = remove_unique_attr(allFiles, "st_size")

    if use_3_cache:
        with shelve.open('3-partialHash.db') as cache:
            allFiles_no_unique_sizes = cache['partialHash']
        cache.close()
    else:
        hash(allFiles_no_unique_sizes, "partialHash")

    # allFiles_no_unique_partHashes = remove_unique_attr(partialHash, "partialHash")
    if use_4_cache:
        with shelve.open('4-allFiles_no_unique_partHashes.db') as cache:
            allFiles_no_unique_partHashes = cache['allFiles_no_unique_partHashes']
        cache.close()
    else:
        allFiles_no_unique_partHashes = remove_unique_attr(allFiles_no_unique_sizes, "partialHash")

    # get full hash of possible dupes (files of the same size with hash of middle 1k the same)

    mainLog.debug('Fully hashing remaining possible duplicates.')
    #hash(allFiles_no_unique_partHashes, "fullHash")

    if use_4_cache:
        with shelve.open('4-allFiles_no_unique_partHashes.db') as cache:
            allFiles_no_unique_partHashes = cache['allFiles_no_unique_partHashes']
        cache.close()
    else:
        allFiles_no_unique_partHashes = remove_unique_attr(allFiles_no_unique_sizes, "partialHash")

    if use_5_cache:
        with shelve.open('5-fullHash.db') as cache:
            if 'fullHash' in cache:
                allFiles_no_unique_partHashes = cache['fullHash']
            else:
                hash(allFiles_no_unique_partHashes, "fullHash")
                cache['fullHash'] = allFiles_no_unique_partHashes
        cache.close()
    else:
        hash(allFiles_no_unique_partHashes, "fullHash")


    remove_unique_attr(allFiles_no_unique_partHashes, "fullHash")

    mainLog.debug('Done.')


    #instance.settings.update_one({'_id': 1}, {'$set': {'status': 'ready'}}, upsert=True)

    end_time = time.time()
    time_elapsed = end_time - start_time
    minutes, seconds = divmod(time_elapsed, 60)
    print("Time elapsed: {0:.0f} minutes and {1:.2f} seconds".format(minutes, seconds))


main_shelve_scan()

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