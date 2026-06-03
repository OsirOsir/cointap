/**
 * <LiveNumber> — gives a static number a "trading floor" feel.
 *
 *  - Smoothly rolls between values when `value` changes (real underlying value).
 *  - Optional `jitter` — applies a tiny cosmetic fluctuation (±jitter * value)
 *    every ~1.5–2s on top of the real value, so digits visibly move.
 *  - Optional `pulse` — shows a small green pulse dot next to the number.
 *
 * SACRED RULE: jitter is COSMETIC only. The component remembers the true
 * `value` prop and re-anchors to it every cycle. It also re-anchors to
 * truth whenever the prop changes from outside.
 *
 * Use for public/market-style displays (pool balance, share price, total
 * platform invested, etc.). NEVER use for personal balances, transactions,
 * wallets, withdrawal amounts, or anything tied to a user's money.
 */
import { useEffect, useRef, useState } from 'react'

interface LiveNumberProps {
  /** The real, truthful value the component represents. */
  value: number
  /** Cosmetic fluctuation factor. 0.0005 = ±0.05% wobble. Default 0 (off). */
  jitter?: number
  /** How often the jitter recomputes (ms). Default 1800. */
  jitterInterval?: number
  /** How long a roll animation takes (ms). Default 900. */
  rollMs?: number
  /** Decimal places. Default 0. */
  decimals?: number
  /** Optional prefix (e.g. "Ksh ", "$"). */
  prefix?: string
  /** Optional suffix. */
  suffix?: string
  /** Show a green pulse dot next to the number. */
  pulse?: boolean
  className?: string
  style?: React.CSSProperties
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function fmt(n: number, decimals: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function LiveNumber({
  value,
  jitter = 0,
  jitterInterval = 1800,
  rollMs = 900,
  decimals = 0,
  prefix = '',
  suffix = '',
  pulse = false,
  className,
  style,
}: LiveNumberProps) {
  // The number currently *displayed* (may include jitter)
  const [displayed, setDisplayed] = useState(value)

  // The "anchor": the value we believe is real, modulo any in-flight roll
  const anchorRef = useRef(value)
  const rollFromRef = useRef(value)
  const rollStartRef = useRef<number | null>(null)
  const rollToRef = useRef(value)
  const noisePhaseRef = useRef(0)   // slowly drifting noise component

  // Roll animation when `value` prop changes
  useEffect(() => {
    if (value === anchorRef.current) return
    rollFromRef.current = displayed                  // roll from currently-shown
    rollToRef.current = value
    rollStartRef.current = performance.now()
    anchorRef.current = value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Master animation loop — runs every frame continuously while mounted.
  // This produces a true "ticker" feeling where the digits are always in
  // gentle motion, not just snapping to a new value every interval.
  useEffect(() => {
    let raf: number | null = null
    let cancelled = false

    function tick() {
      if (cancelled) return
      const now = performance.now()
      let next = anchorRef.current

      // Roll progress (when real value changes)
      if (rollStartRef.current !== null) {
        const elapsed = now - rollStartRef.current
        const t = Math.min(1, elapsed / rollMs)
        const eased = easeOutCubic(t)
        next = rollFromRef.current + (rollToRef.current - rollFromRef.current) * eased
        if (t >= 1) rollStartRef.current = null
      }

      // Layer jitter on top (cosmetic — never modifies the anchor)
      // Multi-frequency sine waves + slowly drifting noise = continuous,
      // organic-looking motion that doesn't look mechanical.
      if (jitter > 0 && rollStartRef.current === null) {
        const t1 = Math.sin(now / 1400) * jitter * 0.5
        const t2 = Math.sin(now / 530) * jitter * 0.3
        const t3 = Math.sin(now / 230) * jitter * 0.2
        // Smoothly drifting noise (not pure random — feels more natural)
        noisePhaseRef.current += (Math.random() - 0.5) * jitter * 0.15
        // Decay toward zero so it doesn't drift away from anchor
        noisePhaseRef.current *= 0.94
        next = anchorRef.current * (1 + t1 + t2 + t3 + noisePhaseRef.current)
      }

      setDisplayed(next)

      // Always keep ticking, but pause if tab is hidden (save CPU)
      if (document.visibilityState === 'visible') {
        raf = requestAnimationFrame(tick)
      } else {
        // Resume when tab becomes visible
        const onVis = () => {
          document.removeEventListener('visibilitychange', onVis)
          if (!cancelled) raf = requestAnimationFrame(tick)
        }
        document.addEventListener('visibilitychange', onVis)
      }
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [jitter, rollMs])

  return (
    <span className={className} style={style}>
      {pulse && (
        <span
          aria-hidden
          className="inline-block mr-2 align-middle"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 8px rgba(74,222,128,0.6)',
            animation: 'live-pulse 1.6s ease-in-out infinite',
          }}
        />
      )}
      {prefix}{fmt(displayed, decimals)}{suffix}
    </span>
  )
}
