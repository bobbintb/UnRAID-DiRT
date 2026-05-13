<?php
if (file_exists("/usr/local/emhttp/plugins/dynamix/include/auth.php")) {
    require_once("/usr/local/emhttp/plugins/dynamix/include/auth.php");
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['service_action'])) {
    $service = $_POST['service'];
    $action = $_POST['action'];
    $output = [];
    $return_var = 0;

    switch ($service) {
        case 'valkey':
            if ($action === 'start') exec('valkey start > /dev/null 2>&1 &', $output, $return_var);
            if ($action === 'stop') exec('valkey stop', $output, $return_var);
            break;
        case 'dirt':
            if ($action === 'start') exec('dirt start > /dev/null 2>&1 &', $output, $return_var);
            if ($action === 'stop') exec('dirt stop', $output, $return_var);
            break;
        case 'nodejs':
            if ($action === 'start') {
                $cmd = "cd " . __DIR__ . "/nodejs && npm run start > /dev/null 2>&1 &";
                exec($cmd, $output, $return_var);
            }
            if ($action === 'stop') {
                $cmd = "cd " . __DIR__ . "/nodejs && npm run stop";
                exec($cmd, $output, $return_var);
            }
            break;
    }

    header('Content-Type: application/json');
    echo json_encode(['success' => $return_var === 0, 'output' => $output]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['get_service_status'])) {
    $statuses = [
        'valkey' => false,
        'dirt' => false,
        'nodejs' => false
    ];

    // Check Valkey (could be valkey-server or redis-server)
    exec('pgrep -f "valkey|redis-server"', $out_pgrep_valkey, $ret_pgrep_valkey);
    $statuses['valkey'] = ($ret_pgrep_valkey === 0);

    // Check DiRT / Node JS
    // Be very specific: look for 'node' process running 'dirt.js'
    // This avoids catching things like 'cat dirt.js' or editor processes
    exec('pgrep -a -f "node.*dirt\.js"', $out_pgrep_dirt, $ret_pgrep_dirt);

    // Check if any of the lines actually look like a running node process
    $isRunning = false;
    if ($ret_pgrep_dirt === 0) {
        foreach ($out_pgrep_dirt as $line) {
            if (preg_match('/^\d+\s+.*node\s+.*dirt\.js/', $line)) {
                $isRunning = true;
                break;
            }
        }
    }

    $statuses['dirt'] = $isRunning;
    $statuses['nodejs'] = $isRunning;

    header('Content-Type: application/json');
    echo json_encode($statuses);
    exit;
}
?>
