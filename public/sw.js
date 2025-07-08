// sw.js - Service Worker pour "90 secondes avec Pasteur D"

const CACHE_NAME = 'v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/admin.html',
  '/login.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/images/logo.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/manifest.json'
];

const splashAssets = [
  '/splash/desktop/portrait.png',
  '/splash/desktop/landscape.png',
  '/splash/ios/iphone-portrait.png',
  // Ajoutez toutes les autres variantes
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
  if (event.request.url.includes('/splash/')) {
    event.respondWith(caches.match(event.request));
  }
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json() || { 
    title: "Nouvelle réponse", 
    body: "Pasteur D. a répondu à une question",
    data: { questionId: '' }
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/images/icon-192x192.png',
      data: payload.data
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = `/?question=${event.notification.data?.questionId || ''}`;
  event.waitUntil(
    clients.openWindow(url)
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('splash-v2').then((cache) => {
      return cache.addAll([...splashAssets, '/images/logo.png']);
    })
  );
});