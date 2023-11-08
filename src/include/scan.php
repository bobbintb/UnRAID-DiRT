<?php
header('Content-Type: text/event-stream');

// Flush the output buffer immediately
ob_implicit_flush(true);
ob_end_flush();

require_once("/usr/local/emhttp/plugins/compose.manager/php/compose_util.php");

// Execute the Python script and continuously read its output
$command = "/usr/local/emhttp/plugins/bobbintb.system.dedupe/scripts/venv/bin/python3 /usr/local/emhttp/plugins/bobbintb.system.dedupe/scripts/main.py 2>&1";
$descriptorSpec = [
    0 => ['pipe', 'r'], // stdin
    1 => ['pipe', 'w'], // stdout
    2 => ['pipe', 'w']  // stderr
];

//$process = proc_open($command, $descriptorSpec, $pipes);

execComposeCommandInTTY($command, false)
$composeCommand = "/plugins/compose.manager/php/show_ttyd.php";
echo $composeCommand;

if (is_resource($process)) {
    while (($line = fgets($pipes[1])) !== false) {
        echo "data: " . json_encode($line) . "\n\n";
        flush();
    }

    // Handle any errors or process completion
    $error = stream_get_contents($pipes[2]);
    $returnCode = proc_close($process);

    if (!empty($error)) {
        echo "data: " . json_encode($error) . "\n\n";
        flush();
    }
    echo "data: " . json_encode('completed') . "\n\n";
    flush();
}
?>
