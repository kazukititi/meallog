const CACHE = "meallog-v2";
const FILES = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "icon-180.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  // 同じサイトのファイル：ネット優先（更新がすぐ反映）、圏外ならキャッシュ
  if (u.origin === location.origin) {
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const c = res.clone(); caches.open(CACHE).then(ch => ch.put(r, c)); }
        return res;
      }).catch(() => caches.match(r).then(h => h || caches.match("index.html")))
    );
    return;
  }
  // 通信ライブラリだけキャッシュ（圏外でもログイン処理を使えるように）
  if (u.hostname === "cdn.jsdelivr.net" && u.pathname.includes("@supabase/supabase-js")) {
    e.respondWith(
      caches.match(r).then(h => {
        const f = fetch(r).then(res => { caches.open(CACHE).then(ch => ch.put(r, res.clone())); return res; }).catch(() => h);
        return h || f;
      })
    );
  }
  // Supabaseへの通信などはそのまま通す（キャッシュしない）
});
