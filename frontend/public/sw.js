/* CoinTap service worker — handles offline shell, smart caching, and updates.
 *
 * Strategy:
 *  - HTML navigations: network-first (always try fresh), fall back to cached
 *    shell if offline.
 *  - Static assets (JS/CSS/img/fonts): cache-first, then network. These have
 *    content-hashed filenames thanks to Vite, so they never go stale.
 *  - API calls: NEVER cached. Always go to network. If offline, fail clearly.
 *  - The cache is keyed by a CACHE_VERSION constant. Bump it whenever the
 *    cache structure changes (rare; usually content-hashed filenames are enough).
 *
 * IMPORTANT: this SW is registered ONLY in production (registerSW.ts checks
 * import.meta.env.PROD). On localhost the SW is unregistered to avoid the
 * classic dev-headache where cached JS shadows your latest source.
 */
const CACHE_VERSION = 'cointap-v1'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const ASSETS_CACHE = `${CACHE_VERSION}-assets`

// Minimal shell — index.html alone is enough. Vite content-hashes the rest,
// which we cache lazily on first request.
const SHELL_URLS = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  // Pre-cache the shell so navigation always works offline
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS).catch(() => {})),
  )
  // Take over immediately so the first install doesn't require a reload
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Delete any old caches from previous versions
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return    // only intercept GETs

  const url = new URL(req.url)

  // ─── API requests: ALWAYS network. Never cache. ──────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(
            JSON.stringify({ ok: false, error: 'You appear to be offline. Reconnect and try again.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    )
    return
  }

  // Skip cross-origin requests (CoinGecko, fonts.googleapis, etc.)
  // Browser handles their own caching headers.
  if (url.origin !== self.location.origin) return

  // ─── HTML navigations: network-first, fall back to shell ─────
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache a copy for offline fallback
          const copy = res.clone()
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy)).catch(() => {})
          return res
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || new Response('Offline', { status: 503 })),
        ),
    )
    return
  }

  // ─── Static assets: cache-first ──────────────────────────────
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((res) => {
          // Only cache successful, basic responses (skip opaque etc.)
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone()
            caches.open(ASSETS_CACHE).then((c) => c.put(req, copy)).catch(() => {})
          }
          return res
        })
        .catch(() => caches.match('/index.html') as Promise<Response>)
    }),
  )
})

// Allow the page to ask us to activate immediately on update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
