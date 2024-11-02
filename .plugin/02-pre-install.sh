PLUGIN_NAME="&name;"
echo "-----------------------------------------------------------"
echo "Checking dependencies for $PLUGIN_NAME..."
echo "-----------------------------------------------------------"

install_package() {
    NAME="$1"
    URL="$2"
    FILE=$(basename "$URL")
    BASE_URL=$(dirname "$URL")/
    TXZ_PATH="/boot/config/plugins/${PLUGIN_NAME}/${FILE}"
    FILE_BASE="${FILE%.*}"
    if [ ! -f "$TXZ_PATH" ]; then
        echo "-----------------------------------------------------------"
        echo "$FILE is not cached."
        echo "Downloading $NAME..."
        echo "-----------------------------------------------------------"
        if ! wget --spider "$URL" 2>/dev/null; then
            echo "  File $FILE not found. Searching for"
            echo "  .txz files in $BASE_URL..."
            FIRST_FILE=$(wget -q -O - "$BASE_URL" | grep -oE 'href="[^"]+\.txz"' | head -n 1 | cut -d'"' -f2)
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
            rm "$TXZ_PATH"
        else
            curl -L "$URL" --create-dirs -o "$TXZ_PATH"
            #wget "$URL" -O "$TXZ_PATH"
        fi
    fi

    if [ -n "$3" ]; then
            condition="[ ! -f $3$FILE ] >/dev/null 2>&amp;1"
        else
            condition="[ ! -f "/var/log/packages/${FILE_BASE}" ] >/dev/null 2>&amp;1"
    fi

    if eval "$condition"; then
        echo "-----------------------------------------------------------"
        echo "$NAME is not installed."
        echo "Installing $NAME..."
        echo "-----------------------------------------------------------"

        if [ -n "$3" ]; then
            if [[ "$3" == *.tar.gz || "$3" == *.tar.xz ]]; then
                tar --one-top-level="$FILE" -xf "$FILE" -C /tmp
                mkdir -p "$3"
                mv /tmp/"$FILE"/ "$3"
                chmod -R 755 "$3"
                rm -dr /tmp/"$FILE"/
            else
                install -Dm755 "/boot/config/plugins/${PLUGIN_NAME}/$FILE" "$3"
            fi
          else
              installpkg "$TXZ_PATH"
          fi
    fi
}

install_package "audit" \
"https://slackers.it/repository/slackware64-current/audit/audit-4.0.2-x86_64-1cf.txz"

install_package "nodejs" \
"https://github.com/UnRAIDES/unRAID-NerdTools/raw/main/packages/pkgs/nodejs-20.11.0-x86_64-1_SBo_UES.txz"

install_package "protobuf" \
"https://ftp.sotirov-bg.net/pub/contrib/slackware/packages/slackware64-15.0/protobuf-3.19.6-x86_64-1gds.txz"

install_package "valkey" \
"https://github.com/bobbintb/Slackware_Packages/raw/refs/heads/main/valkey/valkey-8.0.1-x86_64-1_SBo.tgz"

install_package "redisearch" \
"https://github.com/bobbintb/Slackware_Packages/raw/main/redisearch/2.10.7/redisearch.so" \
"/usr/bin/valkey-modules/"

install_package "redisjson" \
"https://github.com/bobbintb/Slackware_Packages/raw/main/redisjson/2.8.4/librejson.so" \
"/usr/bin/valkey-modules/"

install_package "laurel" \
"https://github.com/threathunters-io/laurel/releases/download/v0.6.3/laurel-v0.6.3-x86_64-glibc.tar.gz" \
"/usr/local/sbin/laurel"

#NAME="laurel"
#URL="https://github.com/threathunters-io/laurel/releases/download/v0.6.3/laurel-v0.6.3-x86_64-glibc.tar.gz"
#FILE=$(basename "$URL")
#BIN_PATH="/boot/config/plugins/${PLUGIN_NAME}/${NAME}"
#TAR_GZ_PATH="/boot/config/plugins/${PLUGIN_NAME}/${FILE}"
#
#if [ ! -f "$BIN_PATH" ]; then
#  echo "-----------------------------------------------------------"
#  echo "Downloading $NAME..."
#  echo "-----------------------------------------------------------"
#  curl "$URL" --create-dirs -o "$TXZ_PATH"
#  #wget "$URL" -O "$TAR_GZ_PATH"
#  tar -xzf "/boot/config/plugins/${PLUGIN_NAME}/${FILE}" $NAME
#  rm "$TAR_GZ_PATH"
#fi
#
#if [ ! -f "/var/log/packages/${FILE_BASE}" ] >/dev/null 2>&amp;1; then
#  echo "-----------------------------------------------------------"
#  echo "Installing $NAME..."
#  echo "-----------------------------------------------------------"
#  install -m755 "/boot/config/plugins/${PLUGIN_NAME}/${NAME}" /usr/local/sbin/${NAME}
#fi

echo "Done."
