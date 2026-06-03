/**
 * usePwaInstall — single source of truth for PWA install state.
 *
 * Exposes:
 *  - canInstall   true when the browser supports installation AND it's not
 *                 already installed (covers both Android beforeinstallprompt
 *                 path and iOS Safari).
 *  - isIos        true on iOS Safari (we show a manual instruction tip there
 *                 since iOS doesn't fire beforeinstallprompt).
 *  - isStandalone true if running as installed PWA already.
 *  - install()    triggers the right install flow for the current platform.
 *
 * The hook also dispatches the 'cointap-show-ios-tip' event so the iOS
 * instruction banner can listen and pop up when the user taps the install
 * button from anywhere in the app (e.g. bottom nav).
 */
import { useEffect, useState, useCallback } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const IOS_TIP_EVENT = 'cointap-show-ios-tip'

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(detectStandalone())
  const isIos = detectIos()

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setIsStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (deferred) {
      // Android/Chrome path
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') setDeferred(null)
      return
    }
    if (isIos) {
      // iOS path — surface the manual instruction banner
      window.dispatchEvent(new CustomEvent(IOS_TIP_EVENT))
    }
  }, [deferred, isIos])

  // canInstall: we have a real deferred prompt, OR we're on iOS (where we
  // surface manual instructions). And not already installed.
  const canInstall = !isStandalone && (deferred !== null || isIos)

  return { canInstall, isIos, isStandalone, install }
}
