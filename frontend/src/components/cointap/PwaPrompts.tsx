/**
 * PwaPrompts — two small banners managed in one file:
 *
 *  1. <InstallPrompt /> — shows after the browser fires beforeinstallprompt
 *     (Android Chrome / Edge). For iOS Safari, shows a manual instruction
 *     banner since iOS doesn't support beforeinstallprompt.
 *
 *  2. <UpdatePrompt /> — shows when the service worker tells us a new
 *     version is waiting. Tapping "Update" tells the SW to skipWaiting()
 *     and reloads.
 *
 * Both are tiny, dismissable, persisted to localStorage so they don't nag.
 * Rendered globally in App.tsx alongside the chat widget.
 */
import { useEffect, useState } from 'react'
import { Download, X, RefreshCw, Share } from 'lucide-react'
import { UPDATE_EVENT_NAME } from '@/lib/registerSW'

// ────────────────────────────────────────────────────────────────
// Install prompt
// ────────────────────────────────────────────────────────────────

const INSTALL_DISMISSED_KEY = 'cointap_pwa_install_dismissed'
const INSTALL_DISMISSED_DAYS = 14

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true
}

function dismissed(): boolean {
  try {
    const at = localStorage.getItem(INSTALL_DISMISSED_KEY)
    if (!at) return false
    const ms = Date.now() - parseInt(at, 10)
    return ms < INSTALL_DISMISSED_DAYS * 24 * 60 * 60 * 1000
  } catch { return false }
}

function rememberDismiss() {
  try { localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now())) } catch {}
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [showIosTip, setShowIosTip] = useState(false)

  useEffect(() => {
    if (isStandalone() || dismissed()) return

    // Android/Chrome path: capture the install event
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      // Slight delay so the banner doesn't pop in instantly on every visit
      setTimeout(() => setShow(true), 4000)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS path: no event fires, so show a manual tip after a delay if iOS
    let iosTimer: number | undefined
    if (isIos()) {
      iosTimer = window.setTimeout(() => setShowIosTip(true), 6000)
    }

    // If installed, hide prompt
    const onInstalled = () => { setShow(false); setShowIosTip(false); rememberDismiss() }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') {
      setShow(false)
    } else {
      // Dismissed — remember for 2 weeks
      rememberDismiss()
      setShow(false)
    }
    setDeferred(null)
  }

  function dismiss() {
    rememberDismiss()
    setShow(false)
    setShowIosTip(false)
  }

  // ── Android/Chrome banner ──
  if (show && deferred) {
    return (
      <div className="fixed z-40 left-3 right-3 sm:left-auto sm:right-5 sm:w-[360px]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}>
        <div className="rounded-2xl p-4 flex items-center gap-3 animate-slide-up"
          style={{
            background: 'linear-gradient(135deg, #141821 0%, #0a0e1a 100%)',
            border: '1px solid rgba(247,147,26,0.3)',
            boxShadow: '0 20px 50px -15px rgba(0,0,0,0.7)',
          }}>
          <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ background: 'var(--gradient-gold)' }}>
            <Download className="w-5 h-5" style={{ color: 'var(--primary-foreground)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Install CoinTap</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Add to home screen for quick access — works offline too.
            </div>
          </div>
          <button onClick={install}
            className="px-3 py-2 rounded-lg text-xs font-bold flex-shrink-0"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            Install
          </button>
          <button onClick={dismiss} aria-label="Dismiss"
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  // ── iOS manual instruction banner ──
  if (showIosTip) {
    return (
      <div className="fixed z-40 left-3 right-3 sm:left-auto sm:right-5 sm:w-[360px]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}>
        <div className="rounded-2xl p-4 animate-slide-up"
          style={{
            background: 'linear-gradient(135deg, #141821 0%, #0a0e1a 100%)',
            border: '1px solid rgba(247,147,26,0.3)',
            boxShadow: '0 20px 50px -15px rgba(0,0,0,0.7)',
          }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ background: 'var(--gradient-gold)' }}>
              <Download className="w-5 h-5" style={{ color: 'var(--primary-foreground)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Install CoinTap on iPhone</div>
              <div className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Tap <Share className="w-3 h-3 inline mx-0.5" style={{ color: '#0a84ff' }} /> in Safari, then
                <span className="font-semibold"> Add to Home Screen</span>.
              </div>
            </div>
            <button onClick={dismiss} aria-label="Dismiss"
              className="p-1.5 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ────────────────────────────────────────────────────────────────
// Update prompt — shown when a new SW is waiting
// ────────────────────────────────────────────────────────────────

export function UpdatePrompt() {
  const [show, setShow] = useState(false)
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.reg) setReg(detail.reg as ServiceWorkerRegistration)
      setShow(true)
    }
    window.addEventListener(UPDATE_EVENT_NAME, onUpdate as EventListener)
    return () => window.removeEventListener(UPDATE_EVENT_NAME, onUpdate as EventListener)
  }, [])

  function applyUpdate() {
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      // controllerchange in registerSW.ts will reload the page
    } else {
      window.location.reload()
    }
  }

  if (!show) return null

  return (
    <div className="fixed z-50 left-3 right-3 sm:left-auto sm:right-5 sm:w-[360px]"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
      <div className="rounded-2xl p-4 flex items-center gap-3 animate-slide-up"
        style={{
          background: 'linear-gradient(135deg, #141821 0%, #0a0e1a 100%)',
          border: '1px solid rgba(74,222,128,0.4)',
          boxShadow: '0 20px 50px -15px rgba(0,0,0,0.7)',
        }}>
        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(74,222,128,0.15)' }}>
          <RefreshCw className="w-4 h-4 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">New version available</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Reload to get the latest features.
          </div>
        </div>
        <button onClick={applyUpdate}
          className="px-3 py-2 rounded-lg text-xs font-bold flex-shrink-0"
          style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
          Update
        </button>
        <button onClick={() => setShow(false)} aria-label="Later"
          className="p-1.5 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
