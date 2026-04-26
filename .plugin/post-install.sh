#!/bin/bash

echo "-----------------------------------------------------------"
echo "Installing NodeJS libraries..."
echo "-----------------------------------------------------------"
cd "/usr/local/emhttp/plugins/&name;"
npm install

# MY_RELEASE=$(uname -r | cut -d'-' -f2,3)
