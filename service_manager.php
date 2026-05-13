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

    // Check Valkey
    // Use 'which' to see if command exists, and 'pgrep' to see if running
    exec('which valkey', $out_valkey, $ret_valkey);
    if ($ret_valkey === 0) {
        exec('pgrep valkey', $out_pgrep_valkey, $ret_pgrep_valkey);
        $statuses['valkey'] = ($ret_pgrep_valkey === 0);
    }

    // Check DiRT / Node JS
    // We check for the dirt.js process directly
    exec('pgrep -f "dirt.js"', $out_pgrep_dirt, $ret_pgrep_dirt);
    $statuses['dirt'] = ($ret_pgrep_dirt === 0);
    $statuses['nodejs'] = $statuses['dirt'];

    header('Content-Type: application/json');
    echo json_encode($statuses);
    exit;
}
?>
