<?php
$jsArray = $_POST['jsArray'];
$file_path = '/tmp/queue.sh';
if(file_exists($file_path))
    {
        unlink($file_path);
    }
file_put_contents($file_path, implode(PHP_EOL, $jsArray), FILE_USE_INCLUDE_PATH | LOCK_EX);
chmod($file_path, 0755);
?>
