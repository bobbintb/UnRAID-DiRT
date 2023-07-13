<?php
function deleteFile($filePath) {
    if (file_exists($filePath)) {
        if (unlink($filePath)) {
            return "File deleted successfully.";
        } else {
            return "Failed to delete the file.";
        }
    } else {
        return "File does not exist.";
    }
}

// Check if the request contains the 'filePath' parameter
if (isset($_GET['filePath'])) {
    $filePath = $_GET['filePath'];
    $result = deleteFile($filePath);
    echo $result;
} else {
    echo "Invalid request. Please provide the 'filePath' parameter.";
}
?>
