<?php
function popBottomGrid($t1fullHash) {
$settingsPath = '/boot/config/plugins/bobbintb.system.dedupe/bobbintb.system.dedupe.json';
$settings = json_decode(file_get_contents($settingsPath), true);
$dbFile = realpath($settings['dbfile']).'/deduper.db';
$db = new SQLite3($dbFile);
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['t1fullHash'])) {
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
}

if (isset($_GET['function'])) {
  switch ($_GET['function']) {
    case 'popBottomGrid':
      popBottomGrid($_GET['t1fullHash']);
      break;
    // add more cases for other functions
  }
}


?>