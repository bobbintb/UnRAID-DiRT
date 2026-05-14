<?php
// Fix environment
putenv('PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');
chdir('/');

if (file_exists("/usr/local/emhttp/plugins/dynamix/include/auth.php")) {
    require_once("/usr/local/emhttp/plugins/dynamix/include/auth.php");
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['service_action'])) {
    $service = $_POST['service'];
    $action = $_POST['action'];

    if (!in_array($action, ['start', 'stop'])) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        exit;
    }

    switch ($service) {
        case 'valkey':
            if ($action === 'start') {
                exec('/etc/rc.d/rc.valkey start > /dev/null 2>&1 &');
            } else {
                exec('/etc/rc.d/rc.valkey stop');
            }
            break;
        case 'dirt':
            if ($action === 'start') {
                exec('/etc/rc.d/rc.dirt start > /dev/null 2>&1 &');
            } else {
                exec('/etc/rc.d/rc.dirt stop');
            }
            break;
        case 'nodejs':
            $dir = '/usr/local/emhttp/plugins/bobbintb.system.dirt/nodejs';
            if ($action === 'start') {
                exec("cd $dir && npm run start > /dev/null 2>&1 &");
            } else {
                exec("cd $dir && npm run stop");
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

    // 1. Valkey Status
    clearstatcache();
    $statuses['valkey'] = file_exists('/run/valkey_6379.pid');

    // 2. DiRT Status
    exec('/etc/rc.d/rc.dirt status 2>&1', $out_dirt);
    foreach ($out_dirt as $line) {
        if (preg_match('/is running at pid/i', $line)) {
            $statuses['dirt'] = true;
            break;
        }
    }

    // 3. Node JS Status
    exec('pgrep -f "node.*dirt.js"', $out_node, $ret_node);
    $statuses['nodejs'] = ($ret_node === 0);

    header('Content-Type: application/json');
    echo json_encode($statuses);
    exit;
}
?>
