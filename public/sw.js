// sw.js - Service Worker corrigé pour "90 secondes avec Pasteur D"

const CACHE_NAME = 'v15'; // Incrémentez la version
const SPLASH_CACHE = 'splash-v4';

// Assets à mettre en cache (URLs valides uniquement)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/admin.html',
  '/login.html',
  '/css/styles.css',
  '/js/scripts.js',
  '/js/splashes.js',
  '/js/modules/firebase-init.js',
  '/js/modules/index-app.js',
  '/images/logo.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/manifest.json'
];

// Assets externes (à mettre en cache séparément)
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap'
];

// Installation - Gestion des erreurs améliorée
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache les assets internes avec gestion d'erreur
        const cachePromises = ASSETS_TO_CACHE.map(async (url) => {
          try {
            await cache.add(url);
            console.log('✓ Cached:', url);
          } catch (error) {
            console.warn('✗ Failed to cache:', url, error);
            // Continue même si une ressource échoue
          }
        });

        await Promise.allSettled(cachePromises);
        
        // Cache les assets externes séparément
        const externalCache = await caches.open('external-v1');
        const externalPromises = EXTERNAL_ASSETS.map(async (url) => {
          try {
            await externalCache.add(url);
            console.log('✓ Cached external:', url);
          } catch (error) {
            console.warn('✗ Failed to cache external:', url, error);
          }
        });

        await Promise.allSettled(externalPromises);
        
        console.log('Service Worker installé avec succès');
      } catch (error) {
        console.error('Erreur lors de l\'installation:', error);
      }
    })()
  );
  
  // Force l'activation immédiate
  self.skipWaiting();
});

// Fetch - Stratégie améliorée
self.addEventListener('fetch', (event) => {
  // Ignore les requêtes non-HTTP
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Essayer le cache d'abord
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }

        // Sinon, aller sur le réseau
        const networkResponse = await fetch(event.request);
        
        // Mettre en cache les requêtes GET réussies
        if (networkResponse.status === 200 && event.request.method === 'GET') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // Fallback pour les pages principales
        if (event.request.destination === 'document') {
          const cache = await caches.open(CACHE_NAME);
          const fallback = await cache.match('/index.html');
          if (fallback) {
            return fallback;
          }
        }
        
        // Retourner une réponse d'erreur générique
        return new Response('Ressource non disponible hors ligne', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    })()
  );
});

// Activation - Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Active le Service Worker immédiatement
      await self.clients.claim();
      
      // Nettoie les anciens caches
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames.map(cacheName => {
        if (cacheName !== CACHE_NAME && cacheName !== SPLASH_CACHE && cacheName !== 'external-v1') {
          console.log('Suppression de l\'ancien cache:', cacheName);
          return caches.delete(cacheName);
        }
      });
      
      await Promise.all(deletePromises);
      console.log('Service Worker activé et caches nettoyés');
    })()
  );
});

// Gestion des messages depuis la page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});