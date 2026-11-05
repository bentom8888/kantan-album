// かんたん画像アルバム スマホ版 v0.7.3 サービスワーカー
// アプリの外枠（画面・プログラム）を端末に保存し、オフラインでも起動できるようにする。
// アルバムの画像データはここでは扱わない（app.js が IndexedDB に保存）。
const CACHE = "kaa-shell-0.7.3";
const SHELL = ["./", "./index.html", "./app.js", "./album-view.js", "./config.js", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("kaa-shell-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// 同じサイト内のファイルだけ扱う。保存済みを先に返し、裏で最新版に入れ替える。
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === "navigate" ? "./index.html" : req;
    const cached = await cache.match(key, {ignoreSearch: true});
    // オフライン中は通信しない（iPadで「機内モードをオフに…」の案内が出るのを防ぐ）
    const offline = self.navigator && self.navigator.onLine === false;
    const network = offline ? Promise.resolve(null) : fetch(req).then(res => {
      if (res && res.ok && res.type === "basic") cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    const res = await network;
    return res || new Response("オフラインです", {status: 503, headers: {"Content-Type": "text/plain; charset=utf-8"}});
  })());
});
