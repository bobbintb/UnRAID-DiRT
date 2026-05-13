<?php
require_once("/usr/local/emhttp/plugins/dynamix/include/auth.php");

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
    exec('pgrep valkey', $output, $return_var);
    $statuses['valkey'] = ($return_var === 0);

    // Check DiRT / Node JS (using more robust pattern)
    // pgrep -f matches against the full command line
    exec('pgrep -f "node.*dirt.js"', $output, $return_var);
    $statuses['dirt'] = ($return_var === 0);
    $statuses['nodejs'] = $statuses['dirt'];

    header('Content-Type: application/json');
    echo json_encode($statuses);
    exit;
}
?>
