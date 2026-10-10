// Offline-friendly: stale-while-revalidate for same-origin GETs. Relative scope (works on GitHub Pages subpath).
var V = 'cozumel-v3';
self.addEventListener('install', function (e) { e.waitUntil(caches.open(V).then(function (c) { return c.addAll(['./', 'index.html', 'css/app.css', 'css/tokens.css', 'js/app.js', 'js/config.js','js/merge.js', 'content/lessons.json', 'content/lessons/lesson-01.json', 'assets/scene.svg','content/images/bien-gracias.svg','content/images/buenas-noches.svg','content/images/buenas-tardes.svg','content/images/buenos-dias.svg','content/images/como-esta.svg','content/images/con-permiso.svg','content/images/cuanto-cuesta.svg','content/images/de-nada.svg','content/images/gracias.svg','content/images/hola.svg','content/images/mande.svg','content/images/perdon.svg','content/images/por-favor.svg']); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.pathname.indexOf('/api/') >= 0) return; if (u.origin !== location.origin && u.hostname.indexOf('fonts.g') !== 0) return;
  e.respondWith(caches.open(V).then(function (c) { return c.match(r).then(function (hit) {
    var net = fetch(r).then(function (res) { if (res && res.ok) c.put(r, res.clone()); return res; }).catch(function () { return hit; });
    return hit || net;
  }); }));
});
