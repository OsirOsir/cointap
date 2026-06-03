/**
 * PwaPrompts — install + update banners.
 *
 *  1. <InstallPrompt /> — auto-shown bottom-right after delay on platforms
 *     that fire beforeinstallprompt. Also listens for IOS_TIP_EVENT to pop
 *     up the iOS instruction banner when user taps "Install" in the nav.
 *
 *  2. <UpdatePrompt /> — shown when service worker reports a new version.
 *
 * Both are dismissable; install banner is persisted to localStorage so it
 * doesn't keep auto-popping after dismiss.
 */
import { useEffect, useState } from 'react'
import { Download, X, RefreshCw, Share } from 'lucide-react'
import { UPDATE_EVENT_NAME } from '@/lib/registerSW'
import { usePwaInstall, IOS_TIP_EVENT } from '@/lib/usePwaInstall'

const INSTALL_DISMISSED_KEY = 'cointap_pwa_install_dismissed'
const INSTALL_DISMISSED_DAYS = 14

function autoBannerDismissed(): boolean {
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
  const { canInstall, isIos, install } = usePwaInstall()
  const [showAuto, setShowAuto] = useState(false)
  const [showIosManually, setShowIosManually] = useState(false)

  // AUTO-POP: after delay if user hasn't recently dismissed.
  useEffect(() => {
    if (!canInstall) return
    if (autoBannerDismissed()) return
    const delay = isIos ? 6000 : 4000
    const t = window.setTimeout(() => setShowAuto(true), delay)
    return () => clearTimeout(t)
  }, [canInstall, isIos])

  // MANUAL POP: when nav button is tapped on iOS, show instruction banner
  // even if previously dismissed (user just asked for it).
  useEffect(() => {
    const onTap = () => setShowIosManually(true)
    window.addEventListener(IOS_TIP_EVENT, onTap)
    return () => window.removeEventListener(IOS_TIP_EVENT, onTap)
  }, [])

  async function handleInstall() {
    await install()
    setShowAuto(false)
  }

  function dismiss() {
    rememberDismiss()
    setShowAuto(false)
    setShowIosManually(false)
  }

  // ── Android/Chrome banner ──
  if (showAuto && !isIos) {
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
          <button onClick={handleInstall}
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

  // ── iOS instruction banner — shown by auto-pop OR by nav-tap ──
  if (isIos && (showAuto || showIosManually)) {
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
// Update prompt
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
