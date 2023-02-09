import asyncio
from hachiko.hachiko import AIOWatchdog, AIOEventHandler
import logging
import common
import mongoInstance


class MyEventHandler(AIOEventHandler):
    """Subclass of asyncio-compatible event handler."""
    async def on_created(self, event):
        directory, file = common.splitFileName(event.src_path)
        stats = common.getFileStats(directory, file)
        #mongoInstance.Instance.add(stats)
        print('Created:', event.src_path)
        print('       :', event)
        logging.info(f'Created: {event.src_path}')
        logging.info(f'       : {event}')

    async def on_deleted(self, event):
        directory, file = common.splitFileName(event.src_path)
        #mongoInstance.Instance.delete(directory, file)
        print('Deleted:', event.src_path)
        print('       :', event)
        logging.info(f'Deleted: {event.src_path}')
        logging.info(f'       : {event}')

    async def on_moved(self, event):
        #mongoInstance.Instance.moveOrRename(event.src_path, event.dest_path)
        print('Moved:', event.src_path)
        print('   to:', event.dest_path)
        print('       :', event)
        logging.info(f'Moved: {event.src_path}')
        logging.info(f'   to: {event.dest_path}')
        logging.info(f'       : {event}')
    #TODO: check if I need to do modified, if file changes, vs just metadata

    async def on_modified(self, event):
        directory, file = common.splitFileName(event.src_path)
        print('Modified:', event.src_path)
        print('       :', event)


async def watch_fs(watch_dir):
    evh = MyEventHandler()
    watch = AIOWatchdog(watch_dir, event_handler=evh)
    watch.start()
    while True:
        await asyncio.sleep(1)
    watch.stop()

WATCH_DIRECTORY = common.loadConfig()["Settings"]["dir"]

logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s %(name)-12s %(levelname)-8s %(message)s',
                    datefmt='%m-%d %H:%M',
                    filename='daemon.log',
                    filemode='w')
asyncio.run(watch_fs(WATCH_DIRECTORY))

