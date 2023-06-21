<?php
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');

function sendSSE($data) {
    echo "data: $data\n\n";
    flush();
}

ob_flush();
flush();

$command = 'python ./plugins/bobbintb.system.dedupe/scripts/main.py';

// Open a pipe to the process
$handle = popen($command, 'r');

while (!feof($handle)) {
    $output = fgets($handle);

    // Send the output as SSE to the client
    sendSSE($output);
}

pclose($handle);
?>
