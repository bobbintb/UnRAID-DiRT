import sys
import pymongo
import mongoInstance
import os
from blake3 import blake3
import common
import logging


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
    print("")
    for i, file in enumerate(allFiles):
        print("Adding file", str("{:,}".format(i + 1)) + "/" + str("{:,}".format(len(allFiles))), end= "\r")
    print("")
    return allFiles


def hashFiles(item, read_size):
    try:
        f = open(os.path.join(item['dir'], item['file']), 'rb')
        f_bytes = f.read(read_size)
        h = blake3(f_bytes)
        f.close()
        return h
    except Exception as e:
        print(e)

def _hash_files(db_data, collection, count, read_size):
    # TODO: don't bother hashing hard links. need to think about efficient way to handle this.
    if read_size == 1024:
        phase = 1
    else:
        phase = 2
    requests = []
    if read_size == -1:
        hashL = "fullHash"
    else:
        hashL = "partialHash"
    length = count._CommandCursor__data[0]['root']
    for i, item in enumerate(db_data):
        # if (int(item["st_size"]) <= 1024) and (read_size == -1):  # Skip files smaller than 1k when doing full hash.
        #    pass
        # TODO: try catch for missing files, should they be deleted midprocess
        print(f"\r(Phase {phase} of 2) Hashing file {i + 1} of {length}...", end="")
        h = hashFiles(item, read_size)
        b = pymongo.operations.UpdateOne({'_id': item['_id']}, {'$set': {hashL: h.hexdigest()}})
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
    instance.possibleDupesSizeCount()
    instance.possibleDupesSize()
    _hash_files(instance.possibleDupesSize, instance.collection, instance.possibleDupesSizeCount, 1024)

    # get full hash of possible dupes (files of the same size with hash of firs 1k the same)
    mainLog.debug('Fully hashing remaining possible duplicates.')
    instance.possibleDupesHashCount()
    instance.possibleDupesHash()
    _hash_files(instance.possibleDupesHash, instance.collection, instance.possibleDupesHashCount, -1)
    instance.settings.update_one({'_id': 1}, {'$set': {'status': 'ready'}}, upsert=True)
    mainLog.debug('Done.')

main()

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