import sys
import pymongo
import mongoInstance
import os
from blake3 import blake3
import common
import logging
from collections import defaultdict
import time
import humanfriendly


def _scan(rootdir):
    log = logging.getLogger('_scan')
    allFiles = []
    x = 0
    log.info('Traversing folders...')
    for folder, subfolders, files in os.walk(rootdir, topdown=True):
        for file in files:
            allFiles.append(common.getFileStats(folder, file))
            x += 1
    log.info("Files found: " + "{:,}".format(x))
    total = sum(d.get("st_size", 0) for d in allFiles)
    totalpretty = format(total, ",")
    log.info(f"Total size: {humanfriendly.format_size(total)} ({totalpretty} bytes)")
    return allFiles

def remove_unique_sizes(LOD):
    log = logging.getLogger('remove_unique_sizes')
    size_counts = {}
    length = len(LOD)
    for d in LOD:
        size = d[0]["st_size"]
        if size in size_counts:
            size_counts[size] += 1
        else:
            size_counts[size] = 1
    LOD[:] = [d for d in LOD if size_counts[d[0]["st_size"]] > 1]
    new_length = len(LOD)
    log.info(f"After omitting {format(length-new_length, ',')} unique file sizes: {format(new_length, ',')}")


def remove_unique_hashes(LOD, type):
    log = logging.getLogger('remove_unique_hashes')
    hash_counts = {}
    length = len(LOD)
    for d in LOD:
        hash = d[0][type].hexdigest()
        if hash in hash_counts:
            hash_counts[hash] += 1
        else:
            hash_counts[hash] = 1
    LOD[:] = [d for d in LOD if hash_counts[d[0][type].hexdigest()] > 1]
    new_length = len(LOD)
    log.info(f"After omitting {format(length-new_length, ',')} unique hashes: {format(new_length, ',')}")


def group_by_ino(LOD):
    log = logging.getLogger('group_by_ino')
    length = len(LOD)
    grouped = defaultdict(list)
    for d in LOD:
        ino = d["st_ino"]
        grouped[ino].append(d)
    LOD[:] = list(grouped.values())
    new_length = len(LOD)
    log.info(f"After omitting {format(length-new_length, ',')} hard linked files: {format(new_length, ',')}")


def main():
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
    mainLog = logging.getLogger('main')

# Load settings
    mainLog.debug('Loading settings.')
    settings = common.loadConfig()

# Create DB instance
    mainLog.debug('Connecting to and creating database.')
    try:
        instance = mongoInstance.Instance(settings['Mongodb'])
    except Exception as e:
        print(e)
        sys.exit()
    instance.settings.update_one({'_id': 1}, {'$set': {'status': 'scanning'}}, upsert=True)

# Scan root directory for all files and get their metadata
    mainLog.debug('Beginning scan.')
    allFiles = _scan(settings["Settings"]["dir"])

# Add files to DB
    mainLog.debug('Adding file metadata to database.')
    instance.collection.insert_many(allFiles)

# get partial hash (middle 1k) of possible dupes (files of exact same size. can't be dupes if different size)
# if the middle 1k is different, then they can't be dupes. saves time hashing large files.
    mainLog.debug('Hashing middle 1k of possible duplicates.')
    group_by_ino(allFiles)
    remove_unique_sizes(allFiles)
    common.hashFiles(allFiles, instance.collection, 1024)

# get full hash of possible dupes (files of the same size with hash of middle 1k the same)
    remove_unique_hashes(allFiles, "partialHash")
    mainLog.debug('Fully hashing remaining possible duplicates.')
    common.hashFiles(allFiles, instance.collection, -1)
    instance.settings.update_one({'_id': 1}, {'$set': {'status': 'ready'}}, upsert=True)
    remove_unique_hashes(allFiles, "fullHash")
    mainLog.debug('Done.')


start_time = time.time()
main()
end_time = time.time()
time_elapsed = end_time - start_time
minutes, seconds = divmod(time_elapsed, 60)
print("Time elapsed: {0:.0f} minutes and {1:.2f} seconds".format(minutes, seconds))

'''
make an update function:
does it make sense to rescan and update or just start over?
update because it could save time with hashing.
1. rescan directory
2. get collection
3. separate collection into files that exist and those that dont
4. delete those that don't exist anymore from the collection.
how to match files? by dir/name or inode?
'''

'''
Install
go to settings page
start daemon - daemon queues items until scan complete
scan
process queue
start flask api
'''
