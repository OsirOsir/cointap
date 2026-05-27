import { useEffect, useState } from 'react'

export function Countdown({ target, onComplete }: { target: number; onComplete?: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = Math.max(0, target - now)
  useEffect(() => { if (diff === 0) onComplete?.() }, [diff, onComplete])

  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const seg = (n: number) => n.toString().padStart(2, '0')

  if (diff === 0) {
    return (
      <div className="text-xs font-mono px-3 py-1.5 rounded-lg text-green-400"
        style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
        MATURED
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 font-mono">
      {[{ v: seg(d), l: 'D' }, { v: seg(h), l: 'H' }, { v: seg(m), l: 'M' }, { v: seg(s), l: 'S' }].map((p, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="px-2 py-1 rounded-md text-sm font-bold min-w-[34px] text-center"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(247,147,26,0.2)', color: 'var(--primary)' }}>
            {p.v}
          </div>
          <span className="text-[9px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{p.l}</span>
        </div>
      ))}
    </div>
  )
}
