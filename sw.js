// Service worker voor Topografie Quiz
// Zorgt voor offline gebruik en maakt PWA-installatie mogelijk.

const CACHE = 'topoquiz-v2.25.3';
const ASSETS = [
  '/', '/index.html', '/cities.js', '/icon.svg', '/manifest.json', '/provincie_2023.geojson',
  // Pure-logica ESM-modules (#95). Moeten offline beschikbaar zijn,
  // anders breekt de app: index.html's boot-module importeert ze bij laden.
  '/src/game/text.js', '/src/game/geo.js', '/src/game/click.js',
  '/src/game/daily.js', '/src/game/smooth.js', '/src/game/shapes.js',
  '/src/game/package.json',
  // Scherm-render-modules (#96). index.html importeert deze bij boot
  // via <script type="module">, dus offline = cache hier ook.
  '/src/screens/levelselect.js', '/src/screens/modeselect.js',
  '/src/screens/phase-transition.js', '/src/screens/end.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
