/**
 * Register the service worker.
 *
 * - Only runs in production builds (Vite sets import.meta.env.PROD = true).
 *   On localhost dev, we *un-register* any previous SW so you don't get
 *   stuck with cached JS while developing.
 * - When a new SW is installed and waiting (i.e. a deploy happened while
 *   the user had the app open), we emit a 'cointap-update-available'
 *   custom event. The UpdatePrompt component listens for it and shows the
 *   "New version available" banner.
 */
const UPDATE_EVENT = 'cointap-update-available'

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  // DEV: blow away any previously installed SW so dev hot-reload always works
  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => {}))
    })
    return
  }

  // PROD: register
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // If there's already a waiting worker on first load, notify immediately
        if (reg.waiting) emitUpdate(reg)

        // Listen for updates that come in while the page is open
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // A new SW is installed and an old one is controlling the page
              // (otherwise this is the very first install — no notification needed)
              emitUpdate(reg)
            }
          })
        })
      })
      .catch(() => {
        // SW couldn't register — fine, app still works without offline support
      })

    // Reload once the new SW takes control (after user accepts the update)
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  })
}

function emitUpdate(reg: ServiceWorkerRegistration) {
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { reg } }))
}

export const UPDATE_EVENT_NAME = UPDATE_EVENT
