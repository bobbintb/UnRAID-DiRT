<?php
// Include the Redis extension
$redis = new Redis();

try {
    // Connect to Redis server (adjust the host and port as needed)
    $redis->connect('192.168.1.2', 6379);

    // Check if the connection is successful
    if (!$redis->ping()) {
        throw new Exception('Unable to connect to Redis');
    }

    // Get all keys with a specific pattern for hashes (e.g., all keys that store hashes)
    $keys = $redis->keys('*'); // You can specify a pattern if needed

    $hashes = [];

    // Loop through all keys and get the hash if it exists
    foreach ($keys as $key) {
        // Check if the key is a hash
        if ($redis->type($key) == Redis::REDIS_HASH) {
            // Get all fields and values from the hash
            $hashes[$key] = $redis->hGetAll($key);
        }
    }

    // Set content type to JSON
    header('Content-Type: application/json');

    // Return the result as JSON
    echo json_encode($hashes);
} catch (Exception $e) {
    // Handle connection or query errors
    http_response_code(500); // Set HTTP response code to 500 (Internal Server Error)
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}

// Close the Redis connection
$redis->close();
?>
