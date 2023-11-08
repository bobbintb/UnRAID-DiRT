from auditd_tools.event_parser import AuditdEventParser
import sys
import audit

p = AuditdEventParser()
for line in sys.stdin:
    for event in p.parseline(line):
        print(event['action'])  # -> opened-file
        print(event['filepath'])  # -> /home/joerg/tmp/hallo
        print(event['datetime'])  # -> 2022-05-30 13:55:17.020000