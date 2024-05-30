# This bash script is ran before the plugin is installed. You can use it for installing dependencies, checks, etc.
# This example installs some needed dependencies:

echo "-----------------------------------------------------------"
echo "Installing dependencies..."
echo "-----------------------------------------------------------"
wget https://slackers.it/repository/slackware64-current/audit/audit-3.1.2-x86_64-1cf.txz
wget https://slackware.uk/slackware/slackware64-current/slackware64/l/libnsl-2.0.1-x86_64-1.txz
wget https://slackware.uk/slackware/slackware64-current/slackware64/a/sysvinit-functions-8.53-x86_64-6.txz
installpkg audit-3.1.2-x86_64-1cf.txz
installpkg libnsl-2.0.1-x86_64-1.txz
installpkg sysvinit-functions-8.53-x86_64-6.txz
rm audit-3.1.2-x86_64-1cf.txz
rm libnsl-2.0.1-x86_64-1.txz
rm sysvinit-functions-8.53-x86_64-6.txz