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

    // Check Valkey using pid file
    $valkey_pid_file = '/run/valkey_6379.pid';
    if (file_exists($valkey_pid_file)) {
        $pid = trim(file_get_contents($valkey_pid_file));
        if (is_numeric($pid)) {
            // Check if process is still running and is valkey-server
            exec("ps -p $pid -o comm=", $out_ps, $ret_ps);
            if ($ret_ps === 0 && (trim($out_ps[0]) === 'valkey-server' || trim($out_ps[0]) === 'redis-server')) {
                $statuses['valkey'] = true;
            }
        }
    }

    // Check DiRT / Node JS
    // We look for 'node' processes specifically running 'dirt.js'
    exec('pgrep -a node', $out_pgrep_node, $ret_pgrep_node);
    $isRunning = false;
    if ($ret_pgrep_node === 0) {
        foreach ($out_pgrep_node as $line) {
            if (strpos($line, 'dirt.js') !== false) {
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
