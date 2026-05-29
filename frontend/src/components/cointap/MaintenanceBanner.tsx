import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { settingsApi } from '@/lib/api'

/**
 * Polls /api/settings every 30s. If maintenance_mode is on, renders a top
 * banner site-wide. Returns null otherwise (zero visual impact).
 */
export function MaintenanceBanner() {
  const [on, setOn] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const data = await settingsApi.get()
        const s = data?.settings
        if (cancelled) return
        if (s?.maintenance_mode) {
          setOn(true)
          setMessage(s.maintenance_message || 'Maintenance in progress.')
        } else {
          setOn(false)
        }
      } catch {
        // silently ignore — endpoint may be unreachable temporarily
      }
    }
    check()
    const t = setInterval(check, 30000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (!on) return null

  return (
    <div className="sticky top-0 z-[60] px-4 py-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold animate-slide-up"
      style={{
        background: 'linear-gradient(90deg, #fbbf24, #f7931a, #fbbf24)',
        color: '#0a0e1a',
        boxShadow: '0 2px 12px -2px rgba(247,147,26,0.5)',
      }}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="text-center">{message}</span>
    </div>
  )
}
