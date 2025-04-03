#!/bin/bash

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
            condition="[ ! -f $3$FILE ] >/dev/null 2>&1"
        else
            condition="[ ! -f "/var/log/packages/${FILE_BASE}" ] >/dev/null 2>&1"
    fi

    if eval "$condition"; then
        echo "-----------------------------------------------------------"
        echo "$NAME is not installed."
        echo "Installing $NAME..."
        echo "-----------------------------------------------------------"

        if [ -n "$3" ]; then
          mkdir -p "$3"
            if [[ "$FILE" == *.tar.gz || "$FILE" == *.tar.xz ]]; then
                tar --one-top-level="$FILE" -xf "$FILE" -C /tmp
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

declare -A packages
urls["https://github.com/bobbintb/Slackware_Packages/raw/refs/heads/main/builds/nodejs/nodejs-22.14.0-x86_64-1_SBo.tgz"]="nodejs"
urls["https://slackware.uk/slackware/slackware64-15.0/patches/packages/openssl-1.1.1zb-x86_64-1_slack15.0.txz"]="openssl 1.x"
urls["https://ftp.sotirov-bg.net/pub/contrib/slackware/packages/slackware64-15.0/protobuf-3.19.6-x86_64-1gds.txz"]="protobuf"
urls["https://github.com/bobbintb/Slackware_Packages/raw/refs/heads/main/builds/valkey/valkey-8.0.1-x86_64-1_SBo.tgz"]="valkey"
urls["https://github.com/bobbintb/Slackware_Packages/raw/main/builds/redisearch/2.10.7/redisearch.so"]="redisearch"
urls["https://github.com/bobbintb/Slackware_Packages/raw/refs/heads/main/builds/yq/yq-4.44.5-x86_64-1_SBo.tgz"]="yq"

for url in "${!packages[@]}"; do
  install_package "$url" "${urls[$url]}"
done

echo "Done."
