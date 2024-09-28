<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $jsonFilePath = './plugins/bobbintb.system.dedupe/bobbintb.system.dedupe.json';
    $postData = file_get_contents('php://input');

    if ($postData === false) {
        error_log("Failed to read POST data.");
        echo json_encode(['error' => 'Failed to read POST data.']);
        exit;
    } else {
        error_log("Raw POST Data: " . $postData);
    }
    list($jsonPart, $csrfPart) = explode('&', $postData, 2);
    $jsonObject = json_decode($jsonPart, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        // Convert the parsed JSON back to a JSON string without escaping slashes
        $validJson = json_encode($jsonObject, JSON_UNESCAPED_SLASHES);
        echo $validJson;
    } else {
        echo json_encode(['error' => 'Invalid JSON input']);
    }
    $decodedData = json_decode($validJson, true);

    if (json_last_error() === JSON_ERROR_NONE) {
         file_put_contents($jsonFilePath, json_encode($decodedData, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
    } else {
        error_log("JSON Decode Error: " . json_last_error_msg());
        echo json_encode(['error' => 'JSON Decode Error: ' . json_last_error_msg()]);
    }
} else {
    error_log('Invalid request method. Please use POST.');
    echo json_encode(['error' => 'Invalid request method. Please use POST.']);
}
?>