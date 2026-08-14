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

/* Objavljivanje ponude kao veb stranice — ne zahteva bazu */
if (($_GET['action'] ?? '') === 'publish') {
  $body = json_decode(file_get_contents('php://input'), true) ?: [];
  $html = $body['html'] ?? '';
  if (!is_string($html) || strlen($html) < 100) out(false, null, 'Prazan sadržaj ponude.');
  if (strlen($html) > 8 * 1024 * 1024) out(false, null, 'Ponuda je prevelika (preko 8 MB).');
  $dir = __DIR__ . '/ponude';
  if (!is_dir($dir) && !@mkdir($dir, 0755, true)) out(false, null, 'Ne mogu da napravim folder ponude/. Napravite ga ručno u File Manager-u.');
  $token = bin2hex(random_bytes(6));
  $file  = $dir . '/' . $token . '.html';
  if (@file_put_contents($file, $html) === false) out(false, null, 'Upis nije uspeo — proverite dozvole foldera ponude/ (treba 0755).');
  @chmod($file, 0644);
  $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
  $base   = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '') . rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
  out(true, ['url' => $base . '/ponude/' . $token . '.html']);
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
