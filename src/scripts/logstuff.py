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



def sql(log_file='sql.log'):
    sql_logger = logging.getLogger('sql')
    sql_logger.setLevel(logging.DEBUG)
    sql_file_handler = logging.FileHandler(log_file)
    sql_file_handler.setFormatter(FileFormatter(style='{'))
    sql_console_handler = logging.StreamHandler()
    sql_console_handler.setFormatter(StreamFormatter(style='{'))
    sql_logger.addHandler(sql_file_handler)
    sql_logger.addHandler(sql_console_handler)
    return sql_logger

def daemon(log_file='/tmp/daemon.log'):
    daemon_logger = logging.getLogger('daemon')
    daemon_logger.setLevel(logging.DEBUG)
    daemon_file_handler = logging.FileHandler(log_file)
    daemon_file_handler.setFormatter(FileFormatter(style='{'))
    daemon_console_handler = logging.StreamHandler()
    daemon_console_handler.setFormatter(StreamFormatter(style='{'))
    daemon_logger.addHandler(daemon_file_handler)
    daemon_logger.addHandler(daemon_console_handler)
    return daemon_logger

def scan(log_file='deduper.log'):
    scan_logger = logging.getLogger('scan')
    scan_logger.setLevel(logging.INFO)
    scan_file_handler = logging.FileHandler(log_file)
    scan_file_handler.setFormatter(FileFormatter(style='{'))
    scan_console_handler = logging.StreamHandler()
    scan_console_handler.setFormatter(StreamFormatter(style='{'))
    scan_logger.addHandler(scan_file_handler)
    scan_logger.addHandler(scan_console_handler)
    return scan_logger
