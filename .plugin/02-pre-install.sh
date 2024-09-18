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
    BASE_URL=$(dirname "$URL")/
    TXZ_PATH="/boot/config/plugins/${PLUGIN_NAME}/${FILE}"
    FILE_BASE="${FILE%.*}"

    if [ ! -f "$TXZ_PATH" ]; then
        echo "-----------------------------------------------------------"
        echo "$FILE not cached. Downloading $NAME..."
        echo "-----------------------------------------------------------"
        if ! wget --spider "$URL" 2>/dev/null; then
            echo "  File $FILE not found. Searching for"
            echo "  .txz files in $BASE_URL..."
            TEMP_HTML=$(mktemp)
            wget -q -O "$TEMP_HTML" "$BASE_URL"
            FIRST_FILE=$(awk -F'href="' '/\.txz"/ {print $2; exit}' "$TEMP_HTML" | awk -F'"' '{print $1}')
            if [ -n "$FIRST_FILE" ]; then
                echo "  $FILE was not found but $FIRST_FILE was."
                echo "  The package was likely updated and the old file removed."
                echo "  We'll use the new file for now but please alert the plugin"
                echo "  author if this is not resolved soon."
                install_package "$NAME" "$BASE_URL$FIRST_FILE"
            else
                echo "  $FILE was not found, nor any other package files at that URL."
                echo "  Please alert the plugin author of this error."
            fi
            rm "$TEMP_HTML"
        else
            wget "$URL" -O "$TXZ_PATH"
        fi
    fi

    if [ -n "$3" ]; then
            condition="[ ! -f $3$FILE ] >/dev/null 2>&amp;1"
        else
            condition="[ ! -f "/var/log/packages/${FILE_BASE}" ] >/dev/null 2>&amp;1"
    fi


    if eval "$condition"; then
        echo "-----------------------------------------------------------"
        echo "$NAME is not installed. Installing $NAME..."
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
URL="https://github.com/threathunters-io/laurel/releases/download/v0.6.3/laurel-v0.6.3-x86_64-glibc.tar.gz"
FILE=$(basename "$URL")
BIN_PATH="/boot/config/plugins/${PLUGIN_NAME}/${NAME}"
TAR_GZ_PATH="/boot/config/plugins/${PLUGIN_NAME}/${FILE}"

if [ ! -f "$BIN_PATH" ]; then
  echo "-----------------------------------------------------------"
  echo "Downloading $NAME..."
  echo "-----------------------------------------------------------"
  wget "$URL" -O "$TAR_GZ_PATH"
  tar -xzf "/boot/config/plugins/${PLUGIN_NAME}/${FILE}" $NAME
  rm "$TAR_GZ_PATH"
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

echo "Done."
