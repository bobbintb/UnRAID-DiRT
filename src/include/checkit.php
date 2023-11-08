#!/usr/bin/php -q
<?php
require_once("/usr/local/emhttp/plugins/dynamix/include/Wrappers.php");

$composeCommand = "tmux new-session /usr/local/emhttp/plugins/bobbintb.system.dedupe/scripts/venv/bin/python3 /usr/local/emhttp/plugins/bobbintb.system.dedupe/scripts/main.py";
$socket_name = "dedupe";
$pid = exec("pgrep -a ttyd|awk '/\\/$socket_name\\.sock/{print \$1}'");
if ($pid) exec("kill $pid");
@unlink("/var/tmp/$socket_name.sock");
$command = "ttyd -R -o -i '/var/tmp/$socket_name.sock' $composeCommand". " > /dev/null &"; 
exec($command);
$composeCommand = "/plugins/bobbintb.system.dedupe/scripts/show_ttyd.php";
echo $composeCommand;
?>