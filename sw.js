// sw.js - Rythmo service worker (phase 1: lets the installed app show notifications; no offline cache).
// Paths are relative to this file, so it works under /Rythmo/ or /rythmo/ alike.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// TODO phase 2 (see notifications.md, section 5): Web Push via the Cloudflare Worker (VAPID, D1, cron).
// When that exists, every push MUST show a notification right away (required on iOS).
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (_) {}
  event.waitUntil(self.registration.showNotification(d.title || 'Rythmo', {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    tag: d.tag || 'rythmo', data: { url: d.url || './#plan' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return; // "Ignorer": costs nothing
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { await c.focus(); if ('navigate' in c) { try { await c.navigate(url); } catch (_) {} } return; } }
    await self.clients.openWindow(url);
  })());
});
