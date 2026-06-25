// MK Studio 서비스 워커 — 설치 가능(installable) 조건용 최소 SW.
// 앱 셸 정적 자산만 가볍게 캐시, API/문서는 항상 네트워크 우선.
const CACHE = "mk-studio-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // API·인증·외부 도메인은 캐시하지 않고 네트워크로 통과
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api")) {
    return;
  }

  // 정적 자산: 캐시 우선, 없으면 네트워크 후 캐시
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/studio/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // 문서·기타: 네트워크 우선, 실패 시 캐시 폴백
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
