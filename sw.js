// 개발/테스트 단계에서 "옛날 파일이 캐시되어 안 바뀌는" 문제를 막기 위해
// 당분간 캐싱을 하지 않습니다. (fetch 이벤트를 가로채지 않음 = 항상 최신 파일)
// 완성되어 더 이상 자주 안 바뀔 때 오프라인 캐싱을 다시 추가하면 됩니다.

const CACHE_NAME = "pixelbatch-v3-nocache";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});
