# This bash script is ran when removing/uninstalling a plugin. Here are some common tasks:

# Remove plugin related files
rm -rf /boot/config/plugins/&name;

# Uninstall the 'source' package
removepkg &name;