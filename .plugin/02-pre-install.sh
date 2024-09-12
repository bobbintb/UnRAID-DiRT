echo "-----------------------------------------------------------"
echo "Checking dependencies..."
echo "-----------------------------------------------------------"

PLUGIN_NAME="bobbintb.system.dedupe"

# The first three arguments MUST be supplied in the order of NAME, FILE, and URL. For example:
# install_package "nodejs" \
# "nodejs-20.11.0-x86_64-1_SBo_UES.txz" \
# "https://github.com/UnRAIDES/unRAID-NerdTools/raw/main/packages/pkgs/${FILE}"
# This is for a normal installation of installing a *.txz file. You can supply a 4th argument
# if you need to just move a file to install it.

install_package() {
    NAME="$1"
    FILE="$2"
    URL="$3"
    PLUGIN_PATH="/boot/config/plugins/${PLUGIN_NAME}/${FILE}"
    basename="${FILE%.*}"

    if [ ! -f "$PLUGIN_PATH" ]; then
        echo "-----------------------------------------------------------"
        echo "Downloading $NAME..."
        echo "-----------------------------------------------------------"
        wget "$URL" -O "$PLUGIN_PATH"
    fi

    if [ ! -f "/var/log/packages/${basename}" ] >/dev/null 2>&amp;1; then
        echo "-----------------------------------------------------------"
        echo "Installing $NAME..."
        echo "-----------------------------------------------------------"

        if [ -n "$4" ]; then
                cp "/boot/config/plugins/&name;/$FILE" "$4"
            else
                installpkg "$PLUGIN_PATH"
            fi
    fi
}

install_package "nodejs" \
"nodejs-20.11.0-x86_64-1_SBo_UES.txz" \
"https://github.com/UnRAIDES/unRAID-NerdTools/raw/main/packages/pkgs/${FILE}"

install_package "audit" \
"audit-4.0.1-x86_64-4cf.txz" \
"https://slackers.it/repository/slackware64-current/audit/${FILE}"

install_package "protobuf" \
"protobuf-3.19.6-x86_64-1gds.txz" \
"https://ftp.sotirov-bg.net/pub/contrib/slackware/packages/slackware64-15.0/${FILE}"

install_package "laurel" \
"laurel-v0.6.3-x86_64-glibc.tar.gz" \
"https://github.com/threathunters-io/laurel/releases/download/v0.6.3/${FILE}"

# install_package "redis"\
# "redis-7.4.0-x86_64-1loom.txz"\
# "https://github.com/bobbintb/Slackware_Packages/raw/main/${NAME}/${FILE}"

install_package "keydb" \
"keydb-6.3.4-x86_64-1loom.txz" \
"https://github.com/bobbintb/Slackware_Packages/raw/main/keydb/${FILE}"

install_package "openssl" \
"openssl-1.1.1m-x86_64-1.txz" \
"https://slackware.uk/slackware/slackware64-15.0/slackware64/n/${FILE}"

install_package "redisearch" \
"redisearch.so" \
"https://github.com/bobbintb/Slackware_Packages/raw/main/redisearch/2.10.7/${FILE}" \
"/opt/keydb/lib/"
sed -i '54 i\loadmodule /opt/keydb/lib/redisearch.so' /etc/keydb/keydb.conf

echo "Done."
