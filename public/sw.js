const CACHE_NAME = 'kumadai-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/style.css',
    '/js/main.js',
    '/js/api.js',
    '/js/constants.js',
    '/js/store.js',
    '/js/syllabus.js',
    '/js/ui/elements.js',
    '/js/ui/grid.js',
    '/js/ui/filters.js',
    '/js/ui/search.js',
    '/js/utils/export.js',
    '/js/utils/filters.js',
    '/js/utils/share.js',
    '/js/utils/print.js',
    '/js/utils/calendar.js',
    '/data/lectures.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// HTML/JS/CSS はネットワーク優先（更新を確実に反映）、それ以外はキャッシュ優先（高速・オフライン用）
function isFreshFirst(request, url) {
    return request.mode === 'navigate'
        || url.pathname.endsWith('.js')
        || url.pathname.endsWith('.css')
        || url.pathname.endsWith('.html');
}

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    // 別オリジン（CDN等）はブラウザ既定に任せる
    if (url.origin !== self.location.origin) return;

    if (isFreshFirst(request, url)) {
        event.respondWith(
            fetch(request)
                .then(resp => {
                    const copy = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    return resp;
                })
                .catch(() => caches.match(request))
        );
    } else {
        event.respondWith(
            caches.match(request).then(cached =>
                cached || fetch(request).then(resp => {
                    const copy = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
                    return resp;
                })
            )
        );
    }
});
