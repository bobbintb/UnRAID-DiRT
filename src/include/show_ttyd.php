<?php
$socket_name = "dedupe";

$url = "/logterminal/$socket_name/";

$version = parse_ini_file("/etc/unraid-version");
if ( version_compare($version['version'],"6.10.0", "<") )
{
    $url = "/dockerterminal/$socket_name/";
}

echo '<iframe src="'.$url.'" style="border: none; width: 100%; height: 100%;"></iframe>';
?>
