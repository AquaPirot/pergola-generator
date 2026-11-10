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

/* Čišćenje starih ponuda — najviše jednom dnevno, pri objavi nove.
   Ponuda starija od PONUDE_DANA (podrazumevano 90) zamenjuje se kratkom stranicom
   „ponuda je istekla" sa kontaktom, a njena slika za pregled linka se briše.
   Godinu dana posle toga briše se i ta kratka stranica. PONUDE_DANA = 0 isključuje čišćenje. */
function ponude_cisti($dir) {
  $dana = defined('PONUDE_DANA') ? (int)PONUDE_DANA : 90;
  if ($dana <= 0) return;
  $znak = $dir . '/.ciscenje';
  if (file_exists($znak) && @filemtime($znak) > time() - 86400) return;
  @touch($znak);
  $granica = time() - $dana * 86400;
  foreach ((@scandir($dir) ?: []) as $f) {
    if (!preg_match('/^[0-9a-f]{12}\.(html|jpg|png|webp)$/', $f, $m)) continue;   // samo fajlovi koje pravi ovaj program
    $p = $dir . '/' . $f;
    $t = @filemtime($p);
    if (!$t || $t > $granica) continue;
    if ($m[1] !== 'html') { @unlink($p); continue; }
    if (@filesize($p) < 4000) { if ($t < $granica - 365 * 86400) @unlink($p); continue; }   // već zamenjena
    $h = @file_get_contents($p);
    if ($h === false) continue;
    $tel = preg_match('/href="tel:([^"]{3,30})"/', $h, $x) ? $x[1] : '';
    $vib = preg_match('/href="viber:\/\/chat\?number=([^"]{3,30})"/', $h, $x) ? $x[1] : '';
    $bg  = strpos($h, 'PERGOLAS.BG') !== false;
    $e   = function ($v) { return htmlspecialchars($v, ENT_QUOTES); };
    $n   = $bg ? ['Офертата е изтекла', 'Цените и условията може да са променени. Обадете се или ни пишете — ще Ви изпратим нова оферта.', 'Обади се', 'Viber съобщение']
               : ['Ova ponuda je istekla', 'Cene i uslovi su se možda promenili. Pozovite nas ili nam pišite — poslaćemo Vam novu ponudu.', 'Pozovi', 'Viber poruka'];
    $kratka = '<!DOCTYPE html><html lang="' . ($bg ? 'bg' : 'sr') . '"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      . '<meta name="robots" content="noindex,nofollow"><title>AG GROUP — ' . $n[0] . '</title><style>'
      . 'body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f4f5f7;color:#16213a;text-align:center}'
      . 'header{background:#14213d;color:#fff;padding:18px;font-weight:800;font-size:19px;letter-spacing:.5px}'
      . 'main{max-width:440px;margin:0 auto;padding:44px 22px}h1{font-size:22px;margin:0 0 12px}p{color:#6b7280;line-height:1.55;margin:0 0 26px}'
      . 'a{display:block;padding:14px;border-radius:11px;text-decoration:none;font-weight:800;margin-top:10px;color:#fff;background:#14213d}a.v{background:#c8944e}'
      . '</style></head><body><header>AG GROUP</header><main><h1>' . $n[0] . '</h1><p>' . $n[1] . '</p>'
      . ($tel !== '' ? '<a href="tel:' . $e($tel) . '">' . $n[2] . ' ' . $e($tel) . '</a>' : '')
      . ($vib !== '' ? '<a class="v" href="viber://chat?number=' . $e($vib) . '">' . $n[3] . '</a>' : '')
      . '</main></body></html>';
    if (@file_put_contents($p, $kratka) !== false) @touch($p, $t);   // datum ostaje — da se zna kad je ponuda napravljena
  }
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
  $dir = defined('PONUDE_DIR') ? PONUDE_DIR : __DIR__ . '/ponude';
  if (!is_dir($dir) && !@mkdir($dir, 0755, true)) out(false, null, 'Ne mogu da napravim folder ponude/. Napravite ga ručno u File Manager-u.');
  // prazan index.html — da se spisak ponuda ne može izlistati ako server prikazuje sadržaj foldera
  if (!file_exists($dir . '/index.html')) { @file_put_contents($dir . '/index.html', ''); @chmod($dir . '/index.html', 0644); }
  $token = bin2hex(random_bytes(6));
  if (defined('PONUDE_URL')) {
    $urlBase = rtrim(PONUDE_URL, '/');
  } else {
    $scheme  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $urlBase = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '')
             . rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/') . '/ponude';
  }
  // slika za pregled linka (Viber, WhatsApp) — fotografija modela sa uređaja, umanjena
  $og = '';
  $img = $body['img'] ?? '';
  if (is_string($img) && preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$#', $img, $m)) {
    $bin = base64_decode($m[2], true);
    if ($bin !== false && strlen($bin) <= 3 * 1024 * 1024 && @getimagesizefromstring($bin)) {
      $ext = $m[1] === 'jpeg' ? 'jpg' : $m[1];
      if (@file_put_contents($dir . '/' . $token . '.' . $ext, $bin) !== false) {
        @chmod($dir . '/' . $token . '.' . $ext, 0644);
        $og = $urlBase . '/' . $token . '.' . $ext;
      }
    }
  }
  $html = str_replace('__OG_IMAGE__', htmlspecialchars($og, ENT_QUOTES), $html);
  $file  = $dir . '/' . $token . '.html';
  if (@file_put_contents($file, $html) === false) out(false, null, 'Upis nije uspeo — proverite dozvole foldera ponude/ (treba 0755).');
  @chmod($file, 0644);
  try { ponude_cisti($dir); } catch (Throwable $e) {}   // čišćenje nikad ne sme da omete objavu
  out(true, ['url' => $urlBase . '/' . $token . '.html']);
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
