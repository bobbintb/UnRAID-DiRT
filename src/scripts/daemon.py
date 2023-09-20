import logging
import sys
import watchdog.events
import watchdog.observers
import time
import common
import logstuff
import sqlinstance


class Handler(watchdog.events.FileSystemEventHandler):
    '''def on_created(self, event):
        # moved from outside a wd to inside a wd counts as created
        if not event.is_directory:
            try:
                directory, file = common.splitFileName(event.src_path)
                stats = common.getFileStats(directory, file)
                dbinstance.addOrModify(stats, True)
                daemon_logger.debug(f'Created: {event.src_path}')
            except Exception as e:
                daemon_logger.error(f"Error handling event: {e}")'''

    def on_deleted(self, event):
        # a move from inside a watched directory to outside a watched directory counts as delete
        if not event.is_directory:
            try:
                directory, file = common.splitFileName(event.src_path)
                dbinstance.delete(directory, file)
                daemon_logger.debug(f'Deleted: {event.src_path}')
            except Exception as e:
                daemon_logger.error(f"Error handling event: {e}")

    #def on_modified(self, event):
    #    print("Watchdog received modified event - % s." % event.src_path)

    def on_moved(self, event):
        if not event.is_directory:
            try:
                if common.splitFileName(event.src_path)[0] == common.splitFileName(event.dest_path)[0]:
                    action = ' Renamed:'
                else:
                    action = '  Moved:'
                dbinstance.moveOrRename(event.src_path, event.dest_path)
                daemon_logger.debug(f'{action} {event.src_path}')
                daemon_logger.debug(f'     to: {event.dest_path}')
            except Exception as e:
                daemon_logger.error(f"Error handling event: {e}")

    def on_closed(self, event):
        # check for closed event, then compare modified time stamps. not sure if this is necessary though.
        if not event.is_directory:
            try:
                directory, file = common.splitFileName(event.src_path)
                stats = common.getFileStats(directory, file)
                dbinstance.addOrModify(stats)
                daemon_logger.debug(f'Modified: {event.src_path}')
            except Exception as e:
                daemon_logger.error(f"Error handling event: {e}")


if __name__ == "__main__":
    settings = common.loadConfig()
    src_path = settings["Settings"]["dir"]
    daemon_logger = logstuff.daemon()
    try:
        dbinstance = sqlinstance.JsonDatabase(settings['sqlite']['dbfile'])
    except Exception as e:
        print(e)
        sys.exit()
    daemon_logger.info("Starting DeDuper daemon...")
    event_handler = Handler()
    observer = watchdog.observers.Observer()
    observer.schedule(event_handler, path=src_path, recursive=True)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
