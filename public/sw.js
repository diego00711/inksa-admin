const CACHE_NAME = 'inksa-admin-v2';
const BACKEND_HEALTH = 'https://inksa-auth-flask-dev.onrender.com/api/health';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request.url.startsWith('http')) return;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return;
  if (request.url.includes('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then(r => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(res => {
        if (res && res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Keep-alive: pinga o backend a cada 10 min para evitar cold start no Render
setInterval(() => {
  fetch(BACKEND_HEALTH, { cache: 'no-store' }).catch(() => {});
}, 10 * 60 * 1000);
