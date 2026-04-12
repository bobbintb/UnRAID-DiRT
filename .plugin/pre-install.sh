#!/bin/bash

PLUGIN_NAME="bobbintb.system.dirt"
set -o pipefail

echo "-----------------------------------------------------------"
echo "Checking dependencies for $PLUGIN_NAME..."
echo "-----------------------------------------------------------"

install_package() {
    URL="$1"
    FILE=$(basename "$URL")
    BASE_URL=$(dirname "$URL")/
    EXT="${URL##*.}"
    TXZ_PATH="/boot/config/plugins/${PLUGIN_NAME}/${FILE}"
    MD5_PATH="${TXZ_PATH}.md5"
    
    # --- REGEX PARSING BLOCK ---
    REGEX="^(.+)-([0-9][^-]+)-([^-]+)-([^_.]+)_?([^.]+)?\.(.+)$"
    
    if [[ $FILE =~ $REGEX ]]; then
        NAME="${BASH_REMATCH[1]}"
        FILE_BASE="${FILE%.*}"
    else
        NAME="${FILE%%-*}"
        FILE_BASE="${FILE%.*}"
    fi

    # 1. Download/Cache Logic
    if [ ! -f "$TXZ_PATH" ]; then
        echo "-----------------------------------------------------------"
        echo "$FILE is not cached. Downloading $NAME..."
        
        if ! wget --spider "$URL" 2>/dev/null; then
            # Smart search for updated versions
            FIRST_FILE=$(wget -q -O - "$BASE_URL" | grep -oE "href=\"[^\"]*${NAME}[^\"]*\.${EXT}\"" | head -n 1 | cut -d'"' -f2) || \
            FIRST_FILE=$(wget -q -O - "$BASE_URL" | grep -oP '(?<=<script type="application/json" data-target="react-app.embeddedData">).*?(?=</script>)' | jq -r '.payload.tree.items[] | select(.name | test("^'"$NAME"'") and test("'"$EXT"'$")) | .name')
            
            if [ -n "$FIRST_FILE" ]; then
                install_package "$BASE_URL$FIRST_FILE"
                return
            else
                echo "Error: $FILE not found on server."
                return 1
            fi
        else
            # Download Package and its MD5
            curl -L "$URL" --create-dirs -o "$TXZ_PATH"
            curl -L "${URL}.md5" -o "$MD5_PATH" 2>/dev/null
        fi
    fi

    # 2. MD5 Verification Logic
    if [ -f "$MD5_PATH" ]; then
        echo "Verifying MD5 for $FILE..."
        # We pushd to the directory so md5sum can find the file listed in the .md5 file
        if ! ( cd "$(dirname "$TXZ_PATH")" && md5sum -c "$(basename "$MD5_PATH")" >/dev/null 2>&1 ); then
            echo "MD5 Verification FAILED for $FILE!"
            echo "Removing corrupted files..."
            rm -f "$TXZ_PATH" "$MD5_PATH"
            return 1
        fi
        echo "MD5 Check Passed."
    else
        echo "Warning: No MD5 file found for $FILE. Skipping verification."
    fi

    # 3. Installation Logic
    if [ ! -f "/var/log/packages/${FILE_BASE}" ]; then
        echo "-----------------------------------------------------------"
        echo "Installing $NAME..."
        installpkg "$TXZ_PATH"
    fi
}

# Array of URLs
PKGS=(
    "https://bobbintb.github.io/Slackware_Packages/builds/dragonfly/dragonfly-1.37.2-x86_64-1_SBo.tgz"
)

for url in "${PKGS[@]}"; do
    install_package "$url"
done

echo "Done."


# https://slackware.uk/slackware/slackware64-15.0/patches/packages/openssl-1.1.1zb-x86_64-1_slack15.0.txz
# https://ftp.sotirov-bg.net/pub/contrib/slackware/packages/slackware64-15.0/protobuf-3.19.6-x86_64-1gds.txz
# https://github.com/bobbintb/Slackware_Packages/raw/refs/heads/main/builds/valkey/valkey-8.0.2-x86_64-1_SBo.tgz
# https://github.com/bobbintb/Slackware_Packages/raw/main/builds/redisearch/2.10.7/redisearch.so
# https://github.com/bobbintb/Slackware_Packages/raw/refs/heads/main/builds/yq/yq-4.44.5-x86_64-1_SBo.tgz
