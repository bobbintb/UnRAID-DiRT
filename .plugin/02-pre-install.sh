echo "-----------------------------------------------------------"
echo "Checking dependencies..."
echo "-----------------------------------------------------------"

PLUGIN_NAME="&name;"

# The first three arguments MUST be supplied in the order of NAME, FILE, and URL. For example:
# install_package "nodejs" \
# "nodejs-20.11.0-x86_64-1_SBo_UES.txz" \
# "https://github.com/UnRAIDES/unRAID-NerdTools/raw/main/packages/pkgs/${FILE}"
# There must be a space after each line before the backslash and the string or else the lines will run together.
# This is for a normal installation of installing a *.txz file. You can supply a 4th argument
# if you need to just move a file to install it.

install_package() {
    NAME="$1"
    URL="$2"
    FILE=$(basename "$URL")
    TXZ_PATH="/boot/config/plugins/${PLUGIN_NAME}/${FILE}"
    FILE_BASE="${FILE%.*}"

    if [ ! -f "$TXZ_PATH" ]; then
        echo "-----------------------------------------------------------"
        echo "Downloading $NAME..."
        echo "-----------------------------------------------------------"
        wget --continue "$URL" -O "$TXZ_PATH"
    fi

    if [ ! -f "/var/log/packages/${FILE_BASE}" ] >/dev/null 2>&amp;1; then
        echo "-----------------------------------------------------------"
        echo "Installing $NAME..."
        echo "-----------------------------------------------------------"

        if [ -n "$3" ]; then
                cp "/boot/config/plugins/${PLUGIN_NAME}/$FILE" "$3"
            else
                installpkg "$TXZ_PATH"
            fi
    fi
}

install_package "audit" \
"https://slackers.it/repository/slackware64-current/audit/audit-4.0.2-x86_64-1cf.txz"

install_package "keydb" \
"https://github.com/bobbintb/Slackware_Packages/raw/main/keydb/keydb-6.3.4-x86_64-1loom.txz"

NAME="laurel"
FILE=$(basename "$URL")
URL="https://github.com/threathunters-io/laurel/releases/download/v0.6.3/laurel-v0.6.3-x86_64-glibc.tar.gz"
TXZ_PATH="/boot/config/plugins/${PLUGIN_NAME}/${NAME}"

if [ ! -f "$TXZ_PATH" ]; then
  echo "-----------------------------------------------------------"
  echo "Downloading $NAME..."
  echo "-----------------------------------------------------------"
  wget --continue "$URL" -O "$TXZ_PATH"
  tar -xzf $FILE $NAME
  rm $FILE
fi

if [ ! -f "/var/log/packages/${FILE_BASE}" ] >/dev/null 2>&amp;1; then
  echo "-----------------------------------------------------------"
  echo "Installing $NAME..."
  echo "-----------------------------------------------------------"
  install -m755 "/boot/config/plugins/${PLUGIN_NAME}/${NAME}" /usr/local/sbin/${NAME}
fi

install_package "nodejs" \
"https://github.com/UnRAIDES/unRAID-NerdTools/raw/main/packages/pkgs/nodejs-20.11.0-x86_64-1_SBo_UES.txz"

install_package "openssl" \
"https://slackware.uk/slackware/slackware64-15.0/slackware64/n/openssl-1.1.1m-x86_64-1.txz"

install_package "protobuf" \
"https://ftp.sotirov-bg.net/pub/contrib/slackware/packages/slackware64-15.0/protobuf-3.19.6-x86_64-1gds.txz"

# install_package "redis"\
# "https://github.com/bobbintb/Slackware_Packages/raw/main/${NAME}/redis-7.4.0-x86_64-1loom.txz"

mkdir -p "/opt/keydb/lib/"
install_package "redisearch" \
"https://github.com/bobbintb/Slackware_Packages/raw/main/redisearch/2.10.7/redisearch.so" \
"/opt/keydb/lib/"
sed -i '54 i\loadmodule /opt/keydb/lib/redisearch.so' /etc/keydb/keydb.conf

echo "Done."
