<?php
$action = $_POST['action'];
echo shell_exec("/etc/rc.d/rc.auditd $action");
?>
