import configparser
import os
import logging
import random
from datetime import time

import pymongo
from blake3 import blake3


class CustomFormatter(logging.Formatter):
    grey = "\x1b[38;20m"
    yellow = "\x1b[33;20m"
    red = "\x1b[31;20m"
    bold_red = "\x1b[31;1m"
    reset = "\x1b[0m"
    format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s (%(filename)s:%(lineno)d)"

    FORMATS = {
        logging.DEBUG: grey + format + reset,
        logging.INFO: grey + "%(message)s" + reset,
        logging.WARNING: yellow + format + reset,
        logging.ERROR: red + format + reset,
        logging.CRITICAL: bold_red + format + reset
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)


def loadConfig():
    config = configparser.ConfigParser()
    config.read('config.ini')
    return {sect: dict(config.items(sect)) for sect in config.sections()}


def getFileStats(folder, file):
    stats = os.stat(os.path.join(folder, file))
    return {"dir": folder,
            "file": file,
            "st_ino": stats.st_ino,
            "st_nlink": stats.st_nlink,
            "st_size": stats.st_size,
            "st_atime": stats.st_atime,
            "st_mtime": stats.st_mtime,
            "st_ctime": stats.st_ctime}


def splitFileName(file):
    splitFileName = os.path.split(file)
    # dir, file
    return os.path.join(splitFileName[0], ''), splitFileName[1]


def _hash_files(item, filesize, read_size= -1):
    try:
        f = open(item, 'rb')
        f_bytes = f.read(read_size)
        h = blake3(f_bytes).hexdigest()
        f.close()
        return h
    except Exception as e:
        print(e)

    '''try:
        f = open(item, 'rb')
        if read_size == 1024:
            start_pos = max(0, (filesize // 2) - (read_size // 2))
            f.seek(start_pos)
        f_bytes = f.read(read_size)
        h = blake3(f_bytes).hexdigest()
        f.close()
        return h
    except Exception as e:
        print(e)'''


def hashFiles(db_data, collection, read_size):
    requests = []
    if read_size == -1:
        hashL = "fullHash"
    else:
        hashL = "partialHash"
    length = len(db_data)

    # [[print(f"\r     Hashing file {i + j * len(group) + 1:,}/{len(db_data) * len(group):,}") or hasher(d) for
    #  i, d in enumerate(group)] for j, group in enumerate(db_data)]

    total = sum(len(group) for group in db_data)

    for idx, group in enumerate(db_data, 1):
        partial_hash = _hash_files(group[0])
        for file in group:
            file['partialHash'] = partial_hash
        print(
            f"\r     Hashing file  {idx}/{len(db_data)} groups ({len(group)} files) - Total progress: {idx * len(group):,}/{total:,} files")

    '''for i, group in enumerate(db_data):
        # if (int(item["st_size"]) <= 1024) and (read_size == -1):  # Skip files smaller than 1k when doing full hash.
        #    pass
        print(f"\r     Hashing file {format(i + 1, ',')} of {format(length, ',')}...", end="")
        h = _hash_files(group[0], read_size).hexdigest()
        for item in group:
            item[hashL] = h
            # TODO fix this so it works with main and daemon. group needs another list
            b = pymongo.operations.UpdateOne({'_id': item['_id']}, {'$set': {hashL: h}})
            requests.append(b)'''
    print('done.')
    try:
        collection.bulk_write(requests)
    except Exception as e:
        print(e)
    if read_size == -1:
        return db_data
