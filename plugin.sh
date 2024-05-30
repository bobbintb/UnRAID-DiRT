#!/bin/bash

PLUGIN="<?xml version='1.0' standalone='yes'?>

<!DOCTYPE PLUGIN ["

# Load the config file

CONFIG_FILE="./plugin.cfg"
if [[ -f "$CONFIG_FILE" ]]; then
  . $CONFIG_FILE
else
  echo "Config file not found: $CONFIG_FILE"
  exit 1
fi

read_and_modify_config() {
  longest_key_length=0
  
  # Find the length of the longest key
  for key in "${keys[@]}"; do
    if [[ ${#key} -gt $longest_key_length ]]; then
      longest_key_length=${#key}
    fi
  done
  
  # Calculate the target length for keys
  target_key_length=$((longest_key_length + 1))
  for key in "${keys[@]}"; do
    new_key=$(printf "%-${target_key_length}s" "$key")
    new_value="${config[$key]}"
    PLUGIN="${PLUGIN}
<!ENTITY ${new_key}${new_value}>"
  done
  PLUGIN="${PLUGIN}
]>"
}

package_plugin() {
          dest="./tmp/usr/local/emhttp/plugins/${name}"
          mkdir -p "$dest"
          echo "Copying files to temporary folder to archive..."
          cp -r ${plugin_src}* $dest
          echo "Archiving..."
          7z a -ttar -so -an ./tmp/usr | 7z a -txz -si ${name}.txz
}


read_and_modify_config
package_plugin
md5Hash=$(md5sum "${name}.txz" | awk '{print $1}')
echo ${md5Hash}


if [[ -e "./sh/pre-install.sh" ]]; then
  PLUGIN="${PLUGIN}

<!-- PRE-INSTALL SCRIPT -->
<FILE Run="/bin/bash" Method="install">
<INLINE>
$(<./sh/pre-install.sh)
</INLINE>
</FILE>"
fi

if [[ -e "./sh/install.sh" ]]; then
  PLUGIN="${PLUGIN}

<!-- INSTALL SCRIPT -->
<FILE Run="/bin/bash" Method="install">
<INLINE>
$(<./sh/install.sh)
</INLINE>
</FILE>"
fi

if [[ -e "./sh/post-install.sh" ]]; then
  PLUGIN="${PLUGIN}

<!-- POST-INSTALL SCRIPT -->
<FILE Run="/bin/bash" Method="install">
<INLINE>
$(<./sh/post-install.sh)
</INLINE>
</FILE>"
fi

if [[ -e "./sh/remove.sh" ]]; then
  PLUGIN="${PLUGIN}

<!-- REMOVE SCRIPT -->
<FILE Run="/bin/bash" Method="remove">
<INLINE>
$(<./sh/remove.sh)
</INLINE>
</FILE>"
fi

if [[ -e "./sh/files.txt" ]]; then
  PLUGIN="${PLUGIN}

<!-- SOURCE FILES -->
$(<./sh/files.txt)"
fi

PLUGIN="${PLUGIN}

</PLUGIN>"

echo "${PLUGIN}"
