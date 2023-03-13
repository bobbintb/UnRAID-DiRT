import logging


class ColorFormatter(logging.Formatter):
    def format(self, record):
        COLOR_CODES = {
            logging.DEBUG: "36",  # cyan
            logging.INFO: "97",  # white
            logging.WARNING: "33",  # yellow
            logging.ERROR: "31",  # red
            logging.CRITICAL: "35",  # magenta
        }
        record.color_code = COLOR_CODES.get(record.levelno, "0")
        return super().format(record)

class CustomStreamHandler(logging.StreamHandler):
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            if msg.endswith('... \x1b[0m'):
                stream.write(msg)
            else:
                stream.write(msg + self.terminator)
            self.flush()
        except RecursionError:
            raise
        except Exception:
            self.handleError(record)


def log():
    file_handler = logging.FileHandler("deduper.log")
    file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(funcName)s: %(message)s"))
    console_handler = CustomStreamHandler()
    console_handler.setFormatter(ColorFormatter("\033[%(color_code)sm%(message)s\033[0m"))
    logging.basicConfig(
        level=logging.INFO,
        handlers=[file_handler, console_handler]
    )