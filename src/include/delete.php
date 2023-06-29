<?php
function deleteFile($filePath) {
  if (file_exists($filePath)) {
    if (unlink($filePath)) {
      return true; // File deleted successfully
    } else {
      return false; // Failed to delete the file
    }
  } else {
    return false; // File does not exist
  }
}

if (isset($_POST['deleteButton'])) {
    echo 'test';
    echo $_POST['file_path'];
    echo $_POST['value'];
  $filePath = $_POST['file_path'];
  $deleted = deleteFile($filePath);
  if ($deleted) {
    echo 'File deleted successfully.';
  } else {
    echo 'Failed to delete the file.';
  }
}
?>
