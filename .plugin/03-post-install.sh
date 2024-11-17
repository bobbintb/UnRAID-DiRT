echo "-----------------------------------------------------------"
echo "Installing NodeJS libraries..."
echo "-----------------------------------------------------------"
cd "/usr/local/emhttp/plugins/&name;"
npm install

echo "-----------------------------------------------------------"
echo "Configuring..."
echo "-----------------------------------------------------------"

#ln -s /etc/rc.d/rc.auditd /usr/bin/rc.auditd
ln -s /usr/local/etc/rc.d/rc.valkey /etc/rc.d/rc.valkey
chmod +x /etc/rc.d/rc.valkey
# ln -s /etc/rc.d/rc.redis /usr/local/etc/rc.d/rc.redis
# sed -i '54 i\loadmodule /opt/keydb/lib/redisearch.so' /etc/keydb/keydb.conf
# sed -i '54 i\loadmodule /opt/redis/lib/redisearch.so' /etc/redis/redis.conf

#sed -i 's/^write_logs.*/write_logs = no/' /etc/audit/auditd.conf

config_file="/etc/valkey/valkey.conf"
new_value="/usr/bin/valkey-modules/redisearch.so"

awk -v new_value="$new_value" '
  /^#? *loadmodule / &amp;&amp; !found {
    $0 = "loadmodule " new_value
    found = 1
  }
  { print }
' "$config_file" > "$config_file.tmp" &amp;&amp; mv "$config_file.tmp" "$config_file"

#sed -i '54 i\loadmodule /usr/bin/valkey-modules/redisearch.so' /etc/valkey/valkey.conf
sysctl vm.overcommit_memory=1
echo "Done."