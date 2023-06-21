import logging

class FileFormatter(logging.Formatter):
    def format(self, record):
        record.asctime = self.formatTime(record, self.datefmt)
        self.FORMATS = {
            logging.DEBUG: f'DEBUG    {record.asctime} - {record.getMessage()} ({record.filename} {record.funcName} {record.lineno})',
            logging.INFO: f'INFO     {record.asctime} - {record.getMessage()}',
            logging.WARNING: f'WARNING  {record.asctime} - {record.getMessage()}',
            logging.ERROR: f'ERROR    {record.asctime} - {record.getMessage()}\n{" "*35}Error generated from file {record.filename}, method {record.funcName}, line {record.lineno}',
            logging.CRITICAL: f'CRITICAL {record.asctime} - {record.getMessage()}\n{" "*35}Critical error generated from file {record.filename}, method {record.funcName}, line {record.lineno}',
        }
        return self.FORMATS.get(record.levelno)

class StreamFormatter(logging.Formatter):
    def format(self, record):
        record.asctime = self.formatTime(record, self.datefmt)
        c = {
                    'reset': '\x1b[0m',
                    'black': '\x1b[30m',
                    'red': '\x1b[31m',
                    'green': '\x1b[32m',
                    'yellow': '\x1b[33m',
                    'blue': '\x1b[34m',
                    'Dred': '\x1b[91m',
                    'cyan': '\x1b[36m',
                    'white': '\x1b[37m',
                    'bold': '\x1b[1m',
                    'underline': '\x1b[4m'
                }
        self.FORMATS = {
            logging.DEBUG: f'{c["blue"]}DEBUG    {record.asctime} - {record.getMessage()} ({record.filename} {record.funcName} {record.lineno}){c["reset"]}',
            logging.INFO: f'{c["white"]}{record.getMessage()}{c["reset"]}',
            logging.WARNING: f'{c["yellow"]}WARNING  {record.asctime} - {record.getMessage()}{c["reset"]}',
            logging.ERROR: f'{c["red"]}ERROR    {record.asctime} - {record.getMessage()}\n{" " * 35}Error generated from file {record.filename}, method {record.funcName}, line {record.lineno}{c["reset"]}',
            logging.CRITICAL: f'{c["Dred"]}CRITICAL {record.asctime} - {record.getMessage()}\n{" " * 35}Critical error generated from file {record.filename}, method {record.funcName}, line {record.lineno}{c["reset"]}',
        }
        return self.FORMATS.get(record.levelno)



def log(logname):
    file_handler = logging.FileHandler(logname)
    file_handler.setFormatter(FileFormatter(style='{'))
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(StreamFormatter(style='{'))
    logging.basicConfig(
        level=logging.INFO,
        handlers=[file_handler, console_handler],
    )


if __name__ == "__main__":
    log()
    logging.debug("This is a debug message")
    logging.info("This is an info message")
    logging.warning("This is a warning message")
    logging.error("This is an error message")
    logging.critical("This is a critical message")
