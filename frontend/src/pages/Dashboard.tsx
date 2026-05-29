import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Zap, ArrowDownToLine, Flame, TrendingUp, Activity, Droplets,
  Users as UsersIcon, ArrowDownRight, ArrowUpRight, PiggyBank, BarChart3,
} from 'lucide-react'
import { formatKsh, useStore } from '@/lib/cointap-store'
import { Countdown } from '@/components/cointap/Countdown'
import { NodeBackground } from '@/components/cointap/NodeBackground'
import { EmailVerificationBanner } from '@/components/cointap/Security'
import { AnnouncementsBanner } from '@/components/cointap/AnnouncementsBanner'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

// ─── MOCK DATA ────────────────────────────────────────────────
const portfolioChart = [
  { time: '00h', value: 42000 }, { time: '04h', value: 45200 },
  { time: '08h', value: 48100 }, { time: '12h', value: 51900 },
  { time: '16h', value: 50300 }, { time: '20h', value: 54200 },
  { time: '24h', value: 57100 },
]
const earningsChart = [
  { day: 'Mon', earned: 2400 }, { day: 'Tue', earned: 1398 },
  { day: 'Wed', earned: 9800 }, { day: 'Thu', earned: 3908 },
  { day: 'Fri', earned: 4800 }, { day: 'Sat', earned: 3800 },
  { day: 'Sun', earned: 5300 },
]
const assetAllocation = [
  { name: 'Starter', value: 35, color: '#f5a623' },
  { name: 'Growth', value: 45, color: '#7c3aed' },
  { name: 'Premium', value: 20, color: '#fbbf24' },
]

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

const marketCoins = [
  { symbol: 'BTC', pair: 'USDT', price: 67548.9, change: 2.60, trend: 'up' as const, color: '#f7931a', spark: sparkline(1, 'up') },
  { symbol: 'ETH', pair: 'USDT', price: 3504.7, change: 1.10, trend: 'up' as const, color: '#627eea', spark: sparkline(2, 'up') },
  { symbol: 'SOL', pair: 'USDT', price: 180.7, change: -0.85, trend: 'down' as const, color: '#14f195', spark: sparkline(3, 'down') },
  { symbol: 'BNB', pair: 'USDT', price: 612.3, change: 0.45, trend: 'up' as const, color: '#f3ba2f', spark: sparkline(4, 'up') },
]

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
          {marketCoins.map((c) => (
            <div key={c.symbol}
              className="flex-shrink-0 w-[180px] rounded-2xl p-3 group hover:scale-[1.02] transition-transform cursor-pointer"
              style={{
                background: 'rgba(10,14,26,0.6)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
              }}>
              {/* Top: ticker */}
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: c.trend === 'up' ? '#4ade80' : '#ef4444' }} />
                <span className="font-bold text-white text-sm">{c.symbol}</span>
                <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                  /{c.pair}
                </span>
              </div>

              {/* Price + change */}
              <div className="mt-2 flex items-baseline justify-between gap-1">
                <div className="font-mono font-bold text-white text-base truncate">
                  ${c.price.toLocaleString(undefined, { minimumFractionDigits: c.price < 100 ? 2 : 1 })}
                </div>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {c.change > 0
                  ? <ArrowUpRight className="w-3 h-3 text-green-400" />
                  : <ArrowDownRight className="w-3 h-3 text-red-400" />}
                <span className="text-xs font-bold font-mono"
                  style={{ color: c.change > 0 ? '#4ade80' : '#ef4444' }}>
                  {c.change > 0 ? '+' : ''}{c.change.toFixed(2)}%
                </span>
              </div>

              {/* Sparkline */}
              <div className="mt-2 h-8 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={c.spark}>
                    <Line type="monotone" dataKey="v"
                      stroke={c.trend === 'up' ? '#4ade80' : '#ef4444'}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
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
          <AreaChart data={portfolioChart} margin={{ top: 10, right: 20, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f5a623" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="time" stroke="rgba(136,146,164,0.4)" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
            <YAxis stroke="rgba(136,146,164,0.4)" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,14,26,0.95)',
                border: '1px solid rgba(247,147,26,0.3)',
                borderRadius: '12px',
                color: '#f5f6fa',
                backdropFilter: 'blur(20px)',
              }}
              cursor={{ stroke: 'rgba(247,147,26,0.4)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area type="monotone" dataKey="value" stroke="#f7931a" fillOpacity={1} fill="url(#colorPortfolio)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Active Investments + Pool */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Active investments */}
        <div className="glass rounded-3xl p-5 sm:p-6 lg:col-span-2 animate-slide-up">
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

        {/* Pool liquidity */}
        <div className="glass rounded-3xl p-5 sm:p-6 relative overflow-hidden animate-slide-up">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-2xl pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
          <div className="relative z-10">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Droplets className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              Liquidity Pool
            </h3>

            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--muted-foreground)' }}>
                Public Pool
              </div>
              <div className="text-xl font-bold text-gradient-gold font-mono mt-1">
                {formatKsh(pool.public_pool_balance)}
              </div>
              <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="h-full rounded-full"
                  style={{
                    width: Math.min(100, (pool.public_pool_balance / (pool.public_pool_balance + pool.reserve_pool_balance)) * 100) + '%',
                    background: 'linear-gradient(90deg, #fbbf24, #f7931a)',
                  }} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg"
                style={{ background: 'rgba(247,147,26,0.06)', border: '1px solid rgba(247,147,26,0.15)' }}>
                <div className="text-[9px] uppercase tracking-widest font-bold"
                  style={{ color: 'var(--muted-foreground)' }}>
                  Reserve
                </div>
                <div className="font-mono font-bold text-white text-xs mt-1">
                  {formatKsh(pool.reserve_pool_balance)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg"
                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div className="text-[9px] uppercase tracking-widest font-bold"
                  style={{ color: 'var(--muted-foreground)' }}>
                  Floor
                </div>
                <div className="font-mono font-bold text-white text-xs mt-1">
                  {formatKsh(pool.sold_out_floor)}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center gap-2 text-[10px]"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-semibold">Auto-replenish active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Weekly earnings + Allocation */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass rounded-3xl p-5 sm:p-6 animate-slide-up">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            Weekly Earnings
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={earningsChart} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(136,146,164,0.4)" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
              <YAxis stroke="rgba(136,146,164,0.4)" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{
                background: 'rgba(10,14,26,0.95)',
                border: '1px solid rgba(247,147,26,0.3)',
                borderRadius: '12px',
                backdropFilter: 'blur(20px)',
              }} cursor={{ fill: 'rgba(247,147,26,0.05)' }} />
              <Bar dataKey="earned" fill="#f7931a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-3xl p-5 sm:p-6 animate-slide-up">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            Portfolio Allocation
          </h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie data={assetAllocation} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {assetAllocation.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{
                  background: 'rgba(10,14,26,0.95)',
                  border: '1px solid rgba(247,147,26,0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(20px)',
                }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 text-xs">
              {assetAllocation.map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                    <span className="text-white font-semibold">{a.name}</span>
                  </span>
                  <span className="font-mono font-bold text-white">{a.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
