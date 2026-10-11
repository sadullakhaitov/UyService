// Sayt telefonga ilova bo'lib o'rnatilishi uchun (PWA). Hech narsa keshlamaydi — har doim internetdan
// (yangi versiya darhol ko'rinadi). Keshni Cloudflare va public/_headers boshqaradi
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
