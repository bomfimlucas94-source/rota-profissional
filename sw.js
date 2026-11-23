// Minha Rota: permite instalar o app e abre mesmo com internet fraca.
// Páginas sempre buscam a versão nova primeiro; dados (Supabase) nunca são guardados.
const CACHE = 'minha-rota-v4';
const BASE = ['./index.html', './manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html'))));
});

// Notificações: a Central avisa quando chega rota nova ou atualizada
const ICONE = 'https://sizbevhqreaccxrlimup.supabase.co/storage/v1/object/public/app-icones/icon-192.png';
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Minha Rota', {
    body: d.body || 'Você tem uma atualização na sua rota.', icon: ICONE, badge: ICONE,
    tag: d.tag || 'minha-rota', renotify: true, data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  const pag = new URL(alvo).pathname;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    // primeiro a mesma página (Central ou app do profissional); o app do profissional aceita qualquer janela do Minha Rota
    for (const w of ws) { if (new URL(w.url).pathname === pag) { w.postMessage({ tipo: 'rota-nova', url: alvo }); return w.focus(); } }
    // app do profissional (index) aceita qualquer janela do Minha Rota que não seja a Central nem o app do motorista
    if (!/(central|motorista)\.html$/.test(pag)) for (const w of ws) { if (w.url.startsWith(self.registration.scope) && !/(central|motorista)\.html/.test(w.url)) { w.postMessage({ tipo: 'rota-nova', url: alvo }); return w.focus(); } }
    return self.clients.openWindow(alvo);
  }));
});
