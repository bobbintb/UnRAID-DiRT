import asyncio
import sys
from hachiko.hachiko import AIOWatchdog, AIOEventHandler
import logging
import common
import logstuff
import sqlinstance
import signal

EVENT_TYPE_MOVED = "moved"
EVENT_TYPE_DELETED = "deleted"
EVENT_TYPE_CREATED = "created"
EVENT_TYPE_MODIFIED = "modified"
EVENT_TYPE_CLOSED = "closed"
EVENT_TYPE_OPENED = "opened"
WATCH_DIRECTORY = common.loadConfig()["Settings"]["dir"]

class MyEventHandler(AIOEventHandler):
    """Subclass of asyncio-compatible event handler."""
    def __init__(self, q, loop=None):
        self.q = q
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
            EVENT_TYPE_OPENED: self.on_opened,
        }
        self.file_created = False

    async def on_created(self, event):
        if not event.is_directory:
            try:
                await self.q.put(event)
                self.file_created = True
                action = "Created:"
                directory, file = common.splitFileName(event.src_path)
                stats = common.getFileStats(directory, file)
                dbinstance.addOrModify(stats, True, logging)
                logging.info(f'{action} {event.src_path}')
            except Exception as e:
                print(f"Error handling event: {e}")

    async def on_deleted(self, event):
        if not event.is_directory:
            try:
                await self.q.put(event)
                directory, file = common.splitFileName(event.src_path)
                dbinstance.delete(directory, file, logging)
                logging.info(f'Deleted: {event.src_path}')
            except Exception as e:
                logging.error(f"Error handling event: {e}")

    async def on_moved(self, event):
        if not event.is_directory:
            try:
                await self.q.put(event)
                if common.splitFileName(event.src_path)[0] == common.splitFileName(event.dest_path)[0]:
                    action = ' Renamed:'
                else:
                    action = '  Moved:'
                dbinstance.moveOrRename(event.src_path, event.dest_path, logging)
                logging.info(f'{action} {event.src_path}')
                logging.info(f'     to: {event.dest_path}')
            except Exception as e:
                logging.error(f"Error handling event: {e}")

    async def on_closed(self, event):
        if not event.is_directory:
            try:
                await self.q.put(event)
                if not self.file_created:
                    action = "Modified:"
                    directory, file = common.splitFileName(event.src_path)
                    stats = common.getFileStats(directory, file)
                    dbinstance.addOrModify(stats, False, logging)
                    logging.info(f'{action} {event.src_path}')
            except Exception as e:
                logging.error(f"Error handling event: {e}")

    async def on_opened(self, event):
        pass


class GracefulKiller:
    kill_now = False

    def __init__(self):
        signal.signal(signal.SIGINT, self.exit_gracefully)
        signal.signal(signal.SIGTERM, self.exit_gracefully)

    def exit_gracefully(self, *args):
        self.kill_now = True

async def watch_fs(watch_dir):
    q = asyncio.Queue()
    evh = MyEventHandler(q)
    watch = AIOWatchdog(watch_dir, event_handler=evh)
    watch.start()
    killer = GracefulKiller()
    while not killer.kill_now:
        await q.get()
        await asyncio.sleep(1)
        q.task_done()
    print("DeDuper daemon has been gracefully shut down.")



# Create DB instance
settings = common.loadConfig()
logstuff.log('daemon.log')
try:
    dbinstance = sqlinstance.JsonDatabase(settings['sqlite']['dbfile'])
except Exception as e:
    print(e)
    sys.exit()
logging.info("Starting DeDuper daemon...")
asyncio.run(watch_fs(WATCH_DIRECTORY))
