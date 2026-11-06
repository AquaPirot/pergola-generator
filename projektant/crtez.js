/* ═══════════════════════════════════════════════════════════════
   PROJEKTANT — crtački motor
   Sve se crta u milimetrima lista (A3 položeno, 420 × 297, y nadole).
   Isti spisak operacija ide i na ekran (SVG) i u PDF (jsPDF) —
   ono što vidite na ekranu je tačno ono što se štampa.
   ═══════════════════════════════════════════════════════════════ */

export const A3 = { w: 420, h: 297 };
const PT = 72 / 25.4;                       // pt u jednom mm
export const DEB = { k: 0.5, s: 0.35, t: 0.18, vt: 0.13 };   // debljine linija
export const OSA = [5, 1.2, 0.6, 1.2];     // crta-tačka
export const SKR = [1.6, 0.9];              // isprekidana (skrivena ivica)

/* širina teksta u mm — meri se istim fontom koji ide u PDF */
let mc = null;
export function sirina(s, h, b) {
  if (!mc) mc = document.createElement('canvas').getContext('2d');
  mc.font = `${b ? 700 : 400} 100px DJ`;
  return mc.measureText(String(s)).width / 100 * h;
}

export class List {
  constructor() { this.ops = []; }
  line(x1, y1, x2, y2, st = {}) { this.ops.push({ t: 'l', x1, y1, x2, y2, st }); }
  rect(x, y, w, h, st = {}) {
    if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
    this.ops.push({ t: 'r', x, y, w, h, st });
  }
  poly(pts, st = {}) { this.ops.push({ t: 'p', pts, st }); }
  circle(cx, cy, r, st = {}) { this.ops.push({ t: 'c', cx, cy, r, st }); }
  /* st: h visina slova (mm), b podebljano, a 'l'|'c'|'r', v 'b'|'m'|'t', r ugao (°, suprotno kazaljci) */
  text(x, y, s, st = {}) {
    s = String(s); const h = st.h || 2.5, r = (st.r || 0) * Math.PI / 180;
    const w = sirina(s, h, st.b);
    const dx = st.a === 'c' ? -w / 2 : st.a === 'r' ? -w : 0;
    const dy = st.v === 'm' ? 0.36 * h : st.v === 't' ? 0.74 * h : 0;
    const ux = Math.cos(r), uy = -Math.sin(r), px = Math.sin(r), py = Math.cos(r);
    this.ops.push({ t: 't', x: x + dx * ux + dy * px, y: y + dx * uy + dy * py, s, h, b: !!st.b, r: st.r || 0, c: st.c || '#000' });
    return w;
  }
  /* šrafura pravougaonika — linije pod uglom, odsečene na ivici */
  srafura(x, y, w, h, korak = 1.6, ugao = 45, st = {}) {
    const a = ugao * Math.PI / 180, dx = Math.cos(a), dy = -Math.sin(a), nx = -dy, ny = dx;
    const cx = x + w / 2, cy = y + h / 2, R = Math.hypot(w, h) / 2;
    const s2 = Object.assign({ w: DEB.vt, c: '#555' }, st);
    for (let k = -R; k <= R; k += korak) {
      const px = cx + nx * k, py = cy + ny * k;
      let t0 = -R, t1 = R;
      const clip = (p, q) => { if (Math.abs(p) < 1e-9) return q >= 0; const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } return true; };
      if (clip(-dx, px - x) && clip(dx, x + w - px) && clip(-dy, py - y) && clip(dy, y + h - py) && t1 > t0)
        this.line(px + dx * t0, py + dy * t0, px + dx * t1, py + dy * t1, s2);
    }
  }
  /* beton — šrafura i tačkice */
  beton(x, y, w, h) {
    this.srafura(x, y, w, h, 2.2, 45, { c: '#9a9a9a', w: 0.1 });
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const n = Math.round(w * h / 9);
    for (let i = 0; i < n; i++) this.circle(x + 0.6 + rnd() * (w - 1.2), y + 0.6 + rnd() * (h - 1.2), 0.14 + rnd() * 0.12, { f: '#9a9a9a', s: false });
  }
}

/* ───────────── izlaz: SVG za ekran ───────────── */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function svgSt(st, fillDef) {
  const f = st.f || fillDef || 'none', s = st.s === false ? 'none' : (st.c || '#000');
  return `fill="${f}" stroke="${s}" stroke-width="${st.w || DEB.t}"${st.d ? ` stroke-dasharray="${st.d.join(' ')}"` : ''}`;
}
export function uSVG(L) {
  const o = [];
  for (const p of L.ops) {
    if (p.t === 'l') o.push(`<line x1="${p.x1.toFixed(2)}" y1="${p.y1.toFixed(2)}" x2="${p.x2.toFixed(2)}" y2="${p.y2.toFixed(2)}" ${svgSt(p.st)}/>`);
    else if (p.t === 'r') o.push(`<rect x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" width="${p.w.toFixed(2)}" height="${p.h.toFixed(2)}" ${svgSt(p.st)}/>`);
    else if (p.t === 'c') o.push(`<circle cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="${p.r.toFixed(2)}" ${svgSt(p.st)}/>`);
    else if (p.t === 'p') o.push(`<${p.st.open ? 'polyline' : 'polygon'} points="${p.pts.map(q => q[0].toFixed(2) + ',' + q[1].toFixed(2)).join(' ')}" ${svgSt(p.st)}/>`);
    else if (p.t === 't') o.push(`<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" font-size="${p.h}" font-weight="${p.b ? 700 : 400}" fill="${p.c}"${p.r ? ` transform="rotate(${-p.r} ${p.x.toFixed(2)} ${p.y.toFixed(2)})"` : ''}>${esc(p.s)}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${A3.w} ${A3.h}" font-family="DJ" stroke-linecap="butt"><rect width="${A3.w}" height="${A3.h}" fill="#fff"/>${o.join('')}</svg>`;
}

/* ───────────── izlaz: PDF ───────────── */
export function uPDF(doc, L) {
  let lw = -1, dash = '', dc = '', fc = '', tc = '', font = '';
  const setS = st => {
    const w = st.w || DEB.t; if (w !== lw) { doc.setLineWidth(w); lw = w; }
    const d = st.d ? st.d.join(',') : ''; if (d !== dash) { doc.setLineDashPattern(st.d || [], 0); dash = d; }
    const c = st.c || '#000000'; if (c !== dc) { doc.setDrawColor(c); dc = c; }
    if (st.f && st.f !== fc) { doc.setFillColor(st.f); fc = st.f; }
  };
  const stil = st => st.f ? (st.s === false ? 'F' : 'FD') : 'S';
  for (const p of L.ops) {
    if (p.t === 't') {
      const f = p.b ? 'bold' : 'normal'; if (f !== font) { doc.setFont('DJ', f); font = f; }
      if (p.c !== tc) { doc.setTextColor(p.c); tc = p.c; }
      doc.setFontSize(p.h * PT);
      doc.text(p.s, p.x, p.y, p.r ? { angle: p.r } : undefined);
      fc = '';                                   // tekst menja boju ispune u PDF-u
      continue;
    }
    setS(p.st);
    if (p.t === 'l') doc.line(p.x1, p.y1, p.x2, p.y2);
    else if (p.t === 'r') doc.rect(p.x, p.y, p.w, p.h, stil(p.st));
    else if (p.t === 'c') doc.circle(p.cx, p.cy, p.r, stil(p.st));
    else if (p.t === 'p') {
      const d = []; for (let i = 1; i < p.pts.length; i++) d.push([p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]]);
      doc.lines(d, p.pts[0][0], p.pts[0][1], [1, 1], stil(p.st), !p.st.open);
    }
  }
}

/* ═══════════════ POGLED: model (mm, y nagore) → list ═══════════════
   tip 'izgled' : x desno, y gore
   tip 'osnova' : x desno, y (dubina) nadole
   tip 'osnovaR': osnova zarotirana — x (dužina) nadole, y (dubina) desno */
export class Pogled {
  constructor(L, ox, oy, s, tip = 'izgled') {
    this.L = L; this.ox = ox; this.oy = oy; this.s = s;
    this.m = tip === 'izgled' ? [1, 0, 0, -1] : tip === 'osnova' ? [1, 0, 0, 1] : [0, 1, 1, 0];
  }
  P(x, y) { const m = this.m; return [this.ox + (m[0] * x + m[1] * y) / this.s, this.oy + (m[2] * x + m[3] * y) / this.s]; }
  /* smer modela → jedinični vektor na listu */
  V(x, y) { const m = this.m, a = m[0] * x + m[1] * y, b = m[2] * x + m[3] * y, n = Math.hypot(a, b) || 1; return [a / n, b / n]; }
  line(x1, y1, x2, y2, st) { const a = this.P(x1, y1), b = this.P(x2, y2); this.L.line(a[0], a[1], b[0], b[1], st); }
  rect(x0, y0, x1, y1, st) { const a = this.P(x0, y0), b = this.P(x1, y1); this.L.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), st); }
  poly(pts, st) { this.L.poly(pts.map(p => this.P(p[0], p[1])), st); }
  circle(x, y, r, st) { const a = this.P(x, y); this.L.circle(a[0], a[1], r / this.s, st); }
  text(x, y, s, st) { const a = this.P(x, y); return this.L.text(a[0], a[1], s, st); }
  srafura(x0, y0, x1, y1, korak, ugao, st) { const a = this.P(x0, y0), b = this.P(x1, y1); this.L.srafura(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), korak, ugao, st); }
  beton(x0, y0, x1, y1) { const a = this.P(x0, y0), b = this.P(x1, y1); this.L.beton(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); }
  /* kota između tačaka A i B; linija pomerena za d (mm lista) u smeru (nx,ny) modela */
  kota(ax, ay, bx, by, nx, ny, d, txt, o = {}) {
    const A = this.P(ax, ay), B = this.P(bx, by), n = this.V(nx, ny);
    kotaL(this.L, A, B, n, d, txt == null ? String(Math.round(Math.hypot(bx - ax, by - ay))) : txt, o);
  }
  /* lanac kota kroz niz tačaka duž ose x ili y modela */
  lanac(osa, vr, fiks, nx, ny, d, o = {}) {
    for (let i = 1; i < vr.length; i++) {
      const a = vr[i - 1], b = vr[i]; if (Math.abs(b - a) < 0.5) continue;
      if (osa === 'x') this.kota(a, fiks, b, fiks, nx, ny, d, String(Math.round(b - a)), o);
      else this.kota(fiks, a, fiks, b, nx, ny, d, String(Math.round(b - a)), o);
    }
  }
}

export function kotaL(L, A, B, n, d, txt, o = {}) {
  const gap = o.gap == null ? 1 : o.gap, pre = 1.4;
  const A2 = [A[0] + n[0] * d, A[1] + n[1] * d], B2 = [B[0] + n[0] * d, B[1] + n[1] * d];
  const st = { w: DEB.vt };
  if (Math.abs(d) > gap + 0.2) {
    const sg = Math.sign(d);
    L.line(A[0] + n[0] * gap * sg, A[1] + n[1] * gap * sg, A2[0] + n[0] * pre * sg, A2[1] + n[1] * pre * sg, st);
    L.line(B[0] + n[0] * gap * sg, B[1] + n[1] * gap * sg, B2[0] + n[0] * pre * sg, B2[1] + n[1] * pre * sg, st);
  }
  const ux = B2[0] - A2[0], uy = B2[1] - A2[1], len = Math.hypot(ux, uy) || 1, u = [ux / len, uy / len];
  L.line(A2[0] - u[0] * 1.4, A2[1] - u[1] * 1.4, B2[0] + u[0] * 1.4, B2[1] + u[1] * 1.4, st);
  // kosa crtica (arhitektonski način)
  const k = [(u[0] - u[1]) * 1.25, (u[1] + u[0]) * 1.25];
  [A2, B2].forEach(P => L.line(P[0] - k[0], P[1] - k[1], P[0] + k[0], P[1] + k[1], { w: DEB.s }));
  // tekst — uvek čitljiv
  let r = -Math.atan2(uy, ux) * 180 / Math.PI; if (r <= -90) r += 180; if (r > 90) r -= 180;
  const rr = r * Math.PI / 180, up = [-Math.sin(rr), -Math.cos(rr)];
  const h = o.h || 2.2, M = [(A2[0] + B2[0]) / 2 + up[0] * 0.7, (A2[1] + B2[1]) / 2 + up[1] * 0.7];
  const w = sirina(txt, h);
  if (w + 1 > len && !o.unutra) {             // tekst ne staje — iznad, malo sa strane
    L.text(M[0] + up[0] * (h + 0.3), M[1] + up[1] * (h + 0.3), txt, { h, a: 'c', r });
  } else L.text(M[0], M[1], txt, { h, a: 'c', r });
}

/* ───────────── simboli ───────────── */
export function nivo(L, X, Y, txt, o = {}) {           // kota visine ▽
  const dir = o.levo ? -1 : 1, d = o.duz || 15;
  L.line(X, Y, X + dir * d, Y, { w: DEB.vt });
  const tx = X + dir * (d - 4.5);
  L.poly([[tx - 1.4, Y - 2.2], [tx + 1.4, Y - 2.2], [tx, Y]], { w: DEB.t });
  L.text(X + dir * (d - 2.2), Y - 1.2, txt, { h: 2.2, a: o.levo ? 'r' : 'l' });
}
export function poz(L, tx, ty, cx, cy, n) {            // oznaka pozicije sa linijom
  const r = 3.1, dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy) || 1;
  L.line(cx + dx / d * r, cy + dy / d * r, tx, ty, { w: DEB.vt });
  L.circle(tx, ty, 0.45, { f: '#000', s: false });
  L.circle(cx, cy, r, { w: DEB.t, f: '#fff' });
  L.text(cx, cy, String(n), { h: 2.8, a: 'c', v: 'm' });
}
export function osaOznaka(L, X, Y, txt) { L.circle(X, Y, 3.4, { w: DEB.t, f: '#fff' }); L.text(X, Y, txt, { h: 3, a: 'c', v: 'm' }); }
export function naslov(L, X, Y, t, razmera) {
  const w = L.text(X, Y, t, { h: 3.3, b: true });
  L.line(X, Y + 1.2, X + w + 1.5, Y + 1.2, { w: DEB.s });
  if (razmera) L.text(X + w + 5, Y, razmera, { h: 2.4 });
}
export function presekOzn(L, X, Y, slovo, smer) {     // smer: [dx,dy] gde se gleda
  const s = smer, p = [-s[1], s[0]];
  L.line(X - p[0] * 2.5, Y - p[1] * 2.5, X + p[0] * 2.5, Y + p[1] * 2.5, { w: 0.7 });
  const t = [X + s[0] * 3.2, Y + s[1] * 3.2];
  L.poly([[X + p[0] * 0.2, Y + p[1] * 0.2], [t[0], t[1]], [X + p[0] * 0.2 + s[0] * 0.4 - p[0] * 1.6, Y + p[1] * 0.2 + s[1] * 0.4 - p[1] * 1.6]], { f: '#000', w: DEB.t });
  L.text(X - p[0] * 4.6 + s[0] * 0.6, Y - p[1] * 4.6 + s[1] * 0.6, slovo, { h: 3.2, b: true, a: 'c', v: 'm' });
}
/* lom linija (cik-cak) */
export function lom(L, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), u = [dx / d, dy / d], n = [-u[1], u[0]];
  const m = [(x1 + x2) / 2, (y1 + y2) / 2];
  L.poly([[x1, y1], [m[0] - u[0] * 1.2, m[1] - u[1] * 1.2], [m[0] - u[0] * 0.4 + n[0] * 1.6, m[1] - u[1] * 0.4 + n[1] * 1.6], [m[0] + u[0] * 0.4 - n[0] * 1.6, m[1] + u[1] * 0.4 - n[1] * 1.6], [m[0] + u[0] * 1.2, m[1] + u[1] * 1.2], [x2, y2]], { open: true, w: DEB.vt });
}
/* teren — linija i kose crtice ispod */
export function teren(L, x1, x2, Y, preskoci = []) {
  L.line(x1, Y, x2, Y, { w: DEB.s });
  for (let x = x1 + 0.8; x < x2 - 1; x += 1.6) {
    if (preskoci.some(p => x > p[0] - 1 && x < p[1] + 1)) continue;
    L.line(x, Y + 0.2, x - 1.2, Y + 1.5, { w: DEB.vt });
  }
}
/* izbor razmere da crtež stane u okvir */
export const RAZMERE = [10, 20, 25, 50, 75, 100, 125, 150, 200, 250];
export function razmera(w, h, W, H, lista = RAZMERE) { for (const s of lista) if (w / s <= W && h / s <= H) return s; return lista[lista.length - 1]; }
export const br = (v, d = 2) => (v < 0 ? '−' : v > 0 ? '+' : '±') + (Math.abs(v) / 1000).toFixed(d).replace('.', ',');
