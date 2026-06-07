import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Zap, ArrowDownToLine, Flame, TrendingUp, Activity, Droplets,
  Users as UsersIcon, ArrowDownRight, ArrowUpRight, PiggyBank, BarChart3,
} from 'lucide-react'
import { formatKsh, useStore } from '@/lib/cointap-store'
import { walletApi } from '@/lib/api'
import { Countdown } from '@/components/cointap/Countdown'
import { NodeBackground } from '@/components/cointap/NodeBackground'
import { EmailVerificationBanner } from '@/components/cointap/Security'
import { AnnouncementsBanner } from '@/components/cointap/AnnouncementsBanner'
import { UsdtBadge } from '@/lib/usdt'
import { LiveNumber } from '@/components/cointap/LiveNumber'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

// ─── Donut colors for portfolio allocation chart ──────────────────
// Cycled in order — first plan gets gold, second purple, etc.
const ALLOCATION_COLORS = ['#f5a623', '#7c3aed', '#fbbf24', '#06b6d4', '#10b981', '#ef4444']

// Generate fake sparkline data
const sparkline = (seed: number, trending: 'up' | 'down') => {
  const arr = [] as { i: number; v: number }[]
  let v = 50
  for (let i = 0; i < 20; i++) {
    const drift = trending === 'up' ? 0.5 : -0.3
    v += (Math.sin(seed + i * 0.7) * 3) + drift + (Math.random() - 0.5) * 2
    arr.push({ i, v })
  }
  return arr
}

// ─── LIVE MARKET TICKER ───────────────────────────────────────────
// Real BTC/ETH/SOL/BNB prices fetched from CoinGecko, smoothly animated
// with continuous jitter + a scrolling sparkline that updates every ~1.5s.
type Coin = {
  symbol: string
  pair: string
  id: string         // CoinGecko id
  color: string
  baseChange: number // 24h change %, refreshed from API
}
const COINS: Coin[] = [
  { symbol: 'BTC', pair: 'USDT', id: 'bitcoin',  color: '#f7931a', baseChange: 2.60 },
  { symbol: 'ETH', pair: 'USDT', id: 'ethereum', color: '#627eea', baseChange: 1.10 },
  { symbol: 'SOL', pair: 'USDT', id: 'solana',   color: '#14f195', baseChange: -0.85 },
  { symbol: 'BNB', pair: 'USDT', id: 'binancecoin', color: '#f3ba2f', baseChange: 0.45 },
]
// Fallback values used until the first CoinGecko fetch resolves
const FALLBACK_PRICES: Record<string, number> = {
  bitcoin: 67548.9, ethereum: 3504.7, solana: 180.7, binancecoin: 612.3,
}

const SPARK_LEN = 24   // number of points visible
const SPARK_TICK_MS = 1500  // how often we append a new point

const marketCoins = [
  { symbol: 'BTC', pair: 'USDT', price: 67548.9, change: 2.60, trend: 'up' as const, color: '#f7931a', spark: sparkline(1, 'up') },
  { symbol: 'ETH', pair: 'USDT', price: 3504.7, change: 1.10, trend: 'up' as const, color: '#627eea', spark: sparkline(2, 'up') },
  { symbol: 'SOL', pair: 'USDT', price: 180.7, change: -0.85, trend: 'down' as const, color: '#14f195', spark: sparkline(3, 'down') },
  { symbol: 'BNB', pair: 'USDT', price: 612.3, change: 0.45, trend: 'up' as const, color: '#f3ba2f', spark: sparkline(4, 'up') },
]

// ─── LIVE MARKET CARD ────────────────────────────────────────────
function LiveMarketCard({ coin, basePrice, change }: {
  coin: Coin
  basePrice: number    // anchor price (refreshed from API every 60s)
  change: number       // 24h % change (refreshed from API every 60s)
}) {
  // Current "live" price — anchored to basePrice with continuous jitter
  const [livePrice, setLivePrice] = useState(basePrice)
  // Rolling sparkline buffer
  const [spark, setSpark] = useState(() => {
    const arr: { i: number; v: number }[] = []
    for (let i = 0; i < SPARK_LEN; i++) arr.push({ i, v: basePrice })
    return arr
  })

  // When basePrice changes (API refresh), re-anchor everything
  const basePriceRef = useRef(basePrice)
  useEffect(() => { basePriceRef.current = basePrice }, [basePrice])

  // Continuous price jitter — same approach as LiveNumber. ±0.08% feels alive
  // but realistic for major coins on a 1.5s scale.
  useEffect(() => {
    let raf: number | null = null
    let cancelled = false
    const phase = { v: 0 }
    function tick() {
      if (cancelled) return
      const now = performance.now()
      const anchor = basePriceRef.current
      const jitter = 0.0008
      const t1 = Math.sin(now / 1300) * jitter * 0.5
      const t2 = Math.sin(now / 470) * jitter * 0.3
      const t3 = Math.sin(now / 210) * jitter * 0.2
      phase.v = phase.v * 0.94 + (Math.random() - 0.5) * jitter * 0.15
      setLivePrice(anchor * (1 + t1 + t2 + t3 + phase.v))
      if (document.visibilityState === 'visible') {
        raf = requestAnimationFrame(tick)
      } else {
        const onVis = () => {
          document.removeEventListener('visibilitychange', onVis)
          if (!cancelled) raf = requestAnimationFrame(tick)
        }
        document.addEventListener('visibilitychange', onVis)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf) }
  }, [])

  // Sparkline: every SPARK_TICK_MS, append current livePrice and shift left.
  // Use a ref-snapshot so the interval can read fresh price without re-subscribing.
  const livePriceRef = useRef(livePrice)
  useEffect(() => { livePriceRef.current = livePrice }, [livePrice])
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setSpark((prev) => {
        const next = prev.slice(1)
        next.push({ i: (prev[prev.length - 1]?.i ?? 0) + 1, v: livePriceRef.current })
        return next
      })
    }, SPARK_TICK_MS)
    return () => clearInterval(id)
  }, [])

  const up = change >= 0
  const accent = up ? '#4ade80' : '#ef4444'
  const decimals = livePrice < 100 ? 2 : 1

  return (
    <div className="flex-shrink-0 w-[180px] rounded-2xl p-3 group hover:scale-[1.02] transition-transform cursor-pointer"
      style={{
        background: 'rgba(10,14,26,0.6)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}>
      {/* Top: ticker */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: accent }} />
        <span className="font-bold text-white text-sm">{coin.symbol}</span>
        <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
          /{coin.pair}
        </span>
      </div>

      {/* Price + change */}
      <div className="mt-2 flex items-baseline justify-between gap-1">
        <div className="font-mono font-bold text-white text-base truncate tabular-nums">
          ${livePrice.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        {up
          ? <ArrowUpRight className="w-3 h-3" style={{ color: accent }} />
          : <ArrowDownRight className="w-3 h-3" style={{ color: accent }} />}
        <span className="text-xs font-bold font-mono"
          style={{ color: accent }}>
          {up ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>

      {/* Sparkline — rolling */}
      <div className="mt-2 h-8 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark}>
            <Line type="monotone" dataKey="v"
              stroke={accent}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────
export function Dashboard() {
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const wallet = useStore((s) => s.wallet)
  const orders = useStore((s) => s.orders)
  const pool = useStore((s) => s.pool)
  const referrals = useStore((s) => s.referral_earnings)
  const active = orders.filter((o) => o.status === 'active')

  const totalProfit = wallet.total_earned
  const roi = wallet.total_deposited > 0 ? ((totalProfit / wallet.total_deposited) * 100).toFixed(1) : '0'
  const totalInvested = active.reduce((sum, o) => sum + o.amount_invested, 0)

  // Simulate live block number
  const [block, setBlock] = useState(842193)
  useEffect(() => {
    const t = setInterval(() => setBlock((b) => b + 1), 12000)
    return () => clearInterval(t)
  }, [])

  // ─── Per-user analytics ─────────────────────────────────────────
  // Real portfolio history, earnings, and allocation derived from this
  // user's actual transactions and orders. Refreshes every 60s silently.
  const [portfolioPoints, setPortfolioPoints] = useState<{ label: string; value: number }[]>([])
  const [earningsPoints, setEarningsPoints] = useState<{ label: string; earned: number }[]>([])
  const [allocSegments, setAllocSegments] = useState<{
    plan_id: number; name: string; amount: number; count: number; percent: number
  }[]>([])
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadAnalytics() {
      try {
        const [hist, earn, alloc] = await Promise.all([
          walletApi.portfolioHistory(),
          walletApi.earningsByDay(),
          walletApi.portfolioAllocation(),
        ])
        if (cancelled) return
        setPortfolioPoints(hist.points || [])
        setEarningsPoints(earn.points || [])
        setAllocSegments(alloc.segments || [])
        setAnalyticsLoaded(true)
      } catch (e) {
        // Silent failure — empty states will render. We don't want
        // analytics errors to break the rest of the dashboard.
        setAnalyticsLoaded(true)
      }
    }
    loadAnalytics()
    const t = setInterval(loadAnalytics, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // Derived: has the user earned anything this week?
  const totalEarnedThisWeek = earningsPoints.reduce((sum, p) => sum + p.earned, 0)

  // Live market prices — fetch real BTC/ETH/SOL/BNB from CoinGecko every 60s.
  // Falls back to seed values until first response arrives.
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>(FALLBACK_PRICES)
  const [marketChanges, setMarketChanges] = useState<Record<string, number>>(
    () => Object.fromEntries(COINS.map((c) => [c.id, c.baseChange]))
  )
  useEffect(() => {
    let cancelled = false
    async function fetchPrices() {
      try {
        const ids = COINS.map((c) => c.id).join(',')
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const prices: Record<string, number> = {}
        const changes: Record<string, number> = {}
        for (const c of COINS) {
          const d = data[c.id]
          if (d && typeof d.usd === 'number') prices[c.id] = d.usd
          if (d && typeof d.usd_24h_change === 'number') changes[c.id] = d.usd_24h_change
        }
        if (Object.keys(prices).length > 0) setMarketPrices((prev) => ({ ...prev, ...prices }))
        if (Object.keys(changes).length > 0) setMarketChanges((prev) => ({ ...prev, ...changes }))
      } catch { /* offline / rate-limited — keep last values */ }
    }
    fetchPrices()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchPrices()
    }, 60000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <div className="space-y-5 pb-10">
      <AnnouncementsBanner />
      {user && !user.email_verified && (
        <EmailVerificationBanner onVerify={() => navigate('/verify-email')} />
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HERO — Total Portfolio Value with live network graphic */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden animate-slide-up"
        style={{ minHeight: 380, border: '1px solid rgba(247,147,26,0.15)' }}>
        {/* Animated network background */}
        <div className="absolute inset-0 opacity-70">
          <NodeBackground density={14} opacity={0.7} />
        </div>

        {/* Top-right radial glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(247,147,26,0.15) 0%, transparent 70%)' }} />

        <div className="relative z-10">
          {/* Top row: NETWORK · LIVE + block number */}
          <div className="flex items-center justify-between mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-green-400">
                Network · Live
              </span>
            </div>

            <div className="text-[11px] font-mono" style={{ color: 'var(--muted-foreground)' }}>
              Block #<span className="text-white">{block.toLocaleString()}</span>
            </div>
          </div>

          {/* Total portfolio value */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: 'var(--muted-foreground)' }}>
              Total Portfolio Value
            </div>
            <div className="mt-2 flex items-baseline gap-3 flex-wrap">
              <div className="text-6xl sm:text-7xl font-bold font-mono leading-none"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f7931a 50%, #ea580c 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  textShadow: '0 0 40px rgba(247,147,26,0.4)',
                  filter: 'drop-shadow(0 0 20px rgba(247,147,26,0.3))',
                }}>
                {formatKsh(wallet.balance)}
              </div>
            </div>
            <div className="mt-1.5">
              <UsdtBadge ksh={wallet.balance} size="sm" variant="gold" />
            </div>

            {/* ROI line */}
            <div className="mt-3 flex items-center gap-2 text-sm">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
                <ArrowUpRight className="w-3 h-3" />
                +{roi}%
              </div>
              <span style={{ color: 'var(--muted-foreground)' }}>ROI · all time</span>
            </div>
          </div>

          {/* Three mini stats: Deposited / Earned / Active */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3 backdrop-blur-sm"
              style={{ background: 'rgba(10,14,26,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--muted-foreground)' }}>
                Deposited
              </div>
              <div className="font-mono font-bold text-white text-sm sm:text-base mt-1 truncate">
                {formatKsh(wallet.total_deposited)}
              </div>
            </div>
            <div className="rounded-xl p-3 backdrop-blur-sm"
              style={{ background: 'rgba(10,14,26,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--muted-foreground)' }}>
                Earned
              </div>
              <div className="font-mono font-bold text-sm sm:text-base mt-1 truncate"
                style={{ color: '#4ade80' }}>
                {formatKsh(wallet.total_earned)}
              </div>
            </div>
            <div className="rounded-xl p-3 backdrop-blur-sm"
              style={{ background: 'rgba(10,14,26,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--muted-foreground)' }}>
                Active
              </div>
              <div className="font-mono font-bold text-white text-sm sm:text-base mt-1">
                {active.length}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link to="/plans"
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f7931a, #ea580c)',
                color: '#0a0e1a',
                boxShadow: '0 0 30px -5px rgba(247,147,26,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}>
              <Zap className="w-4 h-4" fill="currentColor" />
              Buy Shares
            </Link>
            <Link to="/wallet"
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
              }}>
              <ArrowDownToLine className="w-4 h-4" />
              Deposit
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* LIQUIDITY POOL — moved above Market because pool health is */}
      {/* the CoinTap-specific trust signal users care about most.  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="glass rounded-3xl p-5 sm:p-6 relative overflow-hidden animate-slide-up">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Droplets className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              Liquidity Pool
            </h3>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: '#4ade80' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Auto-replenish active
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--muted-foreground)' }}>
              Public Pool
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gradient-gold font-mono mt-1">
              <LiveNumber value={pool.public_pool_balance} prefix="Ksh " jitter={0.0015} pulse />
            </div>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: Math.min(100, (pool.public_pool_balance / (pool.public_pool_balance + pool.reserve_pool_balance)) * 100) + '%',
                  background: 'linear-gradient(90deg, #fbbf24, #f7931a)',
                }} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(247,147,26,0.06)', border: '1px solid rgba(247,147,26,0.15)' }}>
              <div className="text-[9px] uppercase tracking-widest font-bold"
                style={{ color: 'var(--muted-foreground)' }}>
                Reserve
              </div>
              <div className="font-mono font-bold text-white text-sm mt-1">
                <LiveNumber value={pool.reserve_pool_balance} prefix="Ksh " jitter={0.0008} />
              </div>
            </div>
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div className="text-[9px] uppercase tracking-widest font-bold"
                style={{ color: 'var(--muted-foreground)' }}>
                Floor
              </div>
              <div className="font-mono font-bold text-white text-sm mt-1">
                {formatKsh(pool.sold_out_floor)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MARKET — Top movers with sparklines */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="glass rounded-3xl p-5 sm:p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: '#f7931a' }} fill="currentColor" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Market</h3>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--muted-foreground)' }}>
            Top Movers
          </div>
        </div>

        {/* Horizontal scrolling market cards */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-2 px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.market-row::-webkit-scrollbar { display: none }`}</style>
          {COINS.map((c) => (
            <LiveMarketCard key={c.symbol}
              coin={c}
              basePrice={marketPrices[c.id] ?? FALLBACK_PRICES[c.id]}
              change={marketChanges[c.id] ?? c.baseChange} />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 24h Portfolio Performance chart */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="glass rounded-3xl p-5 sm:p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              Portfolio Performance
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Last 24 hours
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={portfolioPoints} margin={{ top: 10, right: 20, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f5a623" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(136,146,164,0.4)" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
            <YAxis stroke="rgba(136,146,164,0.4)" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,14,26,0.95)',
                border: '1px solid rgba(247,147,26,0.3)',
                borderRadius: '12px',
                color: '#f5f6fa',
                backdropFilter: 'blur(20px)',
              }}
              formatter={(v: number) => [`Ksh ${v.toLocaleString()}`, 'Balance']}
              cursor={{ stroke: 'rgba(247,147,26,0.4)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="value" stroke="#f7931a" fillOpacity={1} fill="url(#colorPortfolio)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
        {analyticsLoaded && portfolioPoints.every((p) => p.value === 0) && (
          <div className="text-center py-3 -mt-12 relative z-10 pointer-events-none">
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              No portfolio activity yet in the last 24 hours
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Active Investments + Pool */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div>
        {/* Active investments (now full-width since pool moved above Market) */}
        <div className="glass rounded-3xl p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              Active Investments
            </h3>
            <Link to="/orders"
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
              style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
              View All
            </Link>
          </div>

          {active.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.15)' }}>
                <PiggyBank className="w-7 h-7 opacity-50" style={{ color: 'var(--primary)' }} />
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--muted-foreground)' }}>
                No active investments yet
              </p>
              <Link to="/plans"
                className="inline-block px-5 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                Start Investing
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {active.slice(0, 3).map((o) => {
                const total = o.matures_at - o.starts_at
                const elapsed = Math.min(total, Date.now() - o.starts_at)
                const pct = (elapsed / total) * 100
                const profit = o.expected_return - o.amount_invested
                return (
                  <div key={o.id} className="rounded-2xl p-4 transition-transform hover:scale-[1.01]"
                    style={{
                      background: 'rgba(247,147,26,0.05)',
                      border: '1px solid rgba(247,147,26,0.12)',
                    }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                      <div>
                        <div className="font-bold text-white text-sm">{o.plan_name}</div>
                        <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                          Order #{o.id}
                        </div>
                      </div>
                      <Countdown target={o.matures_at} />
                    </div>

                    <div className="flex justify-between text-[10px] mb-1.5">
                      <span style={{ color: 'var(--muted-foreground)' }}>PROGRESS</span>
                      <span className="font-mono font-bold text-white">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #fbbf24, #f7931a)' }} />
                    </div>

                    <div className="flex justify-between text-xs mt-3 pt-3"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'var(--muted-foreground)' }}>
                        {formatKsh(o.amount_invested)} → <span className="text-green-400 font-bold">{formatKsh(o.expected_return)}</span>
                      </span>
                      <span className="text-green-400 font-bold">+{formatKsh(profit)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Weekly earnings + Allocation */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-3xl p-5 sm:p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              Weekly Earnings
            </h3>
            {totalEarnedThisWeek > 0 && (
              <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
                +{formatKsh(totalEarnedThisWeek)}
              </div>
            )}
          </div>
          {analyticsLoaded && totalEarnedThisWeek === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ height: 220 }}>
              <div className="w-12 h-12 mb-3 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.15)' }}>
                <TrendingUp className="w-6 h-6 opacity-50" style={{ color: 'var(--primary)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                No earnings this week yet
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Earnings show up after orders mature
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={earningsPoints} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(136,146,164,0.4)" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(136,146,164,0.4)" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{
                  background: 'rgba(10,14,26,0.95)',
                  border: '1px solid rgba(247,147,26,0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(20px)',
                }}
                formatter={(v: number) => [`Ksh ${v.toLocaleString()}`, 'Earned']}
                cursor={{ fill: 'rgba(247,147,26,0.05)' }} />
                <Bar dataKey="earned" fill="#f7931a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6 animate-slide-up">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            Portfolio Allocation
          </h3>
          {analyticsLoaded && allocSegments.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ height: 180 }}>
              <div className="w-12 h-12 mb-3 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.15)' }}>
                <PieChart className="w-6 h-6 opacity-50" style={{ color: 'var(--primary)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                No investments yet
              </p>
              <Link to="/plans" className="text-[11px] mt-2 font-semibold"
                style={{ color: 'var(--primary)' }}>
                Get started →
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie
                    data={allocSegments.map((s, i) => ({
                      name: s.name,
                      value: s.amount,
                      color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
                    }))}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    dataKey="value" paddingAngle={3}>
                    {allocSegments.map((_, i) => (
                      <Cell key={i} fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{
                    background: 'rgba(10,14,26,0.95)',
                    border: '1px solid rgba(247,147,26,0.3)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(20px)',
                  }}
                  formatter={(v: number) => [`Ksh ${v.toLocaleString()}`, 'Invested']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 text-xs">
                {allocSegments.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full"
                        style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }} />
                      <span className="text-white font-semibold">{seg.name}</span>
                    </span>
                    <span className="font-mono font-bold text-white">{Math.round(seg.percent)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
