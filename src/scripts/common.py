import configparser
import logging
import os
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


def hashFiles(item, filesize, read_size=-1):
    # Not sure which method is better. Maybe see about 1k raw instead of hash or other improvements.
    # This reads the first 1k of the file
    '''
    try:
        f = open(item, 'rb')
        f_bytes = f.read(read_size)
        h = blake3(f_bytes).hexdigest()
        f.close()
        return h
    except Exception as e:
        print(e)
'''
    # This reads the middle 1k of the file.
    try:
        f = open(item, 'rb')
        if read_size == 1024:
            start_pos = max(0, (filesize // 2) - (read_size // 2))
            f.seek(start_pos)
        f_bytes = f.read(read_size)
        h = blake3(f_bytes).hexdigest()
        f.close()
        return h
    except Exception as e:
        print(e)