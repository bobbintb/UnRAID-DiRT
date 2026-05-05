#!/bin/bash

echo "-----------------------------------------------------------"
echo "Installing NodeJS libraries..."
echo "-----------------------------------------------------------"
cd "/usr/local/emhttp/plugins/bobbintb.system.dirt/"
npm install

echo "-----------------------------------------------------------"
echo "Setting Valkey permissions..."
echo "-----------------------------------------------------------"
chmod +x /etc/rc.d/rc.valkey

echo "-----------------------------------------------------------"
echo "Configuring Valkey..."
echo "-----------------------------------------------------------"
# Edits Valkey config to load Redisearch (idempotent)
awk -v mod="loadmodule /usr/bin/valkey-modules/redisearch.so" '
    $0 == mod { exists=1 } 
    /^# loadmodule/ { last=NR } 
    { lines[NR]=$0 } 
    END { 
        for(i=1;i<=NR;i++) { 
            print lines[i]; 
            if(!exists && i==last) print mod 
        } 
    }' /etc/valkey/valkey.conf > temp.conf && mv temp.conf /etc/valkey/valkey.conf

# 1. Comment out the bind directive if it is active
# This looks for a line starting with "bind" and adds a # at the start.
sed -i 's/^bind 127.0.0.1 -::1/# &/' /etc/valkey/valkey.conf

# 2. Change protected-mode from yes to no
# This ensures the state is explicitly "no".
sed -i 's/^protected-mode yes/protected-mode no/' /etc/valkey/valkey.conf
