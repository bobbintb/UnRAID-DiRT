echo "-----------------------------------------------------------"
echo "Installing NodeJS libraries..."
echo "-----------------------------------------------------------"
cd "/usr/local/emhttp/plugins/&name;"
npm install

echo "-----------------------------------------------------------"
echo "Configuring..."
echo "-----------------------------------------------------------"

chmod 755 /etc/rc.d/rc.auditd
ln -s /etc/rc.d/rc.auditd /usr/bin/rc.auditd
sed -i 's/^write_logs.*/write_logs = no/' /etc/audit/auditd.conf

echo "Done."