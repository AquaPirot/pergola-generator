<?php
/* ═══ PROHORECA AG GROUP — prijem mera sa stranice za kupce ═══
   POST JSON: {ime, telefon, a, b, c, napomena, izvor}
   Upisuje upit u MySQL (tabela upiti) i šalje email vlasniku.       */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/config.php';

function out($ok, $err = null) {
  echo json_encode(['ok' => $ok, 'error' => $err], JSON_UNESCAPED_UNICODE);
  exit;
}

$b = json_decode(file_get_contents('php://input'), true) ?: [];

// honeypot — botovi popune skriveno polje, ljudi ne
if (!empty($b['website'])) out(true);

$ime  = trim(mb_substr($b['ime'] ?? '', 0, 190));
$tel  = trim(mb_substr($b['telefon'] ?? '', 0, 60));
$ma   = trim(mb_substr($b['a'] ?? '', 0, 20));
$mb   = trim(mb_substr($b['b'] ?? '', 0, 20));
$mc   = trim(mb_substr($b['c'] ?? '', 0, 20));
$nap  = trim(mb_substr($b['napomena'] ?? '', 0, 1000));
$izvor= trim(mb_substr($b['izvor'] ?? '', 0, 80));

if ($ime === '' || $tel === '') out(false, 'Upišite ime i broj telefona da možemo da vas kontaktiramo.');
if ($ma === '' && $mb === '' && $mc === '') out(false, 'Upišite bar jednu meru.');

$dbOk = false; $mailOk = false;

try {
  $pdo = new PDO(
    'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
    DB_USER, DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );
  $pdo->exec("CREATE TABLE IF NOT EXISTS upiti(
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ime VARCHAR(190) NOT NULL DEFAULT '',
    telefon VARCHAR(60) NOT NULL DEFAULT '',
    mera_a VARCHAR(20) NOT NULL DEFAULT '',
    mera_b VARCHAR(20) NOT NULL DEFAULT '',
    mera_c VARCHAR(20) NOT NULL DEFAULT '',
    napomena TEXT,
    izvor VARCHAR(80) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  $st = $pdo->prepare("INSERT INTO upiti(ime,telefon,mera_a,mera_b,mera_c,napomena,izvor) VALUES(?,?,?,?,?,?,?)");
  $st->execute([$ime, $tel, $ma, $mb, $mc, $nap, $izvor]);
  $dbOk = true;
} catch (Exception $e) {}

$to = defined('NOTIFY_EMAIL') ? NOTIFY_EMAIL : '';
if ($to) {
  $sub  = 'Nove mere za pergolu' . ($ime ? " — $ime" : '');
  $body = "Stigle su nove mere sa stranice za kupce:\n\n"
        . "Ime:       $ime\n"
        . "Telefon:   $tel\n"
        . "A (širina): " . ($ma ?: '—') . " cm\n"
        . "B (visina): " . ($mb ?: '—') . " cm\n"
        . "C (dubina): " . ($mc ?: '—') . " cm\n"
        . "Napomena:  " . ($nap ?: '—') . "\n"
        . "Izvor:     $izvor\n"
        . "Vreme:     " . date('d.m.Y. H:i');
  $hdr = "From: mere@aggroup.rs\r\nContent-Type: text/plain; charset=UTF-8";
  $mailOk = @mail($to, '=?UTF-8?B?' . base64_encode($sub) . '?=', $body, $hdr);
}

if ($dbOk || $mailOk) out(true);
out(false, 'Slanje trenutno nije moguće — pozovite nas na 064 89 79 242 ili pošaljite mere preko WhatsApp/Viber dugmeta.');
