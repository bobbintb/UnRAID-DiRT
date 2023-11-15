from auditd_tools.event_parser import AuditdEventParser
import sys
import audit
import logstuff
import asyncio
from collections import deque

async def input_handler():
    while True:
        event = event_deque.pop()
        daemon_logger.info(event)



daemon_logger = logstuff.daemon()
event_deque = deque()
asyncio.run(input_handler())

p = AuditdEventParser()
for line in sys.stdin:
    daemon_logger.info('Processing started')
    for event in p.parseline(line):
        event_deque.appendleft(event)