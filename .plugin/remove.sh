#!/bin/bash

PLUGIN_NAME="&name;"
PLUGIN_PATH="/boot/config/plugins/${PLUGIN_NAME}"

echo "-----------------------------------------------------------"
echo "Uninstalling dependencies for $PLUGIN_NAME..."
echo "-----------------------------------------------------------"

if [ -d "$PLUGIN_PATH" ]; then
    # 1. Find all .txz and .tgz files in the directory
    # 2. Loop through them to uninstall
    find "$PLUGIN_PATH" -type f \( -name "*.txz" -o -name "*.tgz" \) | while read -r PACKAGE_FILE; do
        
        # Get just the filename (e.g., nodejs-22.14.0-x86_64-1_SBo.tgz)
        FILENAME=$(basename "$PACKAGE_FILE")
        
        # Strip the extension to get the internal package name
        # (removepkg needs the name as it appears in /var/log/packages)
        PKG_NAME="${FILENAME%.*}"

        if [ -f "/var/log/packages/$PKG_NAME" ]; then
            echo "Uninstalling $PKG_NAME..."
            removepkg "$PKG_NAME"
        else
            echo "Package $PKG_NAME is not currently installed. Skipping."
        fi
    done

    # 3. Remove the plugin folder entirely
    echo "Removing plugin directory: $PLUGIN_PATH"
    rm -dr "$PLUGIN_PATH"
    rm -dr "/usr/local/emhttp/plugins/${PLUGIN_NAME}"
else
    echo "Plugin directory $PLUGIN_PATH not found. Nothing to do."
fi

echo "-----------------------------------------------------------"
echo "Cleanup complete."
echo "-----------------------------------------------------------"
