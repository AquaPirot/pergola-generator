const CACHE_NAME = 'aggroup-pergola-v13';
const ASSETS = [
  'index.html',
  'dizajn-pergola.html',
  'pergola-v2.html',
  'uputstvo-mere.html',
  'manifest.json',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
  'icons/icon-maskable.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // API pozivi i sve što nije GET ide direktno na mrežu (bez keša)
  if (req.method !== 'GET' || req.url.includes('api.php')) return;
  // HTML fajlovi: uvek pokušaj mrežu prvo — da korisnici uvek dobiju novu verziju
  if (req.headers.get('Accept') && req.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }
  // Ostali resursi (ikone, manifest): keš prvo, brže učitavanje
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
