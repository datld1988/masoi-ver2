/* Service Worker tối giản — chỉ để PWA install prompt trigger.
   KHÔNG cache tài nguyên game (WS + logic động, cache dễ vỡ). Nếu sau cần offline
   thì mở rộng: precache static asset (icon, manifest, role-art.js), pass-through cho WS. */
const SW_VERSION = 'masoi-sw-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  /* Pass-through: để network xử lý mọi request. Tồn tại handler này là điều kiện
     để Chrome/Edge coi là "installable PWA". */
  return;
});
