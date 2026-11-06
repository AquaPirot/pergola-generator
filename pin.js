/* AG GROUP — zaključavanje internih alata PIN-om.
   Posle tačnog PIN-a uređaj je otključan 30 dana (pamti se u pregledaču).
   Ovo sprečava kupca da slučajno uđe u alate; nije zaštita od stručnjaka,
   jer je sve što je u stranici vidljivo u njenom izvornom kodu.
   Pogled za kupca (arhitekta.html?kupac, 3d.html), ponude, uputstvo i početna nisu zaključani. */
(function () {
  if (/[?&]kupac\b/.test(location.search)) return;
  var KLJUC = 'ag_pin_do', DANA = 30, HES = 'kglt7k';
  function hes(p) { var h = 5381, s = 'ag-pergola-' + p; for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); }
  try { if (+localStorage.getItem(KLJUC) > Date.now()) return; } catch (e) { return; }

  var de = document.documentElement;
  de.classList.add('pin-lock');
  var st = document.createElement('style');
  st.textContent =
    'html.pin-lock body{visibility:hidden!important}' +
    '#pinGate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;' +
    'background:linear-gradient(160deg,#14213d,#1c2d4f);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;visibility:visible}' +
    '#pinGate .k{background:#fff;border-radius:18px;padding:28px 24px 24px;width:min(330px,100%);text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.35)}' +
    '#pinGate .m{width:54px;height:54px;border-radius:12px;background:#14213d;color:#fff;font:800 18px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;letter-spacing:.5px}' +
    '#pinGate h1{font-size:16px;font-weight:800;letter-spacing:1.4px;color:#14213d;margin:0}' +
    '#pinGate p{font-size:12.5px;color:#6b7280;margin:6px 0 16px}' +
    '#pinGate input{width:100%;box-sizing:border-box;font:700 26px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;letter-spacing:12px;text-align:center;padding:10px 0 10px 12px;border:1.5px solid #e3e6eb;border-radius:12px;color:#14213d;outline:none}' +
    '#pinGate input:focus{border-color:#c8944e}' +
    '#pinGate button{width:100%;margin-top:12px;font:700 14px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:12px;border:0;border-radius:12px;background:linear-gradient(135deg,#c8944e,#a97a37);color:#fff;cursor:pointer}' +
    '#pinGate .g{color:#c0392b;font-size:12.5px;min-height:18px;margin-top:8px}' +
    '#pinGate .tr{animation:pinTr .35s}' +
    '@keyframes pinTr{20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}';
  (document.head || de).appendChild(st);

  function prikazi() {
    var g = document.createElement('div');
    g.id = 'pinGate';
    g.innerHTML = '<form class="k" autocomplete="off"><div class="m">AG</div><h1>AG GROUP</h1>' +
      '<p>Interni alati — unesite PIN</p>' +
      '<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" aria-label="PIN" autofocus>' +
      '<button type="submit">Uđi</button><div class="g" role="alert"></div></form>';
    de.appendChild(g);
    var f = g.querySelector('form'), inp = g.querySelector('input'), gr = g.querySelector('.g');
    function proveri() {
      if (hes(inp.value.trim()) === HES) {
        try { localStorage.setItem(KLJUC, String(Date.now() + DANA * 864e5)); } catch (e) {}
        g.remove(); de.classList.remove('pin-lock');
        try { window.dispatchEvent(new Event('resize')); } catch (e) {}
      } else {
        gr.textContent = 'Pogrešan PIN';
        f.classList.remove('tr'); void f.offsetWidth; f.classList.add('tr');
        inp.value = ''; inp.focus();
      }
    }
    f.addEventListener('submit', function (e) { e.preventDefault(); proveri(); });
    inp.addEventListener('input', function () { gr.textContent = ''; if (inp.value.length === 4 && hes(inp.value) === HES) proveri(); });
    setTimeout(function () { inp.focus(); }, 50);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prikazi); else prikazi();
})();
