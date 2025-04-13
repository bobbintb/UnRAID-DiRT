#!/bin/bash

echo "-----------------------------------------------------------"
echo "Installing NodeJS libraries..."
echo "-----------------------------------------------------------"
cd "/usr/local/emhttp/plugins/&name;"
npm install

echo "-----------------------------------------------------------"
echo "Configuring..."
echo "-----------------------------------------------------------"

ln -s /usr/local/etc/rc.d/rc.valkey /etc/rc.d/rc.valkey
chmod +x /etc/rc.d/rc.valkey

echo "alias valkey='/etc/rc.d/rc.valkey'" >> /etc/profile
echo "alias dirt='/etc/rc.d/rc.dirt'" >> /etc/profile

. /etc/profile

config_file="/etc/valkey/valkey.conf"
new_value="/usr/bin/valkey-modules/redisearch.so"




awk -v new_value="$new_value" '
  /^#? *loadmodule / && !found {
    $0 = "loadmodule " new_value
    found = 1
  }
  { print }
' "$config_file" > "$config_file.tmp" && mv "$config_file.tmp" "$config_file"

#sed -i '54 i\loadmodule /usr/bin/valkey-modules/redisearch.so' /etc/valkey/valkey.conf
sysctl vm.overcommit_memory=1
echo "Done."
