#!/bin/bash

# Remove plugin related files
rm -rf /boot/config/plugins/&name;

# Uninstall the 'source' package
removepkg &name;
