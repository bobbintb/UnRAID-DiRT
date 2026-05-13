<?php
// Ensure a full path is set for system commands
putenv('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');

// Set working directory to the plugin folder to avoid "getcwd" errors
chdir(__DIR__);

if (file_exists("/usr/local/emhttp/plugins/dynamix/include/auth.php")) {
    require_once("/usr/local/emhttp/plugins/dynamix/include/auth.php");
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['service_action'])) {
    $service = $_POST['service'];
    $action = $_POST['action'];

    // Strict whitelist for actions to prevent shell injection
    if (!in_array($action, ['start', 'stop'])) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        exit;
    }

    switch ($service) {
        case 'valkey':
            // The user requested "valkey start" and "valkey stop"
            exec("valkey $action > /dev/null 2>&1 &");
            break;
        case 'dirt':
            // The user requested "dirt start" and "dirt stop"
            exec("dirt $action > /dev/null 2>&1 &");
            break;
        case 'nodejs':
            if ($action === 'start') {
                exec("cd nodejs && node dirt.js >> dirt_server.log 2>&1 &");
            } else {
                exec("ps aux | grep 'dirt.js' | grep -v grep | awk '{print $2}' | xargs kill -9 > /dev/null 2>&1");
            }
            break;
    }

    header('Content-Type: application/json');
    echo json_encode(['success' => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['get_service_status'])) {
    $statuses = [
        'valkey' => false,
        'dirt' => false,
        'nodejs' => false
    ];

    // 1. Check Valkey
    $valkey_pid_file = '/run/valkey_6379.pid';
    if (file_exists($valkey_pid_file)) {
        $pid = trim(file_get_contents($valkey_pid_file));
        if (!empty($pid) && is_numeric($pid)) {
            // Check if process exists and is actually a valkey/redis server
            $cmd = "ps -p $pid -o comm= 2>/dev/null";
            $comm = trim(shell_exec($cmd));
            if ($comm === 'valkey-server' || $comm === 'redis-server' || $comm === 'valkey') {
                $statuses['valkey'] = true;
            }
        }
    }
    // Fallback to pgrep if PID file is missing or inconclusive
    if (!$statuses['valkey']) {
        $statuses['valkey'] = (trim(shell_exec('pgrep -x valkey-server || pgrep -x redis-server')) !== '');
    }

    // 2. Check DiRT
    // Using exactly the command suggested by the user and parsing the output
    $dirt_status = shell_exec('dirt status 2>&1');
    if ($dirt_status && preg_match('/is running at pid/i', $dirt_status)) {
        $statuses['dirt'] = true;
    }

    // 3. Check Node JS
    // Look for node process running dirt.js
    $node_pgrep = shell_exec('pgrep -f "node.*dirt.js"');
    if (!empty(trim($node_pgrep))) {
        $statuses['nodejs'] = true;
    }

    header('Content-Type: application/json');
    echo json_encode($statuses);
    exit;
}
?>
