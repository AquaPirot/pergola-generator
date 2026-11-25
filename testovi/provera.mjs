/* PROVERA Pergola Pro — pokreće program u pravom pregledaču i prolazi kroz sve kombinacije.
   Pokretanje (iz korena projekta):  node testovi/provera.mjs
   Treba: PHP (lokalni server) i Playwright sa Chromium-om. Ništa ne šalje na pravi server —
   objavljivanje ponude je presretnuto. Izlaz: spisak provera; na kraju „SVE U REDU" ili broj grešaka. */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOREN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8791, URL = `http://127.0.0.1:${PORT}/pergola-v2.html`;
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

let greske = 0;
const ok = (uslov, opis, vise = '') => { if (!uslov) greske++; console.log((uslov ? '  ✓ ' : '  ✗ ') + opis + (uslov ? '' : '  → ' + vise)); };

/* 1) iza svakog dugmeta i polja mora da postoji funkcija */
{
  const h = readFileSync(resolve(KOREN, 'pergola-v2.html'), 'utf8');
  for (const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(m[1]);   // sintaksa
  const imena = new Set();
  for (const m of h.matchAll(/\bon(?:click|input|change)="([^"]*)"/g))
    for (const f of m[1].matchAll(/(?<![.\w])([A-Za-z_]\w*)\s*\(/g)) imena.add(f[1]);
  const fale = [...imena].filter(n => !['if', 'return', 'zoom', 'vt'].includes(n) && !new RegExp('function\\s+' + n + '\\b').test(h));
  console.log('Kod');
  ok(fale.length === 0, `sva dugmad i polja imaju svoju funkciju (${imena.size})`, 'nedostaju: ' + fale.join(', '));
}

const php = spawn('php', ['-S', `127.0.0.1:${PORT}`, '-t', KOREN], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const lose = h => { const t = h.replace(/src="data:[^"]*"/g, '').replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '); const m = t.match(/.{0,40}(NaN|undefined|Infinity|\bnull\b|\[object).{0,30}/g); return m ? m.slice(0, 2).join(' ¦ ') : ''; };

async function strana(opts = {}, qmode = '1') {
  const ctx = await b.newContext(opts);
  const pg = await ctx.newPage();
  pg.gr = [];
  pg.on('pageerror', e => pg.gr.push('GREŠKA ' + String(e).slice(0, 200)));
  pg.on('dialog', async d => { pg.gr.push('PROZOR ' + d.message().slice(0, 120)); await d.dismiss(); });
  await pg.addInitScript(q => { try { localStorage.setItem('pg_syncKey', 'proba'); localStorage.setItem('ag_pin_do', String(Date.now() + 864e5)); if (!sessionStorage.getItem('i')) { sessionStorage.setItem('i', '1'); localStorage.setItem('pg_qmode', q); } } catch (e) { } }, qmode);
  await pg.goto(URL, { waitUntil: 'load' });
  await pg.waitForTimeout(900);
  await pg.evaluate(() => { window.pgApi = async (a, bd) => { window.__cap = bd; return { url: 'https://primer.rs/ponude/proba.html' }; }; });
  return pg;
}

try {
  /* 2) DETALJAN UNOS — svi tipovi × montaže × broj pergola × sa/bez visina */
  {
    console.log('Detaljan unos');
    const pg = await strana({ viewport: { width: 1400, height: 1000 } }, '0');
    let n = 0, lo = [];
    for (const type of ['bioklimatska', 'biofix', 'klasicna', 'ravna']) for (const mount of ['zid', 'uzobjekat', 'samostojeca']) for (const st of (mount === 'samostojeca' ? ['stubovi', 'celik'] : ['x'])) for (const count of [1, 2, 3]) for (const vis of [true, false]) {
      pg.gr = [];
      const r = await pg.evaluate(async ([type, mount, st, count, vis]) => {
        const o = {};
        try {
          pgSelectType(document.querySelector(`#pg_typeSel [data-type="${type}"]`));
          pgSelectCount(document.querySelector(`#pg_countSel [data-count="${count}"]`));
          pgSelectMount(document.querySelector(`#pg_mountSel [data-mount="${mount}"]`));
          if (mount === 'samostojeca') pgSelectSamoTip(document.querySelector(`#pg_samoTipSel [data-st="${st}"]`));
          for (let i = 0; i < count; i++) { document.getElementById('pw_' + i).value = 450 + i * 50; document.getElementById('pp_' + i).value = 350; }
          document.getElementById('pg_wallHeight').value = vis ? (type === 'klasicna' ? 285 : 250) : '';
          document.getElementById('pg_passHeight').value = vis ? (type === 'klasicna' ? 240 : 250) : '';
          document.getElementById('pg_priceFix').value = '5000'; document.getElementById('pg_showPrice').checked = true;
          window.__cap = null; generatePergola(); await generatePonuda(); await generateLink(); pgLinkClose();
          o.html = window.__cap ? window.__cap.html : null; if (pgSteel()) generateNalog();
        } catch (e) { o.err = String(e && e.stack || e).slice(0, 200); }
        return o;
      }, [type, mount, st, count, vis]);
      n++; const id = `${type}/${mount}/${st}/${count}/${vis ? 'vis' : 'bez'}`;
      if (r.err || pg.gr.length || !r.html || lose(r.html)) lo.push(id + ' ' + (r.err || pg.gr.join(' ') || (r.html ? lose(r.html) : 'nema ponude')));
    }
    ok(!lo.length, `${n} kombinacija: crtež, ponuda, link, radni nalog`, lo.slice(0, 3).join(' ¦ '));
    await pg.context().close();
  }

  /* 3) BRZI UPIT — modeli × montaža × broj sistema × mere */
  {
    console.log('Brzi upit');
    const pg = await strana({ viewport: { width: 1400, height: 1000 } });
    let n = 0, lo = [];
    for (const tip of ['klasicna', 'bioklimatska', 'biofix']) for (const qm of ['zid', 'samostojeca']) for (const ns of [1, 2, 3]) for (const w of [2, 4, 6.5, 10, 16, 25]) for (const d of [1, 2, 3, 4, 7]) {
      pg.gr = [];
      await pg.evaluate(([tip, qm, w, d, ns]) => { pgQType(document.querySelector(`#pg_qType [data-qt="${tip}"]`)); pgQMountSet(document.querySelector(`#pg_qMount [data-qm="${qm}"]`)); pgQNSet(document.querySelector(`#pg_qN [data-n="${ns}"]`)); document.getElementById('pg_qW').value = w; document.getElementById('pg_qD').value = d; pgQCalc(); }, [tip, qm, w, d, ns]);
      const treba = w / ns >= 2 && d >= (tip === 'klasicna' ? 1 : 2);
      const r = await pg.evaluate(async () => { window.__cap = null; const o = {}; try { if (!pgQApply()) return { stop: 1 }; await generatePonuda(); await generateLink(); pgLinkClose(); o.html = window.__cap && window.__cap.html; o.tw = pgTW(); o.c = pgS.count; } catch (e) { o.err = String(e.stack || e).slice(0, 200); } return o; });
      n++; const id = `${tip}/${qm}/${ns}sis/${w}×${d}`;
      if (r.stop) { if (treba) lo.push(id + ' odbijeno a ne treba'); continue; }
      if (!treba) { lo.push(id + ' prošlo a treba da odbije'); continue; }
      if (r.err || pg.gr.length || !r.html || lose(r.html) || r.tw !== Math.round(w * 100) || r.c !== ns) lo.push(id + ' ' + (r.err || pg.gr.join(' ') || (r.html ? lose(r.html) : 'nema ponude') || `mera ${r.tw}/${r.c}`));
    }
    ok(!lo.length, `${n} kombinacija: ponuda i link, najmanje mere, broj sistema`, lo.slice(0, 3).join(' ¦ '));
    await pg.context().close();
  }

  /* 4) BRZI UPIT NA TELEFONU — kucanje u polja */
  {
    console.log('Telefon');
    const pg = await strana({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const cena = () => pg.inputValue('#pg_qPrice');
    ok(!(await pg.$('.start-overlay.visible')) && await pg.evaluate(() => document.body.classList.contains('qmode')), 'otvara se pravo na brzi upit, bez prozora');
    ok(await cena() === '4100', 'početna cena 6 × 4 klasična = 4100', await cena());
    await pg.tap('#pg_qM2'); await pg.keyboard.type('187');
    await pg.tap('#pg_qZk [data-k="1"]'); ok(await cena() === '4488', 'cena po m²: 187 × 24 = 4488', await cena());
    await pg.tap('#pg_qZk [data-k="50"]'); ok(await cena() === '4500', 'zaokruži 50 → 4500', await cena());
    await pg.tap('#pg_qZk [data-k="10"]'); ok(await cena() === '4490', 'zaokruži 10 → 4490', await cena());
    ok(await pg.evaluate(() => document.querySelector('#pg_qZk button.on').dataset.k) === '10', 'izabrano zaokruživanje je označeno');
    await pg.fill('#pg_qW', '5.5'); ok(await cena() === '4110', 'promena mere čuva cenu po m² (22 × 187 = 4110)', await cena());
    await pg.fill('#pg_qM2', ''); ok(await cena() === '3950', 'prazno polje po m² vraća cenovnik (3950)', await cena());
    await pg.fill('#pg_qPrice', '4137'); await pg.tap('#pg_qZk [data-k="50"]'); ok(await cena() === '4150', 'ručna cena 4137, zaokruži 50 → 4150', await cena());
    await pg.tap('#pg_qZk [data-k="10"]');
    await pg.tap('#pg_qMount [data-qm="samostojeca"]'); await pg.fill('#pg_qSd', '500'); ok(await cena() === '4450', 'samostojeća: 3950 + 500 doplata = 4450', await cena());
    await pg.fill('#pg_qW', '16'); await pg.tap('#pg_qN [data-n="2"]'); ok(await cena() === '9900', '16 × 4 u 2 sistema: 2 × 4700 + 500 = 9900', await cena());
    // slanje
    await pg.fill('#pg_qTel', '064 123 4567');
    ok(await pg.evaluate(() => pgTelIntl()) === '381641234567', 'broj 064… → +381…');
    const nav = await pg.evaluate(async () => { let u = ''; window.pgPorukaViber = () => { u = 'viber://chat?number=%2B' + pgTelIntl() + '&draft=' + encodeURIComponent(pgPorukaTekst()); }; pgQApply(); await generateLink('viber'); return decodeURIComponent(u); });
    ok(nav.startsWith('viber://chat?number=+381641234567&draft=Poštovani') && nav.includes('16 × 4 m (2 spojena sistema)') && nav.includes('https://primer.rs/ponude/proba.html'), '„Pošalji na Viber" pravi link sa brojem, porukom i brojem sistema', nav.slice(0, 120));
    const h = await pg.evaluate(() => window.__cap.html);
    ok(/Spojeni sistemi<\/span><b>2 × 800 × 400 cm/.test(h) && h.includes('2 spojena sistema') && h.includes('samostojeća'), 'ponuda: spojeni sistemi i samostojeća pišu u specifikaciji');
    // prozor „Link za kupca" staje na ekran
    const m = await pg.evaluate(() => { const r = document.querySelector('#pg_linkOverlay .start-modal').getBoundingClientRect(); const z = [...document.querySelectorAll('#pg_linkOverlay .l2 .sm-btn')].map(x => x.getBoundingClientRect().bottom); return { top: r.top, bottom: Math.max(...z), vh: innerHeight, sw: document.documentElement.scrollWidth, vw: innerWidth }; });
    ok(m.top >= 0 && m.bottom <= m.vh, 'prozor „Link za kupca" ceo staje na ekran (vidi se i „Zatvori")', JSON.stringify(m));
    ok(await pg.evaluate(() => getComputedStyle(document.getElementById('pg_viberIzbor')).display) !== 'none', 'sa brojem se vidi rezervni put „sami birate kome"');
    // Novo iz prozora
    await pg.tap('#pg_linkOverlay .l2 .sm-btn.prep'); await pg.waitForTimeout(300);
    const s = await pg.evaluate(() => ({ ov: !!document.querySelector('.start-overlay.visible'), tel: document.getElementById('pg_qTel').value + pgS.tel, tip: pgQTip(), samo: pgQSamo(), n: pgQN(), w: document.getElementById('pg_qW').value, d: document.getElementById('pg_qD').value, cena: document.getElementById('pg_qPrice').value, dop: document.getElementById('pg_qSd').value, m2: document.getElementById('pg_qM2').value, dod: pgS.dodaci.length, v2: !!pgS.var2, cv: document.getElementById('canvasPonuda').style.display }));
    ok(!s.ov && s.tel === '' && s.tip === 'klasicna' && !s.samo && s.n === 1 && s.w === '6' && s.d === '4' && s.cena === '4100' && s.dop === '' && s.m2 === '' && !s.dod && !s.v2 && s.cv === 'none', '„Novo" u prozoru zatvara ga i vraća sve na početak', JSON.stringify(s));
    ok(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'nema pomeranja ekrana u stranu');
    ok(!pg.gr.length, 'bez grešaka i iskačućih prozora', pg.gr.join(' ¦ '));
    await pg.context().close();
  }

  /* 5) DVE VARIJANTE */
  {
    console.log('Dve varijante');
    const pg = await strana({ viewport: { width: 1400, height: 1000 } });
    await pg.evaluate(() => { document.getElementById('pg_qW').value = 4; document.getElementById('pg_qD').value = 3; pgQCalc(); });
    await pg.click('#pg_qVar [data-vadd]');
    const r = await pg.evaluate(async () => { pgQApply(); await generateLink(); const p = pgPorukaTekst(); pgLinkClose(); const h = window.__cap.html; return { v: pgLinkVar, cene: [...h.matchAll(/class="c">([^<]*)/g)].map(x => x[1]), red: (h.match(/<table class="raz">[\s\S]*?<\/table>/) || [''])[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), p, tip: pgS.type, og: (h.match(/og:title" content="([^"]*)/) || [])[1] }; });
    ok(r.v && r.v.join() === 'biofix,klasicna' && r.cene.join('|') === '2.450 EUR|3.200 EUR', 'jeftinija levo: BIOFIX 2.450, Klasična 3.200', JSON.stringify(r.cene));
    ok(r.red.includes('Za sva godišnja doba') && r.red.includes('✓ sa dimerom') && r.red.includes('3D Blockout cerada') && !/pokvari/.test(r.red), 'tabela razlika ima dogovorene tekstove');
    ok(r.p.includes('dve varijante — BIOFIX i Klasičnu pergolu') && r.og === 'Ponuda 4 × 3 m — BIOFIX ili Klasična' && r.tip === 'klasicna', 'poruka, naslov za Viber i vraćanje stanja', r.p.slice(0, 90));
    ok(!pg.gr.length, 'bez grešaka', pg.gr.join(' ¦ '));
    // naši brendovi u ponudi
    const br = await pg.evaluate(async () => {
      pgDodAdd('zip'); pgQApply(); await generateLink(); pgLinkClose(); const h = window.__cap.html;
      pgS.lang = 'bg'; await generateLink(); pgLinkClose(); const hb = window.__cap.html; pgS.lang = 'sr';
      return { sr: [...h.matchAll(/<a class="br" href="([^"]*)"[\s\S]*?<b>([^<]*)<\/b>/g)].map(x => x[2] + ' ' + x[1]), zip: /ZIPZAVESE\.RS<\/b>[\s\S]{0,400}Deo toga je već u ovoj ponudi/.test(h), staklo: /STAKLENISISTEMI\.RS<\/b>[\s\S]{0,300}Deo toga/.test(h), foot: /<footer>[\s\S]*zipzavese\.rs[\s\S]*staklenisistemi\.rs/.test(h), bg: /class="br"/.test(hb) };
    });
    ok(br.sr.length === 2 && br.sr[0].startsWith('ZIPZAVESE.RS https://zipzavese.rs/?utm_source=ponuda') && br.sr[1].startsWith('STAKLENISISTEMI.RS https://staklenisistemi.rs/'), 'ponuda predlaže zipzavese.rs i staklenisistemi.rs (bez pergola.rs)', JSON.stringify(br.sr));
    ok(br.zip && !br.staklo, 'kad je ZIP u ponudi, na kartici ZIP piše „već u ovoj ponudi"');
    ok(br.foot && !br.bg, 'sva tri sajta u podnožju; bugarska ponuda bez srpskih brendova');
    await pg.context().close();
  }

  /* 6) TROŠAK I ZARADA — izmišljeni troškovi (pravi su samo na serveru, u cene-podaci.php); sve bez PDV */
  {
    console.log('Trošak i zarada');
    const pg = await strana({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
    await pg.evaluate(() => {
      pgPrep = { mat: { pro: [3.5, 4], sir: [3.5, 4], t: [[1000, 1100], [1050, 1150]] },
        p: { motor: 100, ekipa: 200, montera: 3, nocenje: 25, km: 0.5, granica: 100, putDan: 1, d1: 30, d2: 50, radionica: 0, prag: 0.3, pdv: 0.2 } };
    });
    const tr = () => pg.evaluate(() => { const me = pgMesto(document.getElementById('pg_qMesto').value); const t = pgTrosak(pgQTip(), +document.getElementById('pg_qW').value, +document.getElementById('pg_qD').value, pgQN(), me && !me.nepoznato ? me : null); return t && Math.round(t.uk); });
    const set = async (w, d, m) => { await pg.fill('#pg_qW', String(w)); await pg.fill('#pg_qD', String(d)); await pg.fill('#pg_qMesto', m); };
    await set(4, 4, 'Pirot'); ok(await tr() === 1450, 'Pirot: materijal 1150 + motor 100 + ekipa 1 dan 200 = 1450', await tr());
    await set(4, 4, 'Niš'); ok(await tr() === 1522, 'Niš 72 km: + vozilo 144 × 0,5 = 1522 (ekipa i dalje 1 dan, bez noćenja)', await tr());
    await set(4, 4, 'beog'); ok(await tr() === 2035, 'Beograd 310 km: 1150 + 100 + ekipa 2 dana 400 + vozilo 310 + noćenje 75 = 2035', await tr());
    await set(4, 3, '0'); ok(await tr() === 1350, 'projekcija ispod tabele (3 m) — procena materijala 1050', await tr());
    await set(4, 4, 'Beograd');
    ok(await pg.$eval('#pg_qPrep', e => !e.querySelector('table') && /Trošak i zarada/.test(e.textContent) && !/\d/.test(e.textContent)), 'pregled je skupljen i bez brojeva dok se ne otvori');
    await pg.tap('#pg_qPrep .pr-t');
    const txt = await pg.$eval('#pg_qPrep', e => e.innerText.replace(/\s+/g, ' '));
    ok(txt.includes('Vaša cena (bez PDV) 3.450 EUR') && txt.includes('Trošak 2.035 EUR') && txt.includes('OSTAJE VAM (70 % na trošak) 1.415 EUR') && txt.includes('Preko firme, sa PDV 20 % 4.140 EUR'), 'otvoren: cena 3450 − trošak 2035 = ostaje 1415 (70 %), preko firme 4140', txt.slice(0, 200));
    await pg.fill('#pg_qPrice', '2300');
    ok(await pg.$eval('#pg_qPrep', e => !!e.querySelector('tr.lo') && !!e.querySelector('.dot.lo')), 'ispod 30 % zarade (2300 − 2035 = 13 %) pregled pocrveni');
    await pg.tap('#pg_qType [data-qt="bioklimatska"]');
    ok(await pg.$eval('#pg_qPrep', e => /nema podataka/.test(e.textContent) && !/OSTAJE VAM/.test(e.textContent)), 'bioklimatska bez troška materijala: ne prikazuje lažnu zaradu');
    await pg.tap('.qmode-btn.novo');
    ok(await pg.$eval('#pg_qPrep', e => !e.querySelector('table')), '„Novo" ponovo skuplja pregled');
    ok(await pg.evaluate(() => !document.querySelector('#pg_qPrep button')) && await pg.inputValue('#pg_qPrice') === '4100', 'nema više „preporučene cene" — cena ostaje vaša (cenovnik 4100)');
    ok(!pg.gr.length, 'bez grešaka', pg.gr.join(' ¦ '));
    await pg.context().close();
  }

  /* 7) OSTALE STRANICE se učitavaju bez greške */
  {
    console.log('Ostale stranice');
    const lo = [];
    for (const u of ['index.html', 'alat.html', 'uputstvo-mere.html', 'dizajn-pergola.html', 'arhitekta.html', 'arhitekta.html?pro=1', 'arhitekta.html?kupac', '3d.html', 'projektant.html', 'demo/animacija.html', 'demo/animacija-bio.html', 'demo/mapa.html']) {
      const pg = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage(); const e = [];
      pg.on('pageerror', x => e.push(String(x).slice(0, 120)));
      await pg.addInitScript(() => { try { localStorage.setItem('ag_pin_do', String(Date.now() + 864e5)); } catch (e) { } });
      await pg.goto(`http://127.0.0.1:${PORT}/${u}`, { waitUntil: 'load' }).catch(x => e.push(String(x)));
      await pg.waitForTimeout(1500); if (e.length) lo.push(u + ': ' + e[0]); await pg.context().close();
    }
    ok(!lo.length, '12 stranica', lo.join(' ¦ '));
  }
} finally {
  await b.close(); php.kill();
}
console.log(greske ? `\n✗ GREŠAKA: ${greske}` : '\n✓ SVE U REDU');
process.exit(greske ? 1 : 0);
