/* ═══════════════════════════════════════════════════════════════
   PROJEKTANT — model sklopa, sastavnice i listovi
   Sve mere su u mm. Ose dužine: 1, 2, 3 …   Ose dubine: A, B, C.
   ═══════════════════════════════════════════════════════════════ */
import { List, Pogled, DEB, OSA, SKR, kotaL, nivo, poz, osaOznaka, naslov, presekOzn, lom, teren, razmera, br, sirina } from './crtez.js';

/* ───────────── katalog alu profila (porudžbina 0000003232) ───────────── */
export const KATALOG = [
  { id: '10417', n: 'Bull Block Tube Profile', kg: 1.125, L: 9000, pov: 'mill finished' },
  { id: '10418', n: 'Thin Stringcourse Profile', kg: 0.741, L: 7500 },
  { id: '10420', n: 'Vertical Meeting Profile', kg: 1.37, L: 9000 },
  { id: '10468', n: 'Gutter Profile', kg: 4.106, L: 9000 },
  { id: '10501', n: '90×150 mm Rail Profile', kg: 4.14, L: 9000 },
  { id: '10419', n: '144 mm Counterfort Profile', kg: 2.97, L: 7500 },
  { id: '10416', n: 'Thick Stringcourse Profile', kg: 1.303, L: 7500 },
  { id: '10477', n: 'Gutter Profile', kg: 4.444, L: 9000 },
  { id: '10414', n: '100 Foot Profile', kg: 2.328, L: 9000 },
  { id: '10412', n: '70×150 mm Rail Profile', kg: 3.14, L: 9000 },
  { id: '10472', n: 'Thick Stringcourse Profile', kg: 1.5, L: 9000 },
  { id: '10471', n: 'Thin Cornice Profile', kg: 0.853, L: 9000 }
];
export const PROF = id => KATALOG.find(p => p.id === id) || { id, n: '?', kg: 0, L: 0 };
/* uloga u konstrukciji → šifra profila (proverava se u kartici „Profili") */
export const ULOGE = [
  ['stub', 'Stub (alu)', '10419'],
  ['greda', 'Prednja greda sa olukom', '10468'],
  ['rogI', 'Rog — ivični', '10412'],
  ['rogS', 'Rog — srednji', '10501']
];

export const TIPOVI = {
  'zid-stubovi': { n: 'Uz zid — čelični stubovi nose cev', pre: 'PG-ZS', strana: 1, cel: 'stubovi' },
  'zid-konzole': { n: 'Uz zid — konzole (stopa + cev 100×100)', pre: 'PG-ZK', strana: 1, cel: 'konzole' },
  'zid-lstope': { n: 'Uz zid — L-stope', pre: 'PG-ZL', strana: 1, cel: 'lstope' },
  'zid': { n: 'Uz zid — zidni profil 80×40', pre: 'PG-Z', strana: 1, cel: null },
  'samostojeca': { n: 'Samostojeća — stubovi i cev kao greda', pre: 'PG-SS', strana: 1, cel: 'stubovi' },
  'dvovodna': { n: 'Dvovodna — dva reda na centralnoj konstrukciji', pre: 'PG-2V', strana: 2, cel: 'stubovi' }
};

export const DEF = {
  tip: 'dvovodna', L: 10000, nB: 4, nP: 2, D: 4400, prol: 2500, bh: 250, Hz: 3200,
  cev: '100×100×3', temelj: 'samac', isp: 400, sip: 6000,
  lA: 500, lH: 600, lOr: 'gore', cevL: '100×100×3', sipC: 6000, rez: 3,
  zastita: 'toplo cinkovanje + plastifikacija RAL 7016', zavar: 'a=4 mm, obostrano',
  objekat: '', broj: '', rev: 'A', datum: '', projektovao: 'A. Ćirić', crtao: 'A. Ćirić', kontrolisao: '',
  uloge: { stub: '10419', greda: '10468', rogI: '10412', rogS: '10501' }
};

/* ───────────── čelik ───────────── */
export const SHS = ['80×80×3', '80×80×4', '100×100×3', '100×100×4', '100×100×5', '120×120×4', '120×120×5'];
function shs(oz) { const [b, , t] = oz.split('×').map(Number); return { b, t }; }
/* masa hladno oblikovane kutije, EN 10219: A = 2t(B+H−2t) − (4−π)(ro²−ri²), ro=2t, ri=t */
export function shsKg(oz) { const { b, t } = shs(oz); const A = 2 * t * (2 * b - 2 * t) - (4 - Math.PI) * (4 * t * t - t * t); return Math.round(A * 7.85e-3 * 100) / 100; }
const plKg = (a, b, t) => a * b * t * 7.85e-6;

/* ───────────── L-stopa od cevi ─────────────
   a = vodoravni krak (spolja), h = uspravni krak (spolja), or = kako je okrenuta:
   'gore'  — sa zida napolje, pa gore (zaobilazi okapnicu); greda na vrhu uspravnog kraka
   'dole'  — sa zida napolje, pa dole; greda ispod uspravnog kraka
   'vrh'   — sa vrha zida gore, pa napolje (preko krova); greda na kraju vodoravnog kraka
   Koordinate: v od lica zida (napolje +), y visina; Hz = vrh grede. */
export const L_OR = { gore: 'Sa zida napolje, pa gore (oko okapnice)', dole: 'Sa zida napolje, pa dole', vrh: 'Sa vrha zida gore, pa napolje (preko krova)' };
export function lGeom(P, b, Hz) {
  const { b: bL, t: tL } = shs(P.cevL || P.cev), a = +P.lA, h = +P.lH, or = L_OR[P.lOr] ? P.lOr : 'gore', kap = 8, wc = -130;
  let hor, ver, plate, gus = [], vS, Hw = null, cutH, cutV, kapY, anker;
  if (or === 'gore') {
    const yT = Hz - b - kap, y0 = yT - h;
    ver = [a - bL, y0 + bL, a, yT]; hor = [10, y0, a, y0 + bL];
    plate = [0, y0 + bL / 2 - 100, 10, y0 + bL / 2 + 100];
    gus.push([[a - bL, y0 + bL], [a - bL - 120, y0 + bL], [a - bL, y0 + bL + 120]]);
    gus.push([[10, y0], [10, y0 - 150], [160, y0]]);
    vS = a - bL / 2; cutH = a - 10; cutV = h - bL; kapY = [yT, yT + kap];
    anker = [y0 + bL / 2 - 70, y0 + bL / 2 + 70].map(y => ['h', y]);
  } else if (or === 'dole') {
    const yB = Hz + kap, yt = yB + h;
    ver = [a - bL, yB, a, yt - bL]; hor = [10, yt - bL, a, yt];
    plate = [0, yt - bL / 2 - 100, 10, yt - bL / 2 + 100];
    gus.push([[a - bL, yt - bL], [a - bL - 120, yt - bL], [a - bL, yt - bL - 120]]);
    gus.push([[10, yt - bL], [10, yt - bL - 150], [160, yt - bL]]);
    vS = a - bL / 2; cutH = a - 10; cutV = h - bL; kapY = [Hz, Hz + kap];
    anker = [yt - bL / 2 - 70, yt - bL / 2 + 70].map(y => ['h', y]);
  } else {
    const yHt = Hz - b - kap; Hw = yHt - h - 10;
    const x0 = wc - bL / 2;
    ver = [x0, Hw + 10, x0 + bL, yHt - bL]; hor = [x0, yHt - bL, x0 + a, yHt];
    plate = [wc - 100, Hw, wc + 100, Hw + 10];
    gus.push([[x0 + bL, yHt - bL], [x0 + bL + 120, yHt - bL], [x0 + bL, yHt - bL - 120]]);
    gus.push([[x0 + bL, Hw + 10], [x0 + bL + 60, Hw + 10], [x0 + bL, Hw + 90]]);
    gus.push([[x0, Hw + 10], [x0 - 60, Hw + 10], [x0, Hw + 90]]);
    vS = x0 + a - bL / 2; cutH = a; cutV = h - bL; kapY = [yHt, yHt + kap];
    anker = [wc - 70, wc + 70].map(x => ['v', x]);
  }
  const top = Math.max(ver[3], hor[3], kapY[1]), bot = Math.min(ver[1], hor[1], plate[1]);
  return { or, bL, tL, a, h, ver, hor, plate, gus, vS, Hw, cutH, cutV, kapY, anker, top, bot, vOut: Math.max(ver[2], hor[2]), vIn: or === 'vrh' ? hor[0] : 0 };
}
const r1 = v => Math.round(v * 10) / 10;
export const zarez = v => String(v).replace('.', ',');
const fkg = v => zarez(r1(v).toFixed(1));

/* ═══════════════ RAČUN SKLOPA ═══════════════ */
export function racun(P) {
  const T = TIPOVI[P.tip], strana = T.strana, { b, t } = shs(P.cev);
  const L = +P.L, D = +P.D, nB = Math.max(1, Math.round(+P.nB)), nP = Math.min(Math.max(1, Math.round(+P.nP)), nB);
  const prol = +P.prol, bh = +P.bh, Hz = +P.Hz, Hf = prol + bh;
  const xa = [...Array(nB + 1)].map((_, i) => i * L / nB);                 // ose
  const xs = xa.map((x, i) => i === 0 ? b / 2 : i === nB ? L - b / 2 : x);   // ose čeličnih stubova (krajnji uvučeni)
  const aS = 100;                                                           // širina alu stuba duž dužine
  const xf = xa.map((x, i) => i === 0 ? aS / 2 : i === nB ? L - aS / 2 : x);
  // pergole (moduli) po osama
  const mod = []; { const base = Math.floor(nB / nP), ex = nB % nP; let a = 0; for (let k = 0; k < nP; k++) { const n = base + (k < ex ? 1 : 0); mod.push([a, a + n]); a += n; } }
  // zadnji oslonac: dokle ide konstrukcija (početak roga)
  const isp = +P.isp, G = P.tip === 'zid-lstope' ? lGeom(P, b, Hz) : null;
  const vb = { 'dvovodna': b / 2, 'samostojeca': b, 'zid-stubovi': 30 + b, 'zid-konzole': isp, 'zid-lstope': G ? G.vS + b / 2 : 0, 'zid': 40 }[P.tip];
  const vS = { 'dvovodna': 0, 'samostojeca': b / 2, 'zid-stubovi': 30 + b / 2, 'zid-konzole': isp - b / 2, 'zid-lstope': G ? G.vS : 0, 'zid': 20 }[P.tip];
  const vOut = G ? G.vOut : isp, vIn = G ? G.vIn : 0;
  const nag = (Hz - Hf) / D * 100;
  const rogL = Math.round(Math.hypot(D - vb, Hz - Hf));
  // čelična greda — delovi do najviše P.sip, nastavci iznad stubova
  const seg = []; { let a = 0; while (a < nB) { let e = a + 1; while (e < nB && xa[e + 1] - xa[a] <= +P.sip + 1) e++; seg.push([a, e]); a = e; } }
  const nast = seg.slice(0, -1).map(s => s[1]);                            // indeksi osa sa nastavkom
  // upozorenja
  const upoz = [];
  const raz = L / nB;
  if (raz > 4000) upoz.push(`Razmak osa ${Math.round(raz)} mm je veći od 4 m — povećajte broj polja na najmanje ${Math.ceil(L / 4000)}.`);
  if (nag < 5) upoz.push(`Nagib ${nag.toFixed(1).replace('.', ',')} % je mali — preporuka je 8–15 %.`);
  if (nag > 20) upoz.push(`Nagib ${nag.toFixed(1).replace('.', ',')} % je veliki — proverite visine.`);
  if (prol < 2100) upoz.push('Prolazna visina je manja od 2,10 m.');
  if (Hz <= Hf) upoz.push('Visina gore mora biti veća od prolazne visine + visine grede.');
  if (G) {
    if (G.cutV < 50) upoz.push('Uspravni krak L-stope mora biti duži od debljine cevi.');
    if (G.or === 'vrh' && G.vS - b / 2 < 30) upoz.push('Vodoravni krak L-stope je prekratak — greda bi stajala iznad zida.');
    if (G.or === 'vrh' && G.Hw < 1200) upoz.push(`Zid ispod L-stope izlazi ${Math.round(G.Hw)} mm — proverite visine i uspravni krak.`);
    if (G.or !== 'vrh' && G.a < G.bL + 150) upoz.push('Vodoravni krak L-stope je prekratak.');
  }
  mod.forEach(m => { const w = xa[m[1]] - xa[m[0]]; if (w > 7000) upoz.push(`Pergola širine ${Math.round(w)} mm — proverite širinu platna (više pergola?).`); });
  return { T, strana, b, t, L, D, nB, nP, prol, bh, Hz, Hf, xa, xs, xf, aS, mod, isp, vb, vS, vOut, vIn, G, nag, rogL, seg, nast, upoz };
}

/* ═══════════════ SASTAVNICE ═══════════════ */
export function sastavnicaCelik(P, R) {
  const { b, xs, xa, seg, nast, Hz } = R, n = xs.length, ns = nast.length, cev = P.cev, kgm = shsKg(cev);
  const rows = [], add = (k, naziv, dim, Lm, kom, mat, kg) => { if (kom > 0) rows.push({ k, naziv, dim, L: Lm, kom, mat, kg }); };
  const grede = {}; seg.forEach(s => { const l = Math.round((s[1] === R.nB ? R.L : xa[s[1]]) - (s[0] === 0 ? 0 : xa[s[0]])); grede[l] = (grede[l] || 0) + 1; });
  const kap = b + 16, S = 'S235JR';
  if (R.T.cel === 'stubovi') {
    const Ls = Math.round(Hz - b - 10 - 8);
    add('stub', 'Stub', 'SHS ' + cev, Ls, n, S, Ls / 1000 * kgm * n);
    Object.entries(grede).forEach(([l, k]) => add('greda', 'Greda', 'SHS ' + cev, +l, k, S, l / 1000 * kgm * k));
    add('ploca', 'Ploča stope', '200×200×10', '—', n, S, plKg(200, 200, 10) * n);
    add('kapna', 'Kapna ploča', `${kap}×${b}×8`, '—', n - ns, S, plKg(kap, b, 8) * (n - ns));
    add('kapnaS', 'Kapna ploča, spoj', `${kap}×${2 * b}×8`, '—', ns, S, plKg(kap, 2 * b, 8) * ns);
    add('bocna', 'Bočna ploča sedla', `${b}×${b}×8`, '—', 2 * (n - ns), S, plKg(b, b, 8) * 2 * (n - ns));
    add('bocnaS', 'Bočna ploča sedla, spoj', `${2 * b}×${b}×8`, '—', 2 * ns, S, plKg(2 * b, b, 8) * 2 * ns);
    add('rebro', 'Rebro stope', '50×80×8', '—', 4 * n, S, plKg(50, 80, 8) / 2 * 4 * n);
    add('navrtka', 'Navrtka s podloškom', 'M12', '—', 4 * n, '8 tZn', 0);
    add('anker', 'Hemijski anker', 'M12×160', '—', 4 * n, '8.8 tZn', 0);
    add('vijak', 'Vijak s navrtkom', 'M12×140', '—', 2 * (n - ns) + 4 * ns, '8.8 tZn', 0);
  } else if (R.T.cel === 'konzole') {
    const Lk = Math.round(R.isp - 10);
    add('konzola', 'Konzola', 'SHS ' + cev, Lk, n, S, Lk / 1000 * kgm * n);
    Object.entries(grede).forEach(([l, k]) => add('greda', 'Greda (cev)', 'SHS ' + cev, +l, k, S, l / 1000 * kgm * k));
    add('ploca', 'Zidna ploča', '200×200×10', '—', n, S, plKg(200, 200, 10) * n);
    add('rebro', 'Rebro konzole', '150×150×8', '—', n, S, plKg(150, 150, 8) / 2 * n);
    add('bocna', 'Bočna ploča sedla', `${b}×${b}×8`, '—', 2 * (n - ns), S, plKg(b, b, 8) * 2 * (n - ns));
    add('bocnaS', 'Bočna ploča sedla, spoj', `${2 * b}×${b}×8`, '—', 2 * ns, S, plKg(2 * b, b, 8) * 2 * ns);
    add('anker', 'Hemijski anker (u zid)', 'M12×160', '—', 4 * n, '8.8 tZn', 0);
    add('navrtka', 'Navrtka s podloškom', 'M12', '—', 4 * n, '8 tZn', 0);
    add('vijak', 'Vijak s navrtkom', 'M12×140', '—', 2 * (n - ns) + 4 * ns, '8.8 tZn', 0);
  } else if (R.T.cel === 'lstope') {
    const G = R.G, cL = P.cevL, kgL = shsKg(cL), kapL = G.bL + 16, vrh = G.or === 'vrh';
    add('lver', 'L-stopa — uspravni krak', 'SHS ' + cL, Math.round(G.cutV), n, S, G.cutV / 1000 * kgL * n);
    add('lhor', 'L-stopa — vodoravni krak', 'SHS ' + cL, Math.round(G.cutH), n, S, G.cutH / 1000 * kgL * n);
    add('ploca', vrh ? 'Ploča na vrhu zida' : 'Zidna ploča', '200×200×10', '—', n, S, plKg(200, 200, 10) * n);
    add('rebro', 'Rebro ugla L-stope', '120×120×8', '—', n, S, plKg(120, 120, 8) / 2 * n);
    add('rebroP', vrh ? 'Rebro ploče' : 'Rebro zidne ploče', vrh ? '60×80×8' : '150×150×8', '—', vrh ? 2 * n : n, S, (vrh ? plKg(60, 80, 8) / 2 * 2 : plKg(150, 150, 8) / 2) * n);
    add('kapna', 'Kapna ploča', `${kapL}×${G.bL}×8`, '—', n - ns, S, plKg(kapL, G.bL, 8) * (n - ns));
    add('kapnaS', 'Kapna ploča, spoj', `${kapL}×${2 * b}×8`, '—', ns, S, plKg(kapL, 2 * b, 8) * ns);
    Object.entries(grede).forEach(([l, k]) => add('greda', 'Greda (cev)', 'SHS ' + cev, +l, k, S, l / 1000 * kgm * k));
    add('bocna', 'Bočna ploča sedla', `${b}×${b}×8`, '—', 2 * (n - ns), S, plKg(b, b, 8) * 2 * (n - ns));
    add('bocnaS', 'Bočna ploča sedla, spoj', `${2 * b}×${b}×8`, '—', 2 * ns, S, plKg(2 * b, b, 8) * 2 * ns);
    add('anker', vrh ? 'Hemijski anker (u vrh zida)' : 'Hemijski anker (u zid)', 'M12×160', '—', 4 * n, '8.8 tZn', 0);
    add('navrtka', 'Navrtka s podloškom', 'M12', '—', 4 * n, '8 tZn', 0);
    add('vijak', 'Vijak s navrtkom', 'M12×140', '—', 2 * (n - ns) + 4 * ns, '8.8 tZn', 0);
  }
  rows.forEach((r, i) => r.poz = i + 1);
  return rows;
}
export function sastavnicaAlu(P, R) {
  const s = R.strana, n = R.nB + 1, rows = [], u = P.uloge;
  const add = (k, naziv, dim, Lm, kom, mat, kg) => { if (kom > 0) rows.push({ k, naziv, dim, L: Lm, kom, mat, kg }); };
  const pk = id => PROF(id);
  add('stub', 'Stub spoljni', pk(u.stub).id, R.prol, n * s, 'Al', R.prol / 1000 * pk(u.stub).kg * n * s);
  const gr = {}; R.mod.forEach(m => { const l = Math.round(R.xa[m[1]] - R.xa[m[0]]); gr[l] = (gr[l] || 0) + s; });
  Object.entries(gr).forEach(([l, k]) => add('greda', 'Prednja greda sa olukom', pk(u.greda).id, +l, k, 'Al', l / 1000 * pk(u.greda).kg * k));
  add('rogI', 'Rog — ivični', pk(u.rogI).id, R.rogL, 2 * s, 'Al', R.rogL / 1000 * pk(u.rogI).kg * 2 * s);
  add('rogS', 'Rog — srednji', pk(u.rogS).id, R.rogL, (n - 2) * s, 'Al', R.rogL / 1000 * pk(u.rogS).kg * (n - 2) * s);
  if (P.tip === 'zid') add('zidni', 'Zidni profil', '80×40', R.L, 1, 'Al', 0);
  add('cerada', 'Cerada sa LED profilima', '', '—', R.nP * s, 'PVC 850 g/m²', 0);
  add('motor', 'Motor s daljinskim upravljanjem', '', '—', R.nP * s, '—', 0);
  if (P.tip === 'dvovodna') add('opsivka', 'Opšivka slemena', '', R.L, 1, 'Al plastificiran', 0);
  add('pribor', 'Spojni pribor roga', '', '—', 2 * n * s, 'Al / inox A2', 0);
  if (R.T.cel) add('celik', R.T.cel === 'stubovi' ? (P.tip === 'dvovodna' ? 'Centralna konstrukcija' : 'Noseća konstrukcija') : 'Zidni nosači i greda', 'crtež ' + broj(P, 1), '—', 1, 'S235JR', 0);
  rows.forEach((r, i) => r.poz = i + 1);
  return rows;
}
export function broj(P, i) { return (P.broj || TIPOVI[P.tip].pre) + '-' + String(i).padStart(2, '0'); }
export function objekat(P, R) {
  if (P.objekat) return P.objekat;
  const np = R.nP * R.strana, pg = np === 1 ? 'pergola' : np < 5 ? 'pergole' : 'pergola';
  const dim = `${R.L} × ${R.strana * R.D}`;
  return { 'dvovodna': `Dvovodni sklop ${np} ${pg} ${dim}`, 'samostojeca': `Samostojeća, ${np} ${pg} ${dim}`, 'zid-stubovi': `Uz zid na čeličnim stubovima, ${np} ${pg} ${dim}`, 'zid-konzole': `Uz zid na konzolama, ${np} ${pg} ${dim}`, 'zid-lstope': `Uz zid na L-stopama, ${np} ${pg} ${dim}`, 'zid': `Uz zid, ${np} ${pg} ${dim}` }[P.tip];
}

/* ═══════════════ OKVIR, ZAGLAVLJE, TABELA ═══════════════ */
const TB = { x: 220, y: 229, w: 190, h: 58 };
function okvir(L) {
  L.rect(5, 5, 410, 287, { w: DEB.vt });
  L.rect(20, 10, 390, 277, { w: 0.6 });
  [[212.5, 5, 212.5, 12], [212.5, 285, 212.5, 292], [5, 148.5, 22, 148.5], [408, 148.5, 415, 148.5]].forEach(c => L.line(c[0], c[1], c[2], c[3], { w: 0.6 }));
}
function zaglavlje(L, P, z) {
  const { x, y, w, h } = TB, lw = 62, rh = h / 7;
  L.rect(x, y, w, h, { w: 0.5 });
  L.line(x + lw, y, x + lw, y + h, { w: 0.35 });
  L.line(x + 21, y, x + 21, y + h, { w: DEB.t });
  const lev = [['Projektovao', P.projektovao], ['Crtao', P.crtao], ['Kontrolisao', P.kontrolisao], ['Datum', z.datum], ['Razmera', z.razmera], ['Format', 'A3'], ['Masa', z.masa]];
  lev.forEach((r, i) => {
    if (i) L.line(x, y + i * rh, x + lw, y + i * rh, { w: DEB.t });
    L.text(x + 1.5, y + i * rh + rh / 2, r[0], { h: 1.9, v: 'm' });
    L.text(x + 23, y + i * rh + rh / 2, r[1] || '', { h: 2.3, v: 'm' });
  });
  const rx = x + lw, rw = w - lw;
  const ys = [y, y + 16, y + 36, y + 46, y + h];
  ys.slice(1, -1).forEach(yy => L.line(rx, yy, rx + rw, yy, { w: 0.35 }));
  L.text(rx + 3, y + 7.4, 'AG GROUP – ALU PRO', { h: 4.2, b: true });
  L.text(rx + 3, y + 12.6, 'Dragoševa 1B, 18300 Pirot · PIB 114815084', { h: 2 });
  L.text(rx + 3, y + 19.6, 'Naziv', { h: 1.8 });
  L.text(rx + 3, y + 26.3, z.naziv, { h: 4.1, b: true });
  L.text(rx + 3, y + 32.4, z.podnaziv, { h: 2.7 });
  L.text(rx + 3, y + 39.2, 'Objekat', { h: 1.8 });
  L.text(rx + 3, y + 43.7, z.objekat, { h: 2.7 });
  const c1 = rx + 72, c2 = rx + 102;
  L.line(c1, y + 46, c1, y + h, { w: DEB.t }); L.line(c2, y + 46, c2, y + h, { w: DEB.t });
  L.text(rx + 2, y + 48.8, 'Broj crteža', { h: 1.8 }); L.text(c1 + 2, y + 48.8, 'List', { h: 1.8 }); L.text(c2 + 2, y + 48.8, 'Revizija', { h: 1.8 });
  L.text(rx + 3, y + 55.2, z.broj, { h: 3.4, b: true });
  L.text((c1 + c2) / 2, y + 55.2, z.list, { h: 3, a: 'c' });
  L.text((c2 + rx + rw) / 2, y + 55.2, z.rev, { h: 3.4, b: true, a: 'c' });
}
function tabela(L, rows, kol) {
  const rh = 4.9, x0 = TB.x, yb = TB.y, n = rows.length;
  const top = yb - rh * (n + 1);
  L.rect(x0, top, TB.w, rh * (n + 1), { w: 0.35 });
  for (let i = 1; i <= n; i++) L.line(x0, top + i * rh, x0 + TB.w, top + i * rh, { w: i === n ? 0.35 : DEB.vt });
  let cx = x0; kol.forEach((k, j) => { if (j) L.line(cx, top, cx, yb, { w: DEB.vt }); cx += k.w; });
  rows.forEach((r, i) => {
    let xx = x0; const yy = top + i * rh + rh / 2;
    kol.forEach(k => { const v = k.f(r); if (v !== '' && v != null) L.text(k.a === 'l' ? xx + 1.5 : xx + k.w / 2, yy, v, { h: 2, a: k.a === 'l' ? 'l' : 'c', v: 'm' }); xx += k.w; });
  });
  let xx = x0; const yy = top + n * rh + rh / 2;
  kol.forEach(k => { L.text(xx + k.w / 2, yy, k.t, { h: 2, b: true, a: 'c', v: 'm' }); xx += k.w; });
  return top;
}

/* ═══════════════ LIST 01 — ČELIČNA KONSTRUKCIJA ═══════════════ */
export function list01(P, R, meta) {
  if (!R.T.cel) return null;
  const L = new List(); okvir(L);
  const rows = sastavnicaCelik(P, R), pz = k => (rows.find(r => r.k === k) || {}).poz || '';
  const { b, xs, xa, Hz, nast } = R, temelj = R.T.cel === 'stubovi' && P.temelj === 'samac';
  const dub = temelj ? 800 : 0;
  const top = tabela(L, rows, [
    { t: 'Poz', w: 10, f: r => r.poz }, { t: 'Naziv', w: 52, a: 'l', f: r => r.naziv }, { t: 'Profil / dimenzija', w: 36, f: r => r.dim },
    { t: 'L [mm]', w: 18, f: r => r.L }, { t: 'Kom', w: 14, f: r => r.kom }, { t: 'Materijal', w: 32, f: r => r.mat }, { t: 'Masa [kg]', w: 28, f: r => r.kg ? fkg(r.kg) : '—' }]);
  const masa = rows.reduce((s, r) => s + r.kg, 0);

  /* ── PODUŽNI IZGLED ── */
  const s1 = [50, 75, 100, 125, 150, 200, 250].find(s => R.L / s + 24 <= 228 && (Hz + dub) / s + 34 <= 120) || 250;
  const ox = 44, gY = 27 + (Hz + 250) / s1;
  const V = new Pogled(L, ox, gY, s1, 'izgled');
  naslov(L, 30, 19, R.T.cel === 'stubovi' ? 'PODUŽNI IZGLED' : 'IZGLED ZIDA', `R 1:${s1}`);
  const ex = R.T.cel === 'stubovi';
  if (ex) {
    const prek = temelj ? xs.map(x => { const a = V.P(x - 200, 0), c = V.P(x + 200, 0); return [a[0], c[0]]; }) : [];
    teren(L, V.P(-500, 0)[0], V.P(R.L + 500, 0)[0], gY, prek);
    if (temelj) xs.forEach(x => { V.rect(x - 200, -dub, x + 200, 0, { w: DEB.t }); V.beton(x - 200, -dub, x + 200, 0); });
    else { V.rect(-500, -200, R.L + 500, 0, { w: DEB.t }); V.beton(-500, -200, R.L + 500, 0); }
    xs.forEach((x, i) => {
      V.rect(x - 100, 0, x + 100, 10, { w: DEB.t });
      V.rect(x - b / 2, 10, x + b / 2, Hz - b - 8, { w: DEB.s });
      const kw = nast.includes(i) ? b + 16 : b + 16; V.rect(x - kw / 2, Hz - b - 8, x + kw / 2, Hz - b, { w: DEB.t });
      V.line(x, -dub - 150, x, Hz + 150, { w: DEB.vt, d: OSA });
    });
  } else {
    // zid u pogledu spreda
    const zT = R.G ? (R.G.or === 'vrh' ? R.G.Hw : Math.max(Hz, R.G.top) + 350) : Hz + 350;
    V.rect(-600, 0, R.L + 600, zT, { w: DEB.t, c: '#777' });
    V.text(-450, 250, 'ZID', { h: 2.4, c: '#777' });
    teren(L, V.P(-800, 0)[0], V.P(R.L + 800, 0)[0], gY);
    xs.forEach(x => {
      if (R.T.cel === 'konzole') { V.rect(x - 100, Hz - 1.5 * b - 100, x + 100, Hz - 1.5 * b + 100, { w: DEB.t }); V.rect(x - b / 2, Hz - 2 * b, x + b / 2, Hz - b, { w: DEB.s }); }
      else { const G = R.G;
        V.rect(x - 100, G.plate[1], x + 100, G.plate[3], { w: DEB.t, f: G.or === 'vrh' ? '#e6e6e6' : undefined });
        V.rect(x - G.bL / 2, G.ver[1], x + G.bL / 2, G.ver[3], { w: DEB.s });
        V.rect(x - G.bL / 2, G.hor[1], x + G.bL / 2, G.hor[3], { w: DEB.s });
        V.rect(x - (G.bL + 16) / 2, G.kapY[0], x + (G.bL + 16) / 2, G.kapY[1], { w: DEB.t }); }
      V.line(x, (R.G ? R.G.bot : Hz - b - 250) - 150, x, Math.max(Hz, R.G ? R.G.top : 0) + 150, { w: DEB.vt, d: OSA });
    });
  }
  // greda sa nastavcima
  V.rect(0, Hz - b, R.L, Hz, { w: DEB.s });
  nast.forEach(i => { V.line(xa[i], Hz - b, xa[i], Hz, { w: DEB.s }); });
  xs.forEach((x, i) => { const w = nast.includes(i) ? 2 * b : b; V.rect(x - w / 2, Hz - b + 4, x + w / 2, Hz - 4, { w: DEB.vt }); });
  // kote
  const yk = ex ? -dub : 0;
  V.lanac('x', xs, yk, 0, -1, 9);
  V.kota(0, yk, R.L, yk, 0, -1, 16);
  V.kota(-300, 0, -300, Hz, -1, 0, 9);
  if (ex) { V.kota(-300, 0, -300, Hz - b, -1, 0, 4); if (temelj) V.kota(-300, -dub, -300, 0, -1, 0, 4); }
  else if (R.G) V.kota(-300, 0, -300, R.G.or === 'vrh' ? R.G.Hw : (R.G.plate[1] + R.G.plate[3]) / 2, -1, 0, 4);
  else V.kota(-300, 0, -300, Hz - b - b, -1, 0, 4);
  const pr = V.P(R.L, 0)[0] + 6;
  nivo(L, pr, V.P(0, Hz)[1], br(Hz)); nivo(L, pr, gY, '±0,00'); if (temelj) nivo(L, pr, V.P(0, -dub)[1], br(-dub));
  // pozicije
  if (ex) { const p = V.P(xs[1], Hz * 0.55); poz(L, p[0], p[1], p[0] + 8, p[1] - 4, pz('stub')); }
  else if (R.G) { const p = V.P(xs[1], (R.G.ver[1] + R.G.ver[3]) / 2); poz(L, p[0] + 1, p[1], p[0] + 10, p[1] + 6, pz('lver')); }
  else { const p = V.P(xs[1], Hz - 1.5 * b); poz(L, p[0], p[1], p[0] + 9, p[1] + 8, pz('konzola')); }
  { const mx = xs[0] + (xs[1] - xs[0]) * 0.3, p = V.P(mx, Hz); poz(L, p[0], p[1], p[0] + 4, p[1] - 9, pz('greda')); }
  // oznaka preseka
  { const xA = xs[0] + (xs[1] - xs[0]) * 0.62, a = V.P(xA, Hz + 450), c = V.P(xA, ex ? -dub - 100 : 300);
    presekOzn(L, a[0], a[1], 'A', [-1, 0]); presekOzn(L, c[0], c[1], 'A', [-1, 0]); }

  /* ── OSNOVA ── */
  const oT = gY + (ex ? dub : 0) / s1 + 26;                 // naslov osnove — ispod kota izgleda
  naslov(L, 30, oT, 'OSNOVA', `R 1:${s1}`);
  const O = new Pogled(L, ox, oT + 6 + (ex ? (temelj ? 200 : 100) : 260) / s1, s1, 'osnova');
  const oKraj = O.P(0, ex ? (temelj ? 200 : 100) : R.vOut)[1] + 19;   // donja ivica osnove (sa oznakama osa)
  if (!ex) { O.rect(-600, -260, R.L + 600, 0, { w: DEB.t }); O.srafura(-600, -260, R.L + 600, 0, 1.1, 45, { c: '#777' }); }
  const v0 = ex ? 0 : R.vS;
  O.line(-500, v0, R.L + 500, v0, { w: DEB.vt, d: OSA });
  O.rect(0, v0 - b / 2, R.L, v0 + b / 2, { w: DEB.s });
  xs.forEach((x, i) => {
    if (ex) { if (temelj) O.rect(x - 200, -200, x + 200, 200, { w: DEB.t, d: SKR }); O.rect(x - 100, -100, x + 100, 100, { w: DEB.t }); O.rect(x - b / 2, -b / 2, x + b / 2, b / 2, { f: '#000', w: DEB.t }); }
    else if (R.T.cel === 'konzole') { O.rect(x - 100, 0, x + 100, 10, { f: '#000' }); O.rect(x - b / 2, 10, x + b / 2, R.isp - b, { w: DEB.s }); }
    else { const G = R.G;
      if (G.or === 'vrh') O.rect(x - 100, -230, x + 100, -30, { w: DEB.t, d: SKR }); else O.rect(x - 100, 0, x + 100, 10, { f: '#000' });
      O.rect(x - G.bL / 2, G.hor[0], x + G.bL / 2, G.hor[2], { w: DEB.s }); O.rect(x - G.bL / 2, G.ver[0], x + G.bL / 2, G.ver[2], { w: DEB.k }); }
    const vk = (ex ? (temelj ? 200 : 100) : R.vOut);
    O.line(x, -350, x, vk, { w: DEB.vt, d: OSA });
    const c = O.P(x, vk); L.line(c[0], c[1], c[0], c[1] + 9, { w: DEB.vt, d: OSA }); osaOznaka(L, c[0], c[1] + 12.4, String(i + 1));
  });
  O.lanac('x', xs, ex ? (temelj ? 200 : 100) : R.vOut, 0, 1, 6);
  if (ex && temelj) O.kota(-250, -200, -250, 200, -1, 0, 3);
  if (!ex) O.kota(-250, R.vIn, -250, R.vOut, -1, 0, 3);

  /* ── PRESEK A–A ── */
  const sx = 276;
  naslov(L, sx, 19, 'PRESEK A–A', `R 1:${s1}`);
  const A = new Pogled(L, sx + 22 + (ex ? 0 : 300 / s1), gY, s1, 'izgled');
  if (ex) {
    teren(L, A.P(-500, 0)[0], A.P(500, 0)[0], gY, temelj ? [[A.P(-200, 0)[0], A.P(200, 0)[0]]] : []);
    if (temelj) { A.rect(-200, -dub, 200, 0, { w: DEB.t }); A.beton(-200, -dub, 200, 0); } else { A.rect(-500, -200, 500, 0, { w: DEB.t }); A.beton(-500, -200, 500, 0); }
    A.rect(-100, 0, 100, 10, { w: DEB.t }); A.rect(-b / 2, 10, b / 2, Hz - b - 8, { w: DEB.s });
    A.rect(-(b + 16) / 2, Hz - b - 8, (b + 16) / 2, Hz - b, { w: DEB.t });
    A.rect(-b / 2, Hz - b, b / 2, Hz, { w: DEB.s }); A.rect(-b / 2 - 8, Hz - b, -b / 2, Hz, { w: DEB.t }); A.rect(b / 2, Hz - b, b / 2 + 8, Hz, { w: DEB.t });
    A.line(0, -dub - 150, 0, Hz + 200, { w: DEB.vt, d: OSA });
    A.kota(-250, 0, -250, Hz, -1, 0, 6);
    if (temelj) A.kota(-200, -dub, 200, -dub, 0, -1, 5);
    let p = A.P(0, Hz); poz(L, p[0] + .5, p[1] + .5, p[0] + 11, p[1] - 2, pz('greda'));
    p = A.P(b / 2 + 4, Hz - b / 2); poz(L, p[0], p[1], p[0] + 11, p[1] + 7, pz('bocna') || pz('bocnaS'));
    p = A.P(0, Hz * 0.5); poz(L, p[0], p[1], p[0] + 9, p[1], pz('stub'));
  } else {
    const G = R.G, zT = G ? (G.or === 'vrh' ? G.Hw : Math.max(Hz, G.top) + 350) : Hz + 350;
    teren(L, A.P(-700, 0)[0], A.P(R.vOut + 800, 0)[0], gY);
    A.rect(-260, 0, 0, zT, { w: DEB.t }); A.srafura(-260, 0, 0, zT, 1.1, 45, { c: '#777' });
    crtajNosac(A, R, P, true);
    const yTop = G ? Math.max(G.top, Hz) : Hz;
    A.kota(R.vIn, yTop + 250, R.vOut, yTop + 250, 0, 1, 2, String(G ? G.a : R.isp));
    A.kota(R.vOut + 300, 0, R.vOut + 300, Hz, 1, 0, 3);
    if (G && G.or === 'vrh') nivo(L, A.P(-260, 0)[0] - 2, A.P(0, G.Hw)[1], br(G.Hw), { levo: true });
    let p = A.P(R.vS, Hz); poz(L, p[0], p[1], p[0] + 8, p[1] - 9, pz('greda'));
    if (G) { p = A.P((G.ver[0] + G.ver[2]) / 2, (G.ver[1] + G.ver[3]) / 2); poz(L, p[0], p[1], p[0] + 9, p[1] + 3, pz('lver'));
      p = A.P((G.hor[0] + G.hor[2]) / 2, (G.hor[1] + G.hor[3]) / 2); poz(L, p[0], p[1], p[0] - 2, p[1] + 13, pz('lhor')); }
    else { p = A.P(R.isp * 0.45, Hz - 1.5 * b); poz(L, p[0], p[1], p[0] + 2, p[1] + 14, pz('konzola')); }
  }

  /* ── DETALJ 2: sedlo grede ── */
  const dx0 = 352, dy0 = 19, sp = nast.length > 0;
  naslov(L, dx0 - 14, dy0, sp ? 'DETALJ 2 – NASTAVAK' : 'DETALJ 2 – SEDLO', 'R 1:10');
  const Dd = new Pogled(L, dx0 + 12, dy0 + 34, 10, 'izgled');
  const hw = sp ? b : b / 2;
  Dd.rect(-280, 0, 280, b, { w: DEB.s });
  const l1 = Dd.P(-280, 0), l2 = Dd.P(-280, b); lom(L, l1[0], l1[1] + 2, l2[0], l2[1] - 2);
  const r1_ = Dd.P(280, 0), r2 = Dd.P(280, b); lom(L, r1_[0], r1_[1] + 2, r2[0], r2[1] - 2);
  if (sp) Dd.line(0, 0, 0, b, { w: DEB.s });
  Dd.rect(-hw, 0, hw, b, { w: DEB.t });
  Dd.rect(-(sp ? b : (b + 16) / 2), -8, sp ? b : (b + 16) / 2, 0, { w: DEB.t, f: '#ddd' });
  Dd.rect(-b / 2, -260, b / 2, -8, { w: DEB.s });
  const pb1 = Dd.P(-b / 2, -260), pb2 = Dd.P(b / 2, -260); lom(L, pb1[0] - 1.5, pb1[1], pb2[0] + 1.5, pb2[1]);
  Dd.line(0, -300, 0, b + 40, { w: DEB.vt, d: OSA });
  const rupe = sp ? [-b * 0.5, b * 0.5] : [-b * 0.2, b * 0.2];
  rupe.forEach(x => { Dd.circle(x, b / 2, 7, { w: DEB.t }); Dd.line(x - 9, b / 2, x + 9, b / 2, { w: DEB.vt }); Dd.line(x, b / 2 - 9, x, b / 2 + 9, { w: DEB.vt }); });
  Dd.kota(-b / 2, -260, b / 2, -260, 0, -1, 4, String(b));
  Dd.kota(-hw, b, hw, b, 0, 1, 4, String(2 * hw));
  Dd.kota(280, 0, 280, b, 1, 0, 3, String(b));
  { let p = Dd.P(-200, b * 0.75); poz(L, p[0], p[1], p[0] - 3, p[1] - 9, pz('greda'));
    p = Dd.P(-hw + 10, b * 0.25); poz(L, p[0], p[1], p[0] - 12, p[1] + 13, pz(sp ? 'bocnaS' : 'bocna'));
    if (ex || R.G) { p = Dd.P(-(sp ? b : (b + 16) / 2) + 6, -4); poz(L, p[0], p[1], p[0] - 4, p[1] + 16, pz(sp ? 'kapnaS' : 'kapna')); }
    p = Dd.P(rupe[1], b / 2); poz(L, p[0], p[1], p[0] + 13, p[1] + 10, pz('vijak'));
    if (ex || R.G) { p = Dd.P(0, -150); poz(L, p[0], p[1], p[0] + 12, p[1] + 4, pz(ex ? 'stub' : 'lver')); } }

  /* ── DETALJ 1 / DETALJ KONZOLE ── */
  let sDet = 10;
  const fdD = ex ? (temelj ? Math.min(dub, 600, Math.max(250, (272 - oKraj - 44) * 10)) : 200) : 0, g1 = 272 - fdD / 10, by = ex ? Math.max(oKraj + 8, g1 - 40) : Math.max(oKraj + 8, 196);
  if (ex) {
    naslov(L, 30, by - 4, 'DETALJ 1 – STOPA STUBA', 'R 1:10');
    const S1 = new Pogled(L, 75, g1, 10, 'izgled');
    teren(L, S1.P(-380, 0)[0], S1.P(380, 0)[0], S1.P(0, 0)[1], temelj ? [[S1.P(-200, 0)[0], S1.P(200, 0)[0]]] : []);
    const fd = fdD, sir = temelj ? 200 : 350;
    S1.rect(-sir, -fd, sir, 0, { w: DEB.t }); S1.beton(-sir, -fd, sir, 0);
    if (temelj && dub > fd) { const a = S1.P(-sir, -fd), c = S1.P(sir, -fd); lom(L, a[0] - 1.5, a[1], c[0] + 1.5, c[1]); }
    S1.rect(-100, 0, 100, 10, { w: DEB.s, f: '#e6e6e6' });
    S1.rect(-b / 2, 10, b / 2, 300, { w: DEB.s });
    const t1 = S1.P(-b / 2, 300), t2 = S1.P(b / 2, 300); lom(L, t1[0] - 1.5, t1[1], t2[0] + 1.5, t2[1]);
    S1.poly([[-b / 2, 10], [-b / 2, 90], [-b / 2 - 50, 10]], { w: DEB.t }); S1.poly([[b / 2, 10], [b / 2, 90], [b / 2 + 50, 10]], { w: DEB.t });
    [-70, 70].forEach(x => { S1.line(x, -160, x, 26, { w: DEB.t, d: SKR }); S1.rect(x - 11, 10, x + 11, 22, { w: DEB.t, f: '#fff' }); });
    S1.line(0, -fd - 50, 0, 340, { w: DEB.vt, d: OSA });
    if (temelj) { S1.kota(-sir, -fd, sir, -fd, 0, -1, 5, '400'); const a = S1.P(-sir, 0), c = S1.P(-sir, -fd); kotaL(L, a, c, [-1, 0], 5, String(dub)); }
    else { S1.kota(-sir, -fd, sir, -fd, 0, -1, 5, 'postojeća AB ploča, min. 150'); }
    S1.kota(70, -160, 70, 0, 1, 0, 14, '160');
    let p = S1.P(0, 230); poz(L, p[0] - 5, p[1], p[0] - 14, p[1] - 4, pz('stub'));
    p = S1.P(-90, 5); poz(L, p[0], p[1], p[0] - 13, p[1] - 6, pz('ploca'));
    p = S1.P(b / 2 + 15, 40); poz(L, p[0], p[1], p[0] + 13, p[1] - 12, pz('rebro'));
    p = S1.P(81, 16); poz(L, p[0], p[1], p[0] + 15, p[1] - 3, pz('navrtka'));
    p = S1.P(70, -110); poz(L, p[0], p[1], p[0] + 16, p[1] + 10, pz('anker'));
    // osnova stope
    naslov(L, 126, by - 4, 'STOPA – OSNOVA', 'R 1:5');
    const S2 = new Pogled(L, 165, by + 36, 5, 'osnova');
    S2.rect(-100, -100, 100, 100, { w: DEB.s });
    S2.rect(-b / 2, -b / 2, b / 2, b / 2, { w: DEB.k }); S2.rect(-b / 2 + R.t, -b / 2 + R.t, b / 2 - R.t, b / 2 - R.t, { w: DEB.t });
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => { if (dx) S2.rect(dx * b / 2, -4, dx * (b / 2 + 50), 4, { w: DEB.t }); else S2.rect(-4, dy * b / 2, 4, dy * (b / 2 + 50), { w: DEB.t }); });
    [[-70, -70], [70, -70], [-70, 70], [70, 70]].forEach(([x, y]) => S2.circle(x, y, 7, { w: DEB.t }));
    S2.line(-120, 0, 120, 0, { w: DEB.vt, d: OSA }); S2.line(0, -120, 0, 120, { w: DEB.vt, d: OSA });
    S2.kota(-100, 100, 100, 100, 0, 1, 10, '200'); S2.kota(-70, 100, 70, 100, 0, 1, 5, '140');
    S2.kota(-100, -100, -100, 100, -1, 0, 10, '200'); S2.kota(-100, -70, -100, 70, -1, 0, 5, '140');
    const q = S2.P(70, -70); L.text(q[0] + 4, q[1] - 3, '4×Ø14', { h: 2.2 });
  } else if (R.G) {
    const G = lGeom(P, b, 0), Rl = Object.assign({}, R, { Hz: 0 });
    const minY = Math.min(G.bot, -b) - 220, maxY = Math.max(G.top, 0) + 160, minV = -300, maxV = G.vOut + 260;
    const hAv = 272 - by - 12;
    sDet = [10, 20, 25].find(s => (maxV - minV) / s <= 104 && (maxY - minY) / s <= hAv) || 25;
    naslov(L, 30, by - 4, 'DETALJ 1 – L-STOPA', `R 1:${sDet}`);
    const K = new Pogled(L, 34 + (-minV) / sDet, by + 6 + maxY / sDet, sDet, 'izgled');
    const zt = G.or === 'vrh' ? G.Hw : maxY - 60, zb = minY + 70;
    K.rect(-260, zb, 0, zt, { w: DEB.t }); K.srafura(-260, zb, 0, zt, 1.6, 45, { c: '#777' });
    { const a = K.P(-260, zb), c = K.P(0, zb); lom(L, a[0], a[1], c[0], c[1]); }
    if (G.or !== 'vrh') { const a = K.P(-260, zt), c = K.P(0, zt); lom(L, a[0], a[1], c[0], c[1]); }
    crtajNosac(K, Rl, P, false);
    K.kota(G.vIn, G.top, G.hor[2], G.top, 0, 1, 6, String(G.a));
    K.kota(G.vOut, Math.min(G.ver[1], G.hor[1]), G.vOut, Math.max(G.ver[3], G.hor[3]), 1, 0, 6, String(G.h));
    { const q = K.P((G.hor[0] + G.hor[2]) / 2, G.hor[1]); L.text(q[0], q[1] + 3.2, 'SHS ' + P.cevL, { h: 2, a: 'c' }); }
    let p = K.P(G.vS, -b / 2); poz(L, p[0], p[1], p[0] + 12, p[1] - 4, pz('greda'));
    p = K.P((G.ver[0] + G.ver[2]) / 2, (G.ver[1] + G.ver[3]) / 2); poz(L, p[0], p[1], p[0] + 13, p[1] + 2, pz('lver'));
    p = K.P(G.hor[0] + (G.hor[2] - G.hor[0]) * 0.35, (G.hor[1] + G.hor[3]) / 2); poz(L, p[0], p[1], p[0] + 2, p[1] + (G.or === 'gore' ? 12 : -12), pz('lhor'));
    p = K.P((G.plate[0] + G.plate[2]) / 2, G.plate[1] + 15); poz(L, p[0], p[1], p[0] - 12, p[1] + 9, pz('ploca'));
    { const g = G.gus[0], c = [(g[0][0] + g[1][0] + g[2][0]) / 3, (g[0][1] + g[1][1] + g[2][1]) / 3]; p = K.P(c[0], c[1]); poz(L, p[0], p[1], p[0] - 11, p[1] - 6, pz('rebro')); }
    { const an = G.anker[0]; p = an[0] === 'h' ? K.P(-90, an[1]) : K.P(an[1], G.plate[1] - 90); poz(L, p[0], p[1], p[0] - 9, p[1] + (an[0] === 'h' ? -10 : 10), pz('anker')); }
    // zidna ploča — pogled
    naslov(L, 140, by - 4, R.G && R.G.or === 'vrh' ? 'PLOČA NA ZIDU' : 'ZIDNA PLOČA', 'R 1:5');
    const S2 = new Pogled(L, 180, by + 36, 5, 'osnova'), hh = 100, bt = R.G ? R.G.bL : b, tt = R.G ? R.G.tL : R.t;
    S2.rect(-100, -hh, 100, hh, { w: DEB.s });
    S2.rect(-bt / 2, -bt / 2, bt / 2, bt / 2, { w: DEB.k }); S2.rect(-bt / 2 + tt, -bt / 2 + tt, bt / 2 - tt, bt / 2 - tt, { w: DEB.t });
    const hy = [-70, 70];
    [-70, 70].forEach(x => hy.forEach(y => S2.circle(x, y, 7, { w: DEB.t })));
    S2.kota(-100, hh, 100, hh, 0, 1, 10, '200'); S2.kota(-70, hh, 70, hh, 0, 1, 5, '140');
    S2.kota(-100, -hh, -100, hh, -1, 0, 10, String(2 * hh)); S2.kota(-100, hy[0], -100, hy[1], -1, 0, 5, String(hy[1] - hy[0]));
    const q = S2.P(70, hy[0]); L.text(q[0] + 4, q[1] - 3, '4×Ø14', { h: 2.2 });
  }
  L.text(30, 283.5, `Zaštita: ${P.zastita} · Zavari ${P.zavar} · Mere u mm` + (R.T.cel !== 'stubovi' ? ' · Ankeri u zid: beton ili puna opeka (za šuplju opeku — anker sa mrežicom)' : ''), { h: 2.1 });

  zaglavlje(L, P, {
    naziv: R.T.cel === 'stubovi' ? (P.tip === 'dvovodna' ? 'ČELIČNA CENTRALNA KONSTRUKCIJA' : 'ČELIČNA NOSEĆA KONSTRUKCIJA') : R.T.cel === 'konzole' ? 'ČELIČNI ZIDNI NOSAČI – KONZOLE' : 'ČELIČNI ZIDNI NOSAČI – L-STOPE',
    podnaziv: R.T.cel === 'stubovi' ? 'Stubovi, greda, stope' : 'Nosači, greda, ankerovanje',
    objekat: objekat(P, R), datum: meta.datum, razmera: [...new Set([s1, sDet, 10, 5])].map(s => '1:' + s).join(', '), masa: `≈ ${Math.round(masa)} kg`,
    broj: broj(P, 1), list: `1/${meta.n}`, rev: P.rev || 'A'
  });
  return { L, rows, masa };
}

/* nosač uz zid u preseku (konzola ili L-stopa); y vrha grede = R.Hz */
function crtajNosac(A, R, P, pun, bezRoga) {
  const { b, isp, Hz } = R, vS = R.vS;
  if (R.T.cel === 'konzole') {
    const yc = Hz - 1.5 * b;
    A.rect(0, yc - 100, 10, yc + 100, { w: DEB.s, f: '#e6e6e6' });
    A.rect(10, Hz - 2 * b, isp, Hz - b, { w: DEB.s });
    A.poly([[10, Hz - 2 * b], [10, Hz - 2 * b - 150], [160, Hz - 2 * b]], { w: DEB.t });
    [yc - 70, yc + 70].forEach(y => A.line(-160, y, 22, y, { w: DEB.t, d: SKR }));
  } else {
    const G = lGeom(P, b, Hz);
    A.rect(G.plate[0], G.plate[1], G.plate[2], G.plate[3], { w: DEB.s, f: '#e6e6e6' });
    A.rect(G.hor[0], G.hor[1], G.hor[2], G.hor[3], { w: DEB.s });
    A.rect(G.ver[0], G.ver[1], G.ver[2], G.ver[3], { w: DEB.s });
    G.gus.forEach(g => A.poly(g, { w: DEB.t }));
    A.rect(vS - (G.bL + 16) / 2, G.kapY[0], vS + (G.bL + 16) / 2, G.kapY[1], { w: DEB.t, f: '#e6e6e6' });
    G.anker.forEach(([o, c]) => o === 'h' ? A.line(-160, c, 22, c, { w: DEB.t, d: SKR }) : A.line(c, G.plate[1] - 160, c, G.plate[3] + 12, { w: DEB.t, d: SKR }));
  }
  A.rect(vS - b / 2, Hz - b, vS + b / 2, Hz, { w: DEB.s });
  A.rect(vS - b / 2 + R.t, Hz - b + R.t, vS + b / 2 - R.t, Hz - R.t, { w: DEB.vt });
  A.rect(vS - b / 2 - 8, Hz - b, vS - b / 2, Hz, { w: DEB.t }); A.rect(vS + b / 2, Hz - b, vS + b / 2 + 8, Hz, { w: DEB.t });
  // početak roga
  const nag = (R.nag || 10) / 100, x1 = vS + b / 2 + 8;                // pad roga — ka napred, naniže
  const x2 = x1 + (pun ? 700 : 220);
  if (!bezRoga) A.poly([[x1, Hz], [x2, Hz - (x2 - x1) * nag], [x2, Hz - (x2 - x1) * nag - 150], [x1, Hz - 150]], { w: DEB.t, d: SKR });
}

/* ═══════════════ LIST 02 — SKLOP PERGOLA ═══════════════ */
export function list02(P, R, meta) {
  const L = new List(); okvir(L);
  const rows = sastavnicaAlu(P, R), pz = k => (rows.find(r => r.k === k) || {}).poz || '';
  const top = tabela(L, rows, [
    { t: 'Poz', w: 10, f: r => r.poz }, { t: 'Naziv', w: 58, a: 'l', f: r => r.naziv }, { t: 'Profil', w: 22, f: r => r.dim },
    { t: 'L [mm]', w: 18, f: r => r.L }, { t: 'Kom', w: 14, f: r => r.kom }, { t: 'Materijal', w: 40, f: r => r.mat }, { t: 'Masa [kg]', w: 28, f: r => r.kg ? fkg(r.kg) : '—' }]);
  const masa = rows.reduce((s, r) => s + r.kg, 0);
  const { b, xa, xf, nB, D, prol, bh, Hz, Hf, strana, vb, vS, mod } = R, dv = strana === 2, zid = P.tip.startsWith('zid');
  const vMin = dv ? -D : (zid ? -260 : 0), vMax = D;

  /* ── OSNOVA (velika, levo) ── */
  const dub = vMax - vMin;
  const sN = razmera(R.L + 1800, dub + 1800, 182, 252, [50, 75, 100, 125, 150, 200, 250]);
  const sR = razmera(dub + 1800, R.L + 1800, 182, 252, [50, 75, 100, 125, 150, 200, 250]);
  const rot = sR < sN || (sR === sN && R.L > dub);
  const sO = rot ? sR : sN;
  naslov(L, 30, 19, 'OSNOVA', `R 1:${sO}`);
  let O;
  if (rot) O = new Pogled(L, 44 - vMin / sO + 8, 44, sO, 'osnovaR');
  else O = new Pogled(L, 42, 32 - vMin / sO + 8, sO, 'osnova');
  const strane = dv ? [-1, 1] : [1];
  // zid
  if (zid) { O.rect(-400, -260, R.L + 400, 0, { w: DEB.t }); O.srafura(-400, -260, R.L + 400, 0, 1.1, 45, { c: '#777' }); }
  // polja (platno)
  strane.forEach(sg => {
    for (let j = 0; j < nB; j++) {
      const v0 = sg * vb, v1 = sg * (D - 150);
      O.srafura(xa[j] + 45, Math.min(v0, v1), xa[j + 1] - 45, Math.max(v0, v1), 2.6, 135, { c: '#bdbdbd', w: 0.1 });
    }
  });
  // zadnji oslonac
  if (R.T.cel === 'stubovi') { O.rect(0, vS - b / 2, R.L, vS + b / 2, { w: DEB.s }); R.xs.forEach(x => O.rect(x - b / 2, vS - b / 2, x + b / 2, vS + b / 2, { f: '#000' })); }
  else if (R.T.cel) { O.rect(0, vS - b / 2, R.L, vS + b / 2, { w: DEB.s }); R.xs.forEach(x => O.rect(x - b / 2, 0, x + b / 2, vS - b / 2, { w: DEB.t })); }
  else O.rect(0, 0, R.L, 40, { w: DEB.s });
  // rogovi, greda, stubovi
  strane.forEach(sg => {
    xa.forEach((x, i) => { const x0 = i === 0 ? 0 : i === nB ? R.L - 90 : x - 45; O.rect(x0, sg * vb, x0 + 90, sg * (D - 150), { w: DEB.t }); });
    mod.forEach(m => O.rect(xa[m[0]], sg * (D - 150), xa[m[1]], sg * D, { w: DEB.s }));
    xf.forEach(x => O.rect(x - 50, sg * (D - 150), x + 50, sg * D, { f: '#000' }));
  });
  // oznake pergola i pad
  let pn = 0;
  mod.forEach(m => strane.forEach(sg => {
    pn++; const u0 = xa[m[0]], u1 = xa[m[1]], vm = sg * (vb + (D - 150 - vb) * 0.5);
    const c = O.P(u0 + (u1 - u0) * 0.3, vm);
    const tw = sirina('P' + pn, 3, true) + 4; L.rect(c[0] - tw / 2, c[1] - 2.6, tw, 5.2, { w: DEB.s, f: '#fff' }); L.text(c[0], c[1], 'P' + pn, { h: 3, b: true, a: 'c', v: 'm' });
    const a1 = O.P(u0 + (u1 - u0) * 0.7, sg * (vb + (D - 150 - vb) * 0.2)), a2 = O.P(u0 + (u1 - u0) * 0.7, sg * (vb + (D - 150 - vb) * 0.8));
    L.line(a1[0], a1[1], a2[0], a2[1], { w: DEB.t });
    const dx = a2[0] - a1[0], dy = a2[1] - a1[1], dd = Math.hypot(dx, dy), ux = dx / dd, uy = dy / dd;
    L.poly([[a2[0], a2[1]], [a2[0] - ux * 3 - uy * 1.1, a2[1] - uy * 3 + ux * 1.1], [a2[0] - ux * 3 + uy * 1.1, a2[1] - uy * 3 - ux * 1.1]], { f: '#000', w: DEB.vt });
    const tm = [(a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2], r = Math.abs(dx) > Math.abs(dy) ? 0 : 90;
    L.text(tm[0] + (r ? -1.6 : 0), tm[1] - (r ? 0 : 1.6), `i = ${R.nag.toFixed(1).replace('.', ',')} %`, { h: 2.2, a: 'c', r });
  }));
  // ose
  const oz = dv ? [[-D + 75, 'A'], [0, 'B'], [D - 75, 'C']] : [[vS, 'A'], [D - 75, 'B']];
  xa.forEach((x, i) => { O.line(x, vMin - 450, x, vMax + 200, { w: DEB.vt, d: OSA }); const c = O.P(x, vMin - 450); rot ? osaOznaka(L, c[0] - 3.4, c[1], String(i + 1)) : osaOznaka(L, c[0], c[1] - 3.4, String(i + 1)); });
  oz.forEach(([v, s]) => { O.line(-450, v, R.L + 200, v, { w: DEB.vt, d: OSA }); const c = O.P(R.L + 200, v); rot ? osaOznaka(L, c[0], c[1] + 3.4, s) : osaOznaka(L, c[0] + 3.4, c[1], s); });
  // kote
  const vk = vMax;
  O.lanac('x', xa, vk, 0, 1, 7); O.kota(0, vk, R.L, vk, 0, 1, 14);
  const vv = dv ? [-D, 0, D] : [zid ? 0 : 0, D];
  O.lanac('y', vv, 0, -1, 0, 7 + 0); if (dv) O.kota(0, -D, 0, D, -1, 0, 14);
  // presek A–A oznaka
  { const xA = nB > 1 ? (xa[1] + xa[2]) / 2 : (xa[0] + xa[1]) / 2;
    const c1 = O.P(xA, vMin - 250), c2 = (() => { const q = O.P(xA, vMax), n = O.V(0, 1); return [q[0] + n[0] * 22, q[1] + n[1] * 22]; })(), sm = rot ? [0, -1] : [-1, 0];
    presekOzn(L, c1[0], c1[1], 'A', sm); presekOzn(L, c2[0], c2[1], 'A', sm); }

  /* ── PRESEK A–A (gore desno) ── */
  const pw = 405 - 236, sP = razmera(dub + 1300, Hz + 900, pw, 70, [50, 75, 100, 125, 150, 200]);
  naslov(L, 228, 19, 'PRESEK A–A', `R 1:${sP}`);
  const pgY = 28 + (Hz + 350) / sP;
  const A = new Pogled(L, 236 + (-vMin + 300) / sP, pgY, sP, 'izgled');
  teren(L, A.P(vMin - 300, 0)[0], A.P(vMax + 500, 0)[0], pgY);
  if (zid) { const zT = R.G ? (R.G.or === 'vrh' ? R.G.Hw : Math.max(Hz, R.G.top) + 300) : Hz + 500; A.rect(-260, 0, 0, zT, { w: DEB.t }); A.srafura(-260, 0, 0, zT, 1.1, 45, { c: '#777' }); }
  if (R.T.cel === 'stubovi') { A.rect(vS - b / 2, 0, vS + b / 2, Hz - b, { w: DEB.s }); A.rect(vS - b / 2, Hz - b, vS + b / 2, Hz, { w: DEB.s, f: '#ddd' }); }
  else if (R.T.cel) crtajNosac(A, R, P, false, true);
  else A.rect(0, Hz - 80, 40, Hz, { w: DEB.s, f: '#ddd' });
  const rogP = sg => { const v0 = sg * vb, v1 = sg * (D - 150); A.poly([[v0, Hz], [v1, Hf + 10], [v1, Hf - 140], [v0, Hz - 150]], { w: DEB.s }); A.line(v0, Hz + 18, v1, Hf + 28, { w: DEB.t }); };
  strane.forEach(sg => {
    rogP(sg);
    A.rect(sg * (D - 150), prol, sg * D, Hf, { w: DEB.s });
    A.rect(sg * (D - 150) + sg * 25, 0, sg * D - sg * 25, prol, { w: DEB.s });
  });
  if (dv) A.poly([[-140, Hz + 20], [0, Hz + 45], [140, Hz + 20]], { open: true, w: DEB.s });
  // kote i nivoi
  A.lanac('x', dv ? [-D, 0, D] : [0, D], 0, 0, -1, 7);
  if (dv) A.kota(-D, 0, D, 0, 0, -1, 13);
  const vL = dv ? -D : 0;
  A.kota(vL, 0, vL, prol, -1, 0, 5); A.kota(vL, prol, vL, Hf, -1, 0, 5); A.kota(vL, 0, vL, Hf, -1, 0, 11);
  { const pR = A.P(vMax, 0)[0] + 4; nivo(L, pR, A.P(0, Hf)[1], br(Hf)); nivo(L, pR, pgY, '±0,00');
    const pt = A.P(vS, Hz); if (dv) nivo(L, pt[0], pt[1] - 4, br(Hz)); else nivo(L, A.P(vMin, 0)[0] - 2, pt[1], br(Hz), { levo: true }); }
  { const m = A.P(dv ? -D / 2 : D / 2, Hz - (Hz - Hf) / 2 + 250); L.text(m[0], m[1] - 1, `i = ${R.nag.toFixed(1).replace('.', ',')} %`, { h: 2.2, a: 'c' }); }
  { const sL = dv ? -1 : 1;
    let p = A.P(sL * (D - 75), Hf); poz(L, p[0], p[1], p[0] + (dv ? -5 : 6), p[1] - 7, pz('greda'));
    p = A.P(sL * (vb + (D - vb) * 0.35), Hz - (Hz - Hf) * 0.35); poz(L, p[0], p[1], p[0], p[1] + 9, pz('cerada'));
    p = A.P(D * 0.65, Hz - (Hz - Hf) * 0.65 - 75); poz(L, p[0], p[1], p[0] + 3, p[1] - 9, pz('rogS'));
    p = A.P(sL * (D - 75), prol * 0.55); poz(L, p[0], p[1], p[0] + (dv ? 7 : -8), p[1], pz('stub'));
    if (dv) { p = A.P(0, Hz + 40); poz(L, p[0], p[1], p[0] + 7, p[1] - 6, pz('opsivka')); }
    if (R.T.cel) { p = A.P(vS, R.T.cel === 'stubovi' ? Hz * 0.4 : Hz - b / 2); poz(L, p[0], p[1], p[0] + 7, p[1] + 3, pz('celik')); } }

  /* ── BOČNI IZGLED (desno, sredina) ── */
  const yTop = pgY + 18, slobodno = top - 8 - yTop;
  const sB = razmera(R.L + 1500, Hz + 700, pw, Math.max(30, slobodno - 10), [50, 75, 100, 125, 150, 200, 250]);
  naslov(L, 228, yTop, 'BOČNI IZGLED', `R 1:${sB}`);
  const bgY = yTop + 7 + (Hz + 150) / sB;
  const B = new Pogled(L, 236 + 500 / sB, bgY, sB, 'izgled');
  teren(L, B.P(-400, 0)[0], B.P(R.L + 400, 0)[0], bgY);
  xf.forEach(x => B.rect(x - 50, 0, x + 50, prol, { w: DEB.s }));
  mod.forEach(m => B.rect(xa[m[0]], prol, xa[m[1]], Hf, { w: DEB.s }));
  B.rect(0, Hf, R.L, Hz, { w: DEB.t });
  B.line(0, Hz - 50, R.L, Hz - 50, { w: DEB.vt });
  xa.forEach((x, i) => { const x0 = i === 0 ? 0 : i === nB ? R.L - 90 : x - 45; B.rect(x0, Hf, x0 + 90, Hz - 50, { w: DEB.t }); });
  B.lanac('x', xa, 0, 0, -1, 6); B.kota(0, 0, R.L, 0, 0, -1, 12);
  B.kota(0, 0, 0, prol, -1, 0, 5); B.kota(0, prol, 0, Hf, -1, 0, 5); B.kota(0, Hf, 0, Hz, -1, 0, 5); B.kota(0, 0, 0, Hz, -1, 0, 11);
  { const pR = B.P(R.L, 0)[0] + 4; nivo(L, pR, B.P(0, Hz)[1], br(Hz)); nivo(L, pR, B.P(0, Hf)[1], br(Hf)); nivo(L, pR, bgY, '±0,00'); }

  zaglavlje(L, P, {
    naziv: 'SKLOP PERGOLA', podnaziv: 'Osnova, preseci, sastavnica', objekat: objekat(P, R), datum: meta.datum,
    razmera: [...new Set([sO, sP, sB])].map(s => '1:' + s).join(', '), masa: masa ? `≈ ${Math.round(masa)} kg (alu)` : '—',
    broj: broj(P, R.T.cel ? 2 : 1), list: `${meta.n - 1}/${meta.n}`, rev: P.rev || 'A'
  });
  return { L, rows, masa };
}

/* ═══════════════ LIST 03 — RADIONIČKA LISTA ═══════════════ */
/* rezanje šipki: prvo najduži komadi, svaki u prvu šipku gde staje (rez = širina testere) */
export function seci(komadi, sipka, rez) {
  const lista = []; komadi.forEach(k => { for (let i = 0; i < k.kom; i++) lista.push(k.L); });
  lista.sort((a, b) => b - a);
  const sip = [], duzi = [];
  lista.forEach(l => {
    if (l > sipka) { duzi.push(l); return; }
    let s = sip.find(x => x.ost >= l + (x.k.length ? rez : 0));
    if (!s) { s = { k: [], ost: sipka }; sip.push(s); }
    s.ost -= l + (s.k.length ? rez : 0); s.k.push(l);
  });
  const sh = {}; sip.forEach(x => { const key = x.k.join('+'); (sh[key] = sh[key] || { k: x.k, ost: x.ost, n: 0 }).n++; });
  const otpad = sip.reduce((a, x) => a + x.ost, 0);
  return { n: sip.length, sheme: Object.values(sh), otpad, duzi, pct: sip.length ? otpad / (sip.length * sipka) * 100 : 0 };
}
export function radionica(P, R) {
  const cel = R.T.cel ? sastavnicaCelik(P, R) : [], alu = sastavnicaAlu(P, R);
  const rezC = cel.filter(r => /^SHS/.test(r.dim) && typeof r.L === 'number');
  const grupaC = {}; rezC.forEach(r => (grupaC[r.dim] = grupaC[r.dim] || []).push(r));
  const planC = Object.entries(grupaC).map(([dim, rr]) => ({ dim, sipka: +P.sipC || 6000, rr, ...seci(rr, +P.sipC || 6000, +P.rez || 3) }));
  const rezA = alu.filter(r => typeof r.L === 'number' && KATALOG.some(k => k.id === r.dim));
  const grupaA = {}; rezA.forEach(r => (grupaA[r.dim] = grupaA[r.dim] || []).push(r));
  const planA = Object.entries(grupaA).map(([id, rr]) => { const pr = PROF(id); return { dim: id + ' ' + pr.n, sipka: pr.L, kg: pr.kg, rr, ...seci(rr, pr.L, +P.rez || 3) }; });
  const rupe = { ploca: '4×Ø14', bocna: '2×Ø14', bocnaS: '2×Ø14' };
  const ploce = cel.filter(r => /^\d+×\d+×\d+$/.test(r.dim)).map(r => ({ ...r, rupe: rupe[r.k] || '—' }));
  const spoj = cel.filter(r => /tZn/.test(r.mat));
  const nAnk = (cel.find(r => r.k === 'anker') || {}).kom || 0;
  const oprema = alu.filter(r => ['cerada', 'motor', 'opsivka', 'pribor', 'zidni'].includes(r.k));
  return { cel, alu, rezC, planC, rezA, planA, ploce, spoj, nAnk, oprema };
}
export function list03(P, R, meta) {
  const L = new List(); okvir(L);
  const D = radionica(P, R), cols = [{ x: 26, w: 186, y: 19, max: 281 }, { x: 224, w: 181, y: 19, max: 224 }];
  let ci = 0;
  const mesto = h => { let c = cols[ci]; if (c.y + h > c.max && ci < cols.length - 1) { ci++; c = cols[ci]; } const y = c.y; c.y += h + 5; return { x: c.x, y, w: c.w }; };
  const RH = 4.4, TH = 2;
  const naslovB = (m, t, desno) => { const w = L.text(m.x, m.y + 3.2, t, { h: 2.9, b: true }); L.line(m.x, m.y + 4.3, m.x + w + 1, m.y + 4.3, { w: DEB.s }); if (desno) L.text(m.x + m.w, m.y + 3.2, desno, { h: 2, a: 'r' }); };
  /* tabela: kol = [{t, w (deo), a, f}] */
  const tab = (t, kol, rows, desno) => {
    const h = 7 + RH * (rows.length + 1), m = mesto(h); naslovB(m, t, desno);
    const zbir = kol.reduce((a, k) => a + k.w, 0), y0 = m.y + 6.5;
    L.rect(m.x, y0, m.w, RH, { f: '#eef0f3', w: DEB.t });
    let x = m.x; kol.forEach(k => { const w = k.w / zbir * m.w; L.text(k.a === 'l' ? x + 1.2 : x + w / 2, y0 + RH / 2, k.t, { h: TH, b: true, a: k.a === 'l' ? 'l' : 'c', v: 'm' }); k.ww = w; x += w; });
    rows.forEach((r, i) => {
      const y = y0 + RH * (i + 1); L.line(m.x, y + RH, m.x + m.w, y + RH, { w: DEB.vt });
      let xx = m.x; kol.forEach(k => { const v = k.f(r); if (v === '□') L.rect(xx + k.ww / 2 - 1.3, y + RH / 2 - 1.3, 2.6, 2.6, { w: DEB.t }); else if (v !== '' && v != null) L.text(k.a === 'l' ? xx + 1.2 : xx + k.ww / 2, y + RH / 2, v, { h: TH, a: k.a === 'l' ? 'l' : 'c', v: 'm' }); xx += k.ww; });
    });
    L.rect(m.x, y0, m.w, RH * (rows.length + 1), { w: DEB.s });
    let xx = m.x; kol.slice(0, -1).forEach(k => { xx += k.ww; L.line(xx, y0, xx, y0 + RH * (rows.length + 1), { w: DEB.vt }); });
  };
  /* plan sečenja — svaka šema je jedna traka */
  const plan = (t, grupe) => {
    if (!grupe.length) return;
    grupe.forEach((g, gi) => {
      const h = (gi === 0 ? 9 : 4) + g.sheme.length * 6.2 + (g.duzi.length ? 4.5 : 0), m = mesto(h - (gi === 0 ? 0 : 2));
      if (gi === 0) naslovB(m, t); 
      const ys = m.y + (gi === 0 ? 7.5 : 1.5);
      L.text(m.x, ys + 2, g.dim, { h: 2.2, b: true });
      L.text(m.x + m.w, ys + 2, `šipka ${g.sipka} mm × ${g.n} kom · ostatak ${Math.round(g.otpad)} mm (${Math.round(g.pct)} %)`, { h: 2, a: 'r' });
      const bx = m.x + 11, bw = m.w - 11;
      g.sheme.forEach((sh, i) => {
        const y = ys + 4 + i * 6.2;
        L.text(m.x, y + 2.6, sh.n + ' ×', { h: 2.2, b: true });
        let x = bx; const k = bw / g.sipka;
        sh.k.forEach((l, j) => { const w = l * k; L.rect(x, y, w, 4.2, { w: DEB.t, f: '#e9edf2' }); if (sirina(String(l), 1.9) + 1 < w) L.text(x + w / 2, y + 2.1, String(l), { h: 1.9, a: 'c', v: 'm' }); x += w + (+P.rez || 3) * k; });
        if (sh.ost > 1) { const w = bx + bw - x; if (w > 0.3) { L.rect(x, y, w, 4.2, { w: DEB.vt, c: '#999' }); L.srafura(x, y, w, 4.2, 1, 45, { c: '#aaa', w: 0.08 }); if (sirina(String(Math.round(sh.ost)), 1.7) + 1 < w) L.text(x + w / 2, y + 2.1, String(Math.round(sh.ost)), { h: 1.7, a: 'c', v: 'm', c: '#666' }); } }
        L.rect(bx, y, bw, 4.2, { w: DEB.t });
      });
      if (g.duzi.length) L.text(m.x, ys + 4 + g.sheme.length * 6.2 + 2, `Duže od šipke (naručiti u dužini ili nastaviti): ${g.duzi.join(', ')} mm`, { h: 2, c: '#b45309' });
    });
  };
  const fL = r => String(r.L), fK = r => r.kom;
  if (D.rezC.length) tab('1  ČELIK — REZNA LISTA', [{ t: 'Poz', w: 9, f: r => r.poz }, { t: 'Element', w: 52, a: 'l', f: r => r.naziv }, { t: 'Profil', w: 30, f: r => r.dim }, { t: 'Dužina', w: 16, f: fL }, { t: 'Kom', w: 11, f: fK }, { t: 'Rez', w: 11, f: () => '90°' }, { t: 'Ukupno m', w: 17, f: r => zarez((r.L * r.kom / 1000).toFixed(2)) }],
    D.rezC, `crtež ${broj(P, 1)}`);
  plan('2  PLAN SEČENJA — ČELIK', D.planC);
  tab((D.rezC.length ? '3' : '1') + '  ALU — REZNA LISTA', [{ t: 'Poz', w: 9, f: r => r.poz }, { t: 'Element', w: 50, a: 'l', f: r => r.naziv }, { t: 'Šifra', w: 16, f: r => r.dim }, { t: 'Dužina', w: 16, f: fL }, { t: 'Kom', w: 11, f: fK }, { t: 'kg/m', w: 13, f: r => zarez(PROF(r.dim).kg) }, { t: 'Ukupno m', w: 17, f: r => zarez((r.L * r.kom / 1000).toFixed(2)) }],
    D.rezA, `crtež ${broj(P, R.T.cel ? 2 : 1)}`);
  plan((D.rezC.length ? '4' : '2') + '  PLAN SEČENJA — ALU', D.planA);
  let nb = D.rezC.length ? 5 : 3;
  if (D.ploce.length) tab(`${nb++}  PLOČE I REBRA (LIM S235JR)`, [{ t: 'Poz', w: 9, f: r => r.poz }, { t: 'Element', w: 48, a: 'l', f: r => r.naziv }, { t: 'Dimenzija', w: 24, f: r => r.dim }, { t: 'Kom', w: 10, f: fK }, { t: 'Rupe', w: 15, f: r => r.rupe }, { t: '', w: 7, f: () => '□' }], D.ploce);
  const spoj = D.spoj.map(r => ({ poz: r.poz, naziv: r.naziv, dim: r.dim, kom: r.kom, mat: r.mat }));
  if (D.nAnk) spoj.push({ poz: '', naziv: 'Hemijska masa za ankere', dim: `za ${D.nAnk} rupa Ø14×165`, kom: '', mat: '' }, { poz: '', naziv: 'Burgija Ø14 (beton / zid)', dim: 'dužina ≥ 200', kom: 1, mat: '' });
  if (spoj.length) tab(`${nb++}  SPOJNI MATERIJAL`, [{ t: 'Poz', w: 9, f: r => r.poz }, { t: 'Naziv', w: 48, a: 'l', f: r => r.naziv }, { t: 'Dimenzija', w: 30, f: r => r.dim }, { t: 'Kom', w: 10, f: fK }, { t: 'Kvalitet', w: 15, f: r => r.mat }, { t: '', w: 7, f: () => '□' }], spoj);
  const mw = R.mod.map(m => Math.round(R.xa[m[1]] - R.xa[m[0]]));
  const opr = D.oprema.map(r => ({ naziv: r.naziv, dim: r.k === 'cerada' ? [...new Set(mw)].map(w => `≈ ${w} × ${R.rogL}`).join(', ') : r.k === 'opsivka' || r.k === 'zidni' ? `L = ${r.L}` : '', kom: r.kom, mat: r.mat === '—' ? '' : r.mat }));
  tab(`${nb++}  OPREMA PERGOLE`, [{ t: 'Naziv', w: 52, a: 'l', f: r => r.naziv }, { t: 'Dimenzija / napomena', w: 38, f: r => r.dim }, { t: 'Kom', w: 10, f: fK }, { t: 'Materijal', w: 22, f: r => r.mat }, { t: '', w: 7, f: () => '□' }], opr);
  const ns = R.nast.length, zav = P.zavar, zas = P.zastita;
  const chk = [
    'Mere proverene na licu mesta (zid, visine, pad)',
    D.rezC.length ? `Čelik isečen i obeležen po pozicijama (${D.rezC.reduce((a, r) => a + r.kom, 0)} kom)` : null,
    D.ploce.length ? `Ploče isečene i izbušene (${D.ploce.reduce((a, r) => a + r.kom, 0)} kom)` : null,
    R.T.cel ? `Zavareno: ${zav}` : null,
    R.T.cel ? `Zaštita: ${zas}` : null,
    ns ? `Nastavak grede iznad ose ${R.nast.map(i => i + 1).join(', ')} — probno spojeno` : null,
    `Alu profili isečeni (${D.rezA.reduce((a, r) => a + r.kom, 0)} kom), boja RAL proverena`,
    'Cerade, motori i daljinski provereni',
    D.nAnk ? `Ankeri, hemijska masa, burgija Ø14 spakovani (${D.nAnk} kom)` : null,
    'Alat i vezivni materijal za montažu spakovan'
  ].filter(Boolean).map(t => ({ t }));
  tab(`${nb++}  PRE MONTAŽE — PROVERA`, [{ t: '', w: 7, f: () => '□' }, { t: 'Stavka', w: 110, a: 'l', f: r => r.t }, { t: 'Potpis', w: 25, f: () => '' }], chk);

  const mc = D.cel.reduce((a, r) => a + r.kg, 0), ma = D.alu.reduce((a, r) => a + r.kg, 0);
  zaglavlje(L, P, {
    naziv: 'RADIONIČKA LISTA', podnaziv: 'Rezna lista, materijal i priprema za montažu', objekat: objekat(P, R), datum: meta.datum,
    razmera: '—', masa: (mc ? `čelik ≈ ${Math.round(mc)} kg · ` : '') + `alu ≈ ${Math.round(ma)} kg`,
    broj: broj(P, meta.n), list: `${meta.n}/${meta.n}`, rev: P.rev || 'A'
  });
  return { L, masa: mc + ma };
}

export function sviListovi(P) {
  const R = racun(P), n = R.T.cel ? 3 : 2;
  const d = P.datum || new Date().toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\s/g, '');
  const meta = { n, datum: d };
  const out = [];
  const a = list01(P, R, meta); if (a) out.push(Object.assign(a, { broj: broj(P, 1), naziv: 'Konstrukcija' }));
  const b = list02(P, R, meta); out.push(Object.assign(b, { broj: broj(P, n - 1), naziv: 'Sklop pergola' }));
  const c = list03(P, R, meta); out.push(Object.assign(c, { broj: broj(P, n), naziv: 'Radionička lista' }));
  return { R, listovi: out };
}
