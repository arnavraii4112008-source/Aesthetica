// Cache ka naam aur version (Jab bhi app update karein, isko v2, v3 kar dein)
const CACHE_NAME = 'aesthetica-superapp-v1';

// Wo files jo install hote hi phone ki memory mein save ho jayengi
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon.svg'
];

// 1. INSTALL EVENT - Assets ko pehli baar mein cache (download) karna
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching Core Assets...');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Service worker ko turant activate karne ke liye
    self.skipWaiting();
});

// 2. ACTIVATE EVENT - Purane versions (kachra) ko delete karna
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting Old Cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. FETCH EVENT - Network-First Strategy (Real-time data pehle, Offline data baad mein)
self.addEventListener('fetch', (event) => {
    // API calls aur POST requests ko cache nahi karna chahiye
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Agar response theek hai, toh usko cache mein update kar do future ke liye
                const responseToCache = response.clone();
                
                // Chrome extensions ya ad-blockers ke errors ko cache mein aane se rokna
                if(!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            })
            .catch(() => {
                // AGAR INTERNET OFF HAI: Cache se purana saved data nikaal kar dikhao
                console.log('[Service Worker] Network failed, serving from Cache.');
                return caches.match(event.request);
            })
    );
});
