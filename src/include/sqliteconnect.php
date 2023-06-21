<?php
$db = new SQLite3('plugins/bobbintb.system.dedupe/deduper.db');

function popLeftGrid() {
  $query = "
SELECT json_group_array(json_object('fullHash', fullHash, 'st_size', st_size, 'count', count)) AS result
FROM (
  SELECT json_extract(data, '$.fullHash') AS fullHash,
         json_extract(data, '$.st_size') AS st_size,
         COUNT(*) AS count
  FROM files
  WHERE json_extract(data, '$.fullHash') IN (
    SELECT json_extract(data, '$.fullHash')
    FROM files
    GROUP BY json_extract(data, '$.fullHash')
    HAVING COUNT(*) > 1
  )
  GROUP BY fullHash, st_size
) AS subquery
GROUP BY '';
";
$results = $db->query($query);
return json_encode($results->fetchArray(SQLITE3_ASSOC));
}

function popBottomGrid(t1fullHash) {
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