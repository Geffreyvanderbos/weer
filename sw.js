const CACHE = 'weer-v3';
const ASSETS = ['/index.html', '/manifest.json', '/sw.js'];

async function makeIcon(size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.18;

  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${Math.round(size * 0.52)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', size / 2, size / 2 + size * 0.03);

  return canvas.convertToBlob({ type: 'image/png' });
}

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
  const url = new URL(e.request.url);

  // Icon requests: generate dynamically and cache
  if (url.pathname === '/icon-192.png' || url.pathname === '/icon-512.png') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        const size = url.pathname.includes('512') ? 512 : 192;
        return makeIcon(size).then(blob => {
          const res = new Response(blob, { headers: { 'Content-Type': 'image/png' } });
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // Open-Meteo API: network only (app caches in localStorage)
  if (url.hostname === 'api.open-meteo.com') {
    e.respondWith(fetch(e.request));
    return;
  }

  // App shell: network first, cache fallback for offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
