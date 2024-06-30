echo "-----------------------------------------------------------"
echo "Checking dependencies..."
echo "-----------------------------------------------------------"
FILE="nodejs-20.11.0-x86_64-1_SBo_UES.txz"
URL="https://github.com/UnRAIDES/unRAID-NerdTools/raw/main/packages/pkgs/${FILE}"
NAME="nodejs"
if [ ! -f "/boot/config/plugins/&name;/$FILE" ]; then
    echo "-----------------------------------------------------------"
    echo "Downloading $NAME..."
    echo "-----------------------------------------------------------"
    wget "$URL" -O "/boot/config/plugins/&name;/$FILE"
fi
if ! command -v node &> /dev/null; then
    echo "-----------------------------------------------------------"
    echo "Installing $NAME..."
    echo "-----------------------------------------------------------"
    installpkg "/boot/config/plugins/&name;/$FILE"
fi

FILE="protobuf-3.19.6-x86_64-1gds.txz"
URL="https://ftp.sotirov-bg.net/pub/contrib/slackware/packages/slackware64-15.0/${FILE}"
NAME="protobuf"
if [ ! -f "/boot/config/plugins/&name;/$FILE" ]; then
    echo "-----------------------------------------------------------"
    echo "Downloading $NAME..."
    echo "-----------------------------------------------------------"
    wget "$URL" -O "/boot/config/plugins/&name;/$FILE"
fi
if ! command -v node &> /dev/null; then
    echo "-----------------------------------------------------------"
    echo "Installing $NAME..."
    echo "-----------------------------------------------------------"
    installpkg "/boot/config/plugins/&name;/$FILE"
fi

FILE="rethinkdb-x86_64.txz"
URL="https://github.com/bobbintb/rethinkdb_slackware/releases/latest/download/${FILE}"
NAME="rethinkdb"
if [ ! -f "/boot/config/plugins/&name;/$FILE" ]; then
    echo "-----------------------------------------------------------"
    echo "Downloading $NAME..."
    echo "-----------------------------------------------------------"
    wget "$URL" -O "/boot/config/plugins/&name;/$FILE"
fi
if ! command -v node &> /dev/null; then
    echo "-----------------------------------------------------------"
    echo "Installing $NAME..."
    echo "-----------------------------------------------------------"
    installpkg "/boot/config/plugins/&name;/$FILE"
fi

echo "Done."
