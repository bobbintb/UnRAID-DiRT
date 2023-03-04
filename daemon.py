import asyncio
import sys
from hachiko.hachiko import AIOWatchdog, AIOEventHandler
import logging
import common
import mongoInstance

EVENT_TYPE_MOVED = "moved"
EVENT_TYPE_DELETED = "deleted"
EVENT_TYPE_CREATED = "created"
EVENT_TYPE_MODIFIED = "modified"
EVENT_TYPE_CLOSED = "closed"

class MyEventHandler(AIOEventHandler):
    """Subclass of asyncio-compatible event handler."""
    def __init__(self, loop=None):
        self._loop = loop or asyncio.get_event_loop()
        # prefer asyncio.create_task starting from Python 3.7
        if hasattr(asyncio, "create_task"):
            self._ensure_future = asyncio.create_task
        else:
            self._ensure_future = asyncio.ensure_future
        self._method_map = {
            EVENT_TYPE_MODIFIED: self.on_modified,
            EVENT_TYPE_MOVED: self.on_moved,
            EVENT_TYPE_CREATED: self.on_created,
            EVENT_TYPE_DELETED: self.on_deleted,
            EVENT_TYPE_CLOSED: self.on_closed,
        }
        self.file_created = False

    async def on_created(self, event):
        if not event.is_directory:
            self.file_created = True
            action = "Created:"
            directory, file = common.splitFileName(event.src_path)
            stats = common.getFileStats(directory, file)
            dbinstance.addOrModify(stats)
            print(action, event.src_path)
            logging.info(f'{action} {event.src_path}')


    async def on_deleted(self, event):
        if not event.is_directory:
            directory, file = common.splitFileName(event.src_path)
            dbinstance.delete(directory, file)
            print(f'Deleted: {event.src_path}')
            logging.info(f'Deleted: {event.src_path}')

    async def on_moved(self, event):
        if not event.is_directory:
            dbinstance.moveOrRename(event.src_path, event.dest_path)
            action = '  Moved:'
            if common.splitFileName(event.src_path)[0] == common.splitFileName(event.dest_path)[0]:
                action = ' Renamed:'
            print(action, event.src_path)
            print('     to:', event.dest_path)
            logging.info(f'{action} {event.src_path}')
            logging.info(f'     to: {event.dest_path}')

    async def on_closed(self, event):
        if not event.is_directory:
            if not self.file_created:
                action = "Modified:"
                directory, file = common.splitFileName(event.src_path)
                stats = common.getFileStats(directory, file)
                dbinstance.addOrModify(stats)
                print(action, event.src_path)
                logging.info(f'{action} {event.src_path}')


async def watch_fs(watch_dir):
    evh = MyEventHandler()
    watch = AIOWatchdog(watch_dir, event_handler=evh)
    watch.start()
    while True:
        await asyncio.sleep(1)

WATCH_DIRECTORY = common.loadConfig()["Settings"]["dir"]

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(name)-12s %(levelname)-8s %(message)s',
                    datefmt='%m-%d %H:%M',
                    filename='daemon.log',
                    filemode='a')

# Create DB instance
settings = common.loadConfig()
try:
    dbinstance = mongoInstance.Instance(settings['Mongodb'])
except Exception as e:
    print(e)
    sys.exit()

asyncio.run(watch_fs(WATCH_DIRECTORY))
