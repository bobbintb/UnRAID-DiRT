echo "-----------------------------------------------------------"
echo "Installing NodeJS libraries..."
echo "-----------------------------------------------------------"
cd "/usr/local/emhttp/plugins/&name;"
npm install

echo "-----------------------------------------------------------"
echo "Configuring..."
echo "-----------------------------------------------------------"

ln -s /etc/rc.d/rc.auditd /usr/bin/rc.auditd
ln -s /usr/local/etc/rc.d/rc.valkey /etc/rc.d/rc.valkey
# ln -s /etc/rc.d/rc.redis /usr/local/etc/rc.d/rc.redis

sed -i 's/^write_logs.*/write_logs = no/' /etc/audit/auditd.conf
# sed -i '54 i\loadmodule /opt/keydb/lib/redisearch.so' /etc/keydb/keydb.conf
# sed -i '54 i\loadmodule /opt/redis/lib/redisearch.so' /etc/redis/redis.conf
sed -i '54 i\loadmodule /usr/bin/valkey-modules/redisearch.so' /etc/valkey/valkey.conf
sysctl vm.overcommit_memory=1
echo "Done."