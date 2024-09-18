echo "-----------------------------------------------------------"
echo "Installing NodeJS libraries..."
echo "-----------------------------------------------------------"
cd "/usr/local/emhttp/plugins/&name;"
npm install

echo "-----------------------------------------------------------"
echo "Configuring..."
echo "-----------------------------------------------------------"

ln -s /etc/rc.d/rc.auditd /usr/bin/rc.auditd
sed -i 's/^write_logs.*/write_logs = no/' /etc/audit/auditd.conf
sed -i '54 i\loadmodule /opt/keydb/lib/redisearch.so' /etc/keydb/keydb.conf
sysctl vm.overcommit_memory=1

echo "Done."