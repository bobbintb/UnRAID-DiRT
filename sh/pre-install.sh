echo "-----------------------------------------------------------"
echo "Installing dependencies..."
echo "-----------------------------------------------------------"
NODE="https://slackware.uk/slackware/slackware64-current/slackware64/l/nodejs-20.14.0-x86_64-1.txz"
FILE="nodejs-20.14.0-x86_64-1.txz"
if [ ! -f "/boot/config/plugins/&name;/$FILE" ]; then
    wget "$NODE" -O "/boot/config/plugins/&name;/$FILE"
fi
installpkg "/boot/config/plugins/&name;/$FILE"