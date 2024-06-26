echo "-----------------------------------------------------------"
echo "Installing dependencies..."
echo "-----------------------------------------------------------"
FILE="nodejs-20.14.0-x86_64-1.txz"
NODE="https://slackware.uk/slackware/slackware64-current/slackware64/l/${FILE}"
if [ ! -f "/boot/config/plugins/&name;/$FILE" ]; then
    wget "$NODE" -O "/boot/config/plugins/&name;/$FILE"
fi
installpkg "/boot/config/plugins/&name;/$FILE"
