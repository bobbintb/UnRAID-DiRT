#!/bin/bash

echo "-----------------------------------------------------------"
echo "Installing NodeJS libraries..."
echo "-----------------------------------------------------------"
cd "/usr/local/emhttp/plugins/&name;"
npm install

chmod +x /etc/rc.d/rc.valkey
