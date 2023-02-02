import sys
import pymongo
import mongoInstance
import os
from blake3 import blake3
import common
import logging
from collections import defaultdict
import time


def _scan(rootdir):
    scanLog = logging.getLogger('_scan')
    allFiles = []
    x = 0
    scanLog.debug('Traversing folders.')
    for folder, subfolders, files in os.walk(rootdir, topdown=True):
        for file in files:
            allFiles.append(common.getFileStats(folder, file))
            x += 1
    scanLog.info("Files found: " + "{:,}".format(x))
    #for i, file in enumerate(allFiles):
    #   print("Adding file", str("{:,}".format(i + 1)) + "/" + str("{:,}".format(len(allFiles))), end= "\r")
    return allFiles

def remove_unique_sizes(LOD):
    size_counts = {}
    for d in LOD:
        size = d["st_size"]
        if size in size_counts:
            size_counts[size] += 1
        else:
            size_counts[size] = 1
    LOD[:] = [d for d in LOD if size_counts[d["st_size"]] > 1]
    print(f"Files with non-unique sizes: {len(LOD)}")


def remove_unique_partial_hash(LOD):
    hash_counts = {}
    for d in LOD:
        hash = d[0]["partialHash"].hexdigest()
        if hash in hash_counts:
            hash_counts[hash] += 1
        else:
            hash_counts[hash] = 1
    LOD[:] = [d for d in LOD if hash_counts[d[0]["partialHash"].hexdigest()] > 1]
    print(f"Files with non-unique hashes: {len(LOD)}")


def group_by_ino(LOD):
    grouped = defaultdict(list)
    for d in LOD:
        ino = d["st_ino"]
        grouped[ino].append(d)
    LOD[:] = list(grouped.values())
    print(f"File inode groups: {len(LOD)}")

def hashFiles(item, read_size):
    try:

        f = open(os.path.join(item['dir'], item['file']), 'rb')
        if read_size == 1024:
            start_pos = max(0, item['st_size'] // 2 - 512)
            f.seek(start_pos)
        f_bytes = f.read(read_size)
        h = blake3(f_bytes)
        f.close()
        return h
    except Exception as e:
        print(e)

def _hash_files(db_data, collection, read_size):
    if read_size == 1024:
        phase = 1
    else:
        phase = 2
    requests = []
    if read_size == -1:
        hashL = "fullHash"
    else:
        hashL = "partialHash"
    #length = count._CommandCursor__data[0]['root']
    length = len(db_data)
    for i, group in enumerate(db_data):
        # if (int(item["st_size"]) <= 1024) and (read_size == -1):  # Skip files smaller than 1k when doing full hash.
        #    pass
        # TODO: try catch for missing files, should they be deleted midprocess
        print(f"\r(Phase {phase} of 2) Hashing file {i + 1} of {length}...", end="")
        h = hashFiles(group[0], read_size)
        for item in group:
            b = pymongo.operations.UpdateOne({'_id': item['_id']}, {'$set': {hashL: h.hexdigest()}})
            item['partialHash'] = h
            requests.append(b)
    print('done.')
    collection.bulk_write(requests)
    if read_size == -1:
        return db_data


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

# get partial hash (first 1k) of possible dupes (files of exact same size. can't be dupes if different size)
# if the first 1k is different, then they can't be dupes. saves time hashing large files.
    mainLog.debug('Hashing first 1k of possible duplicates.')
    remove_unique_sizes(allFiles)
    group_by_ino(allFiles)
    _hash_files(allFiles, instance.collection, 1024)

# get full hash of possible dupes (files of the same size with hash of firs 1k the same)
    remove_unique_partial_hash(allFiles)
    mainLog.debug('Fully hashing remaining possible duplicates.')
    _hash_files(allFiles, instance.collection, -1)
    instance.settings.update_one({'_id': 1}, {'$set': {'status': 'ready'}}, upsert=True)
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