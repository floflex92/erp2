const CACHE_NAME = 'nexora-truck-v1-6-13'
const APP_SHELL = ['/', '/index.html', '/site.webmanifest', '/favicon.ico', '/site/logo/favicon/favicon-16x16.png', '/site/logo/favicon/favicon-32x32.png', '/site/logo/favicon/apple-touch-icon.png', '/site/logo/favicon/android-chrome-192x192.png', '/site/logo/favicon/android-chrome-512x512.png', '/pwa-192.png', '/pwa-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  // Vite hashed assets should be served from network first to avoid stale chunk loading.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone()
            void caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone))
          }
          return response
        })
        .catch(() => caches.match(event.request)),
    )
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone()
          void caches.open(CACHE_NAME).then(cache => cache.put('/index.html', responseClone))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const networkResponse = fetch(event.request)
          .then(response => {
            if (response.ok) {
              const responseClone = response.clone()
              void caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone))
            }
            return response
          })
          .catch(() => cachedResponse)

        return cachedResponse ?? networkResponse
      }),
    )
    return
  }

  // Default: network first for API-like/static requests to reduce stale data risk.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone()
          void caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})