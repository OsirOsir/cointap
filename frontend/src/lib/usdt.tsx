/**
 * Live KES → USDT conversion.
 *
 * Pulls the rate from CoinGecko (free API, no key required), caches it in
 * localStorage for 10 minutes, and falls back to a hardcoded rate (~1 USDT
 * ≈ 129 KES as of early 2026) if the API is unreachable.
 *
 * Usage:
 *   const rate = useUsdtRate()
 *   <UsdtBadge ksh={2_000_000} />   // → ~15,503 USDT
 */
import { useEffect, useState } from 'react'

const CACHE_KEY = 'cointap_usdt_rate'
const CACHE_TTL_MS = 10 * 60_000   // 10 minutes
const FALLBACK_RATE = 129          // ~1 USDT in KES (Jan 2026 ballpark)

type Cached = { rate: number; fetched_at: number }

let inFlight: Promise<number> | null = null

async function fetchRate(): Promise<number> {
  // CoinGecko: 1 USDT in KES
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=kes'
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('rate fetch failed')
  const data = await res.json()
  const rate = Number(data?.tether?.kes)
  if (!rate || rate <= 0) throw new Error('invalid rate')
  return rate
}

async function getRate(): Promise<number> {
  // Cache check
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as Cached
      if (Date.now() - cached.fetched_at < CACHE_TTL_MS) return cached.rate
    }
  } catch { /* ignore */ }

  // Avoid duplicate concurrent fetches
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const rate = await fetchRate()
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, fetched_at: Date.now() } as Cached))
      } catch { /* quota etc — ignore */ }
      return rate
    } catch {
      return FALLBACK_RATE
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

export function useUsdtRate(): number {
  const [rate, setRate] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const cached = JSON.parse(raw) as Cached
        return cached.rate
      }
    } catch { /* ignore */ }
    return FALLBACK_RATE
  })

  useEffect(() => {
    let cancelled = false
    getRate().then((r) => { if (!cancelled) setRate(r) })
    // Refresh every 10 minutes while mounted
    const t = setInterval(() => {
      getRate().then((r) => { if (!cancelled) setRate(r) })
    }, CACHE_TTL_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  return rate
}

/** Format a USDT amount with up to 2 decimals + thousands separator. */
export function formatUsdt(usdt: number): string {
  if (!isFinite(usdt) || usdt === 0) return '0'
  if (usdt >= 1) return usdt.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return usdt.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

/**
 * Subtle USDT badge — shows next to KSH values for crypto-platform feel.
 * Style variants control color/size to fit different contexts.
 */
export function UsdtBadge({
  ksh,
  size = 'sm',
  variant = 'muted',
  prefix = '≈',
}: {
  ksh: number
  size?: 'xs' | 'sm' | 'md'
  variant?: 'muted' | 'gold' | 'green'
  prefix?: string
}) {
  const rate = useUsdtRate()
  if (!ksh || ksh <= 0 || !rate) return null
  const usdt = ksh / rate

  const sizeCls = size === 'md' ? 'text-sm' : size === 'sm' ? 'text-xs' : 'text-[10px]'
  const color =
    variant === 'gold' ? 'rgba(247,147,26,0.85)' :
    variant === 'green' ? 'rgba(74,222,128,0.85)' :
    'rgba(136,146,164,0.7)'

  return (
    <span
      className={`font-mono ${sizeCls} inline-flex items-center gap-1`}
      style={{ color }}
      title={`Live rate: 1 USDT ≈ ${rate.toFixed(2)} KES`}>
      {prefix} {formatUsdt(usdt)} <span style={{ opacity: 0.7 }}>USDT</span>
    </span>
  )
}
