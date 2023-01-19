import configparser
import os
import logging

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
    return splitFileName[0], splitFileName[1]