import { useEffect, useState } from 'react'
import { Info, CheckCircle2, AlertTriangle, AlertOctagon, X } from 'lucide-react'
import { announcementsApi } from '@/lib/api'

type Announcement = {
  id: number
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'critical'
  is_active: boolean
  created_at: string
}

const STYLES: Record<string, { bg: string; border: string; color: string; Icon: any }> = {
  info: { bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.3)', color: '#38bdf8', Icon: Info },
  success: { bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.3)', color: '#4ade80', Icon: CheckCircle2 },
  warning: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24', Icon: AlertTriangle },
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', Icon: AlertOctagon },
}

/**
 * Shows active platform announcements on user pages.
 * Polls every 60s. Users can dismiss individual announcements
 * (dismissals stored per-id in localStorage so they don't reappear after refresh).
 */
export function AnnouncementsBanner() {
  const [items, setItems] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cointap_dismissed_announcements') || '[]')
    } catch { return [] }
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await announcementsApi.active()
        if (cancelled) return
        setItems(data?.announcements || [])
      } catch { /* silent */ }
    }
    load()
    const t = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  function dismiss(id: number) {
    const next = [...dismissed, id]
    setDismissed(next)
    localStorage.setItem('cointap_dismissed_announcements', JSON.stringify(next))
  }

  const visible = items.filter((a) => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map((a) => {
        const s = STYLES[a.type] || STYLES.info
        return (
          <div key={a.id}
            className="rounded-2xl p-4 flex items-start gap-3 animate-slide-up"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.3)', color: s.color }}>
              <s.Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-sm">{a.title}</div>
              <div className="text-xs mt-0.5 whitespace-pre-wrap" style={{ color: 'var(--muted-foreground)' }}>
                {a.message}
              </div>
            </div>
            <button onClick={() => dismiss(a.id)}
              className="p-1 rounded-lg flex-shrink-0 hover:opacity-70"
              aria-label="Dismiss"
              style={{ color: 'var(--muted-foreground)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
