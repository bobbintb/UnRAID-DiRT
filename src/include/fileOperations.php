<?php
$iniFilePath = '/var/local/emhttp/var.ini';
$parsedIni = parse_ini_file($iniFilePath, true);
$tokenValue = $parsedIni['csrf_token'];
header('Content-Type: application/json');
echo json_encode($tokenValue);
?>
