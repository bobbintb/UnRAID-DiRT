from auditd_tools.event_parser import AuditdEventParser
import sys
import audit
import logstuff

daemon_logger = logstuff.daemon()
p = AuditdEventParser()
for line in sys.stdin:
    daemon_logger.info('Processing started')
    #for event in p.parseline(line):
        #daemon_logger.info(event['action'])  # -> opened-file
        #daemon_logger.info(event['filepath'])  # -> /home/joerg/tmp/hallo
        #daemon_logger.info(event['datetime'])  # -> 2022-05-30 13:55:17.020000