<?php
/* ═══ PROHORECA AG GROUP — API za sinhronizaciju projekata ═══
   Radi uz config.php (DB podaci + šifra za sinhronizaciju).
   Akcije: ?action=list | save | delete  (POST, JSON telo)          */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/config.php';

function out($ok, $data = null, $err = null) {
  echo json_encode(['ok' => $ok, 'data' => $data, 'error' => $err], JSON_UNESCAPED_UNICODE);
  exit;
}

$key = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!hash_equals(API_KEY, $key)) {
  http_response_code(401);
  out(false, null, 'Pogrešna šifra za sinhronizaciju.');
}

try {
  $pdo = new PDO(
    'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
    DB_USER, DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );
  $pdo->exec("CREATE TABLE IF NOT EXISTS projects(
    id BIGINT PRIMARY KEY,
    name VARCHAR(190) NOT NULL,
    date VARCHAR(20) NOT NULL DEFAULT '',
    data LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (Exception $e) {
  http_response_code(500);
  out(false, null, 'Baza nedostupna: ' . $e->getMessage());
}

$action = $_GET['action'] ?? '';
$body = json_decode(file_get_contents('php://input'), true) ?: [];

switch ($action) {
  case 'list':
    $rows = $pdo->query("SELECT id,name,date,data FROM projects ORDER BY updated_at DESC")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) { $r['id'] = 0 + $r['id']; $r['data'] = json_decode($r['data'], true); }
    out(true, $rows);

  case 'save':
    if (empty($body['id']) || !isset($body['name']) || !isset($body['data'])) out(false, null, 'Nepotpuni podaci.');
    $st = $pdo->prepare("INSERT INTO projects(id,name,date,data) VALUES(?,?,?,?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), date=VALUES(date), data=VALUES(data)");
    $st->execute([
      $body['id'],
      mb_substr(trim($body['name']), 0, 190),
      mb_substr($body['date'] ?? '', 0, 20),
      json_encode($body['data'], JSON_UNESCAPED_UNICODE)
    ]);
    out(true);

  case 'delete':
    if (empty($body['id'])) out(false, null, 'Nedostaje id.');
    $pdo->prepare("DELETE FROM projects WHERE id=?")->execute([$body['id']]);
    out(true);

  default:
    out(false, null, 'Nepoznata akcija.');
}
