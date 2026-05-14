<?php
// Fix environment: standard path and working directory
putenv('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
chdir('/usr/local/emhttp/plugins/bobbintb.system.dirt/');

// Authenticate with Unraid
if (file_exists("/usr/local/emhttp/plugins/dynamix/include/auth.php")) {
    require_once("/usr/local/emhttp/plugins/dynamix/include/auth.php");
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['service_action'])) {
    $service = $_POST['service'];
    $action = $_POST['action'];

    // Whitelist actions
    if (!in_array($action, ['start', 'stop'])) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        exit;
    }

    switch ($service) {
        case 'valkey':
            // Exact user requested command
            exec("valkey $action > /dev/null 2>&1 &");
            break;
        case 'dirt':
            // Exact user requested command
            exec("dirt $action > /dev/null 2>&1 &");
            break;
        case 'nodejs':
            // For Node JS server, use the package.json scripts from the root
            exec("npm run $action > /dev/null 2>&1 &");
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

    // 1. Valkey Status: check PID file first, then pgrep
    $v_pid_file = '/run/valkey_6379.pid';
    if (file_exists($v_pid_file)) {
        $pid = trim(@file_get_contents($v_pid_file));
        if (is_numeric($pid)) {
            exec("kill -0 $pid 2>/dev/null", $v_out, $v_ret);
            if ($v_ret === 0) $statuses['valkey'] = true;
        }
    }
    if (!$statuses['valkey']) {
        exec('pgrep -x valkey-server || pgrep -x redis-server', $v_pg_out, $v_pg_ret);
        if ($v_pg_ret === 0) $statuses['valkey'] = true;
    }

    // 2. DiRT Status: exact check from user's example
    exec('dirt status 2>&1', $d_out, $d_ret);
    foreach ($d_out as $line) {
        if (preg_match('/is running at pid/i', $line)) {
            $statuses['dirt'] = true;
            break;
        }
    }

    // 3. Node JS Server Status
    exec('pgrep -f "node.*dirt.js"', $n_out, $n_ret);
    $statuses['nodejs'] = ($n_ret === 0);

    header('Content-Type: application/json');
    echo json_encode($statuses);
    exit;
}
?>
