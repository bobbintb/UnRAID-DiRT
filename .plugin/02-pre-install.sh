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
if ! command -v $NAME >/dev/null 2>&amp;1; then
    echo "-----------------------------------------------------------"
    echo "Installing $NAME..."
    echo "-----------------------------------------------------------"
    installpkg "/boot/config/plugins/&name;/$FILE"
fi

FILE="audit-4.0.1-x86_64-4cf.txz"
URL="https://slackers.it/repository/slackware64-current/audit/${FILE}"
NAME="audit"
if [ ! -f "/boot/config/plugins/&name;/$FILE" ]; then
    echo "-----------------------------------------------------------"
    echo "Downloading $NAME..."
    echo "-----------------------------------------------------------"
    wget "$URL" -O "/boot/config/plugins/&name;/$FILE"
fi
if ! command -v $NAME >/dev/null 2>&amp;1; then
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
if ! command -v $NAME >/dev/null 2>&amp;1; then
    echo "-----------------------------------------------------------"
    echo "Installing $NAME..."
    echo "-----------------------------------------------------------"
    installpkg "/boot/config/plugins/&name;/$FILE"
fi

FILE="openssl-1.1.1m-x86_64-1.txz"
URL="https://slackware.uk/slackware/slackware64-15.0/slackware64/n/${FILE}"
NAME="openssl"
if [ ! -f "/boot/config/plugins/&name;/$FILE" ]; then
    echo "-----------------------------------------------------------"
    echo "Downloading $NAME..."
    echo "-----------------------------------------------------------"
    wget "$URL" -O "/boot/config/plugins/&name;/$FILE"
fi
if [ ! -f /usr/lib64/libcrypto.so.1.1 ] >/dev/null 2>&amp;1; then
    echo "-----------------------------------------------------------"
    echo "Installing $NAME..."
    echo "-----------------------------------------------------------"
    installpkg "/boot/config/plugins/&name;/$FILE"
fi

FILE="laurel-v0.6.3-x86_64-glibc.tar.gz"
URL="https://github.com/threathunters-io/laurel/releases/download/v0.6.3/${FILE}"
NAME="laurel"
if [ ! -f "/boot/config/plugins/&name;/$FILE" ]; then
    echo "-----------------------------------------------------------"
    echo "Downloading $NAME..."
    echo "-----------------------------------------------------------"
    wget "$URL" -O "/boot/config/plugins/&name;/$FILE"
fi
if ! command -v $NAME >/dev/null 2>&amp;1; then
    echo "-----------------------------------------------------------"
    echo "Installing $NAME..."
    echo "-----------------------------------------------------------"
    tar xzf "/boot/config/plugins/&name;/$FILE" -C "/boot/config/plugins/&name;/" laurel
    rm "/boot/config/plugins/&name;/$FILE"
    install -m755 "/boot/config/plugins/&name;/laurel" /usr/local/sbin/laurel
fi

FILE="redis-7.4.0-x86_64-1loom.txz"
URL="https://github.com/bobbintb/Slackware_Packages/raw/main/${NAME}/${FILE}"
NAME="redis"
if [ ! -f "/boot/config/plugins/&name;/$FILE" ]; then
    echo "-----------------------------------------------------------"
    echo "Downloading $NAME..."
    echo "-----------------------------------------------------------"
    wget "$URL" -O "/boot/config/plugins/&name;/$FILE"
fi
if ! command -v $NAME >/dev/null 2>&amp;1; then
    echo "-----------------------------------------------------------"
    echo "Installing $NAME..."
    echo "-----------------------------------------------------------"
    installpkg "/boot/config/plugins/&name;/$FILE"
fi


echo "Done."
