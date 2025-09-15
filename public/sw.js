// sw.js - Service Worker optimisé pour "90 secondes avec Pasteur D"

// Vérifie si la requête doit être ignorée
function shouldIgnoreRequest(request) {
  return [
    'chrome-extension:',
    'safari-extension:',
    'moz-extension:',
    'ms-browser-extension:'
  ].some(scheme => request.url.startsWith(scheme));
}

const CACHE_NAME = 'v8'; // Incrémentez la version
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/admin.html',
  '/login.html',
  '/css/styles.css',
  '/css/admin-styles.css',
  '/js/scripts.js',
  '/js/splashes.js',
  '/js/modules/firebase-init.js',
  '/js/modules/index-app.js',
  '/js/modules/admin-app.js',
  '/images/logo.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js'
];

const SPLASH_CACHE = 'splash-v3';
const splashAssets = [
  '/splash/desktop/portrait.png',
  '/splash/desktop/landscape.png',
  '/splash/ios/iphone-portrait.png',
  '/splash/ios/ipad-portrait.png',
  '/splash/ios/iphone-landscape.png',
  '/splash/ios/ipad-landscape.png',
  '/splash/android/phone-portrait.png',
  '/splash/android/tablet-portrait.png',
  '/splash/android/phone-landscape.png',
  '/splash/android/tablet-landscape.png'
  // Ajoutez toutes les autres variantes
];

// Stratégie: Cache First, avec fallback réseau
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(ASSETS_TO_CACHE)),
      caches.open(SPLASH_CACHE)
        .then(cache => cache.addAll([...splashAssets, '/images/logo.png']))
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (shouldIgnoreRequest(event.request)) {
    return;
  }

  const url = new URL(event.request.url);

  // Traitement prioritaire du CSS
  if (url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          
          return fetch(event.request)
            .then(response => {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone));
              return response;
            })
            .catch(() => {
              // Fallback minimaliste si tout échoue
              return new Response(
                'body { visibility: visible !important; }',
                { headers: { 'Content-Type': 'text/css' } }
              );
            });
        })
    );
    return;
  }

  // Gestion spéciale pour les splash screens
  if (event.request.url.includes('/splash/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
    return;
  }
  
  // Autoriser les requêtes vers gstatic.com et googleapis.com
  if (url.hostname.includes('gstatic.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stratégie: Network First avec fallback Cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Ne met en cache que les requêtes HTTP GET réussies
        if (event.request.method === 'GET' && 
            event.request.url.startsWith('http') &&
            !event.request.url.includes('chrome-extension')) {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Gestion des notifications push
// self.addEventListener('push', (event) => {
//   const payload = event.data?.json() || { 
//     title: "Nouvelle réponse", 
//     body: "Pasteur D. a répondu à une question",
//     data: { questionId: '' }
//   };

//   event.waitUntil(
//     self.registration.showNotification(payload.title, {
//       body: payload.body,
//       icon: '/images/icon-192x192.png',
//       badge: '/images/icon-192x192.png',
//       data: payload.data,
//       vibrate: [200, 100, 200]
//     })
//   );
// });

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = `/?question=${event.notification.data?.questionId || ''}`;
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME && cache !== SPLASH_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});