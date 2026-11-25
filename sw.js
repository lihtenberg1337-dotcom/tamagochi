const CACHE_NAME = 'medved-tamagochi-v7';
/* Медведь-Тамагочи — service worker: офлайн-запуск PWA и обновление игры.
   При любых правках проекта увеличивай номер версии в CACHE_NAME (v7 -> v8 ...). */
const SHELL = ["./", "./index.html", "./manifest.json", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
});

// Страница просит активировать скачанную версию (кнопка «Обновить»).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Внешние домены (onesignal.com, firebaseio.com / firebasedatabase.app,
  // gstatic.com / googleapis.com) — ТОЛЬКО сеть, без кэша и без офлайн-заглушек.
  // Иначе на iPhone в PWA подхватывается устаревший OneSignal SDK и
  // появляется «АПИ не подключён».
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }

  // Воркер OneSignal и его папку тоже никогда не кэшируем и не подменяем.
  if (url.pathname.indexOf("/push/") >= 0 || /OneSignalSDKWorker\.js$/.test(url.pathname)) {
    return;
  }

  // Страницы — Network First: сначала всегда идём в сеть за свежим index.html
  // (с обходом HTTP-кэша), и только если сети нет — отдаём копию из кэша.
  // Так обновления подхватываются при каждом открытии PWA без ручных действий.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match("./index.html")
            .then((cached) => cached || caches.match("./"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
