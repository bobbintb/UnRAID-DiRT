echo "-----------------------------------------------------------"
echo "Checking dependencies..."
echo "-----------------------------------------------------------"
FILE="nodejs-20.11.0-x86_64-1_SBo_UES.txz"
NODE="https://github.com/UnRAIDES/unRAID-NerdTools/raw/main/packages/pkgs/${FILE}"
if [ ! -f "/boot/config/plugins/&name;/$FILE" ]; then
    echo "-----------------------------------------------------------"
    echo "Downloading NodeJS..."
    echo "-----------------------------------------------------------"
    wget "$NODE" -O "/boot/config/plugins/&name;/$FILE"
fi
if ! command -v node &> /dev/null; then
    echo "-----------------------------------------------------------"
    echo "Installing NodeJS..."
    echo "-----------------------------------------------------------"
    installpkg "/boot/config/plugins/&name;/$FILE"
fi
echo "Done."
