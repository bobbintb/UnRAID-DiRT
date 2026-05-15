echo "-----------------------------------------------------------"
echo "Configuring..."
echo "-----------------------------------------------------------"

chmod +x /etc/rc.d/rc.valkey

echo "alias valkey='/etc/rc.d/rc.valkey'" >> /etc/profile
echo "alias dirt-backend='/etc/rc.d/rc.dirt-backend'" >> /etc/profile

. /etc/profile

config_file="/etc/valkey/valkey.conf"

# Idempotently insert loadmodule directive after the last commented-out loadmodule line
awk -v mod="loadmodule /usr/bin/valkey-modules/redisearch.so" '
    $0 == mod { exists=1 }
    /^# loadmodule/ { last=NR }
    { lines[NR]=$0 }
    END {
        for(i=1;i<=NR;i++) {
            print lines[i];
            if(!exists && i==last) print mod
        }
    }' "$config_file" > temp.conf && mv temp.conf "$config_file"

# Comment out the bind directive if active
sed -i 's/^bind 127.0.0.1 -::1/# &/' "$config_file"

# Set protected-mode to no
sed -i 's/^protected-mode yes/protected-mode no/' "$config_file"

sysctl vm.overcommit_memory=1
echo "Done."
