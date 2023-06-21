<?php
$db = new SQLite3('plugins/bobbintb.system.dedupe/deduper.db');
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['t1fullHash'])) {
  $t1fullHash = $_GET['t1fullHash'];
  $query = $db->prepare('SELECT * FROM files WHERE json_extract(data, \'$.fullHash\') = :t1fullHash');
  $query->bindValue(':t1fullHash', $t1fullHash, SQLITE3_TEXT);
  $results = $query->execute();
  $rows = array();
  while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
    $rows[] = $row;
  }
  header('Content-Type: application/json');
  echo json_encode($rows);
} else {
  http_response_code(400);
  echo json_encode(array('error' => 'Invalid request'));
}
?>
