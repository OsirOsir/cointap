import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, PiggyBank, Zap, Activity, Droplets, BarChart3 } from 'lucide-react'
import { formatKsh, useStore } from '@/lib/cointap-store'
import { Countdown } from '@/components/cointap/Countdown'
import { NodeBackground } from '@/components/cointap/NodeBackground'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// Mock data for charts
const portfolioChart = [
  { time: '00h', value: 42000 },
  { time: '04h', value: 45200 },
  { time: '08h', value: 48100 },
  { time: '12h', value: 51900 },
  { time: '16h', value: 50300 },
  { time: '20h', value: 54200 },
  { time: '24h', value: 57100 },
]

const earningsChart = [
  { day: 'Mon', earned: 2400 },
  { day: 'Tue', earned: 1398 },
  { day: 'Wed', earned: 9800 },
  { day: 'Thu', earned: 3908 },
  { day: 'Fri', earned: 4800 },
  { day: 'Sat', earned: 3800 },
  { day: 'Sun', earned: 5300 },
]

const assetAllocation = [
  { name: 'Starter', value: 35, color: '#f5a623' },
  { name: 'Growth', value: 45, color: '#7c3aed' },
  { name: 'Premium', value: 20, color: '#fbbf24' },
]

function StatCard({ icon: Icon, label, value, subtext, color, change }: any) {
  const isPositive = change?.startsWith('+')
  return (
    <div className="glass rounded-2xl p-5 group animate-slide-up hover:scale-105">
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{
        background: 'radial-gradient(circle at top-right, rgba(247,147,26,0.1), transparent)',
      }} />
      <div className="relative flex items-start justify-between">
        <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-xl group-hover:scale-110 transition-transform"
          style={{
            background: color || 'rgba(247,147,26,0.15)',
            border: '1px solid rgba(247,147,26,0.3)',
            color: 'var(--primary)',
          }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="relative mt-4">
        <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
          {value}
        </div>
        {subtext && (
          <div className="text-xs mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
            {subtext}
          </div>
        )}
        {change && (
          <div className={`text-xs font-bold mt-2 flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
    </div>
  )
}

export function Dashboard() {
  const user = useStore((s) => s.user)
  const wallet = useStore((s) => s.wallet)
  const orders = useStore((s) => s.orders)
  const pool = useStore((s) => s.pool)
  const referrals = useStore((s) => s.referral_earnings)
  const active = orders.filter((o) => o.status === 'active')

  const totalProfit = wallet.total_earned
  const roi = wallet.total_deposited > 0 ? ((totalProfit / wallet.total_deposited) * 100).toFixed(1) : '0'
  const totalInvested = active.reduce((sum, o) => sum + o.amount_invested, 0)

  return (
    <div className="space-y-6 pb-10">
      {/* PREMIUM HERO CARD */}
      <div className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden group animate-slide-up">
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-500"
          style={{
            background: 'radial-gradient(circle 600px at 20% 50%, rgba(247,147,26,0.15), transparent)',
          }} />
        <NodeBackground />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-gold opacity-5 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                Welcome back, {user?.full_name?.split(' ')[0] || 'Trader'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mt-2">Portfolio Overview</h1>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-sm"
              style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}>
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm font-bold text-green-400">+{roi}% ROI</span>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Total Balance
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <div className="text-5xl sm:text-6xl font-bold text-gradient-gold font-mono">
                {formatKsh(wallet.balance)}
              </div>
              <div className="text-sm font-semibold text-green-400 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                {formatKsh(totalProfit)} earned
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-2xl" style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.15)' }}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Deposited</div>
                <div className="text-lg sm:text-xl font-bold font-mono text-white mt-1">
                  {formatKsh(wallet.total_deposited)}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Invested</div>
                <div className="text-lg sm:text-xl font-bold font-mono text-white mt-1">
                  {formatKsh(totalInvested)}
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Available</div>
                <div className="text-lg sm:text-xl font-bold font-mono text-white mt-1">
                  {formatKsh(wallet.balance - totalInvested)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/wallet"
              className="px-6 py-3 rounded-xl text-sm font-bold glow-gold hover:shadow-lg transform hover:scale-105 transition-all"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              + Deposit Funds
            </Link>
            <Link to="/plans" className="px-6 py-3 rounded-xl glass text-sm font-bold text-white hover:scale-105 transition-transform">
              Browse Plans
            </Link>
            <Link to="/withdraw" className="px-6 py-3 rounded-xl glass text-sm font-bold text-white hover:scale-105 transition-transform">
              Withdraw
            </Link>
          </div>
        </div>
      </div>

      {/* KEY METRICS - 4 STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard 
          icon={TrendingUp} 
          label="Total Earned" 
          value={formatKsh(wallet.total_earned)}
          change="+12.5%"
          color="rgba(74,222,128,0.15)"
        />
        <StatCard 
          icon={Activity} 
          label="Active Orders" 
          value={String(active.length)}
          subtext={`${totalInvested > 0 ? formatKsh(totalInvested) : 'None'} invested`}
          color="rgba(247,147,26,0.15)"
        />
        <StatCard 
          icon={Users} 
          label="Referral Bonus" 
          value={formatKsh(referrals)}
          change="+2 referrals"
          color="rgba(124,58,237,0.15)"
        />
        <StatCard 
          icon={Droplets} 
          label="Pool Available" 
          value={formatKsh(pool.public_pool_balance)}
          subtext="Live liquidity"
          color="rgba(251,191,36,0.15)"
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Portfolio performance chart - 2 cols */}
        <div className="glass rounded-2xl p-6 lg:col-span-2 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                Portfolio Performance
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Last 24 hours</p>
            </div>
            <div className="px-3 py-1 rounded-lg text-xs font-bold badge-premium">Live</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={portfolioChart} margin={{ top: 10, right: 20, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f5a623" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="time" stroke="rgba(136,146,164,0.5)" style={{ fontSize: '12px' }} />
              <YAxis stroke="rgba(136,146,164,0.5)" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(20,24,33,0.95)',
                  border: '1px solid rgba(247,147,26,0.3)',
                  borderRadius: '12px',
                  color: '#f5f6fa',
                }}
                cursor={{ stroke: 'rgba(247,147,26,0.4)', strokeWidth: 2 }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#f5a623" 
                fillOpacity={1} 
                fill="url(#colorPortfolio)" 
                strokeWidth={3}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly earnings bar chart */}
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <div className="mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              Weekly Earnings
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>Past 7 days</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={earningsChart} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(136,146,164,0.5)" style={{ fontSize: '11px' }} />
              <YAxis stroke="rgba(136,146,164,0.5)" style={{ fontSize: '11px' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(20,24,33,0.95)',
                  border: '1px solid rgba(247,147,26,0.3)',
                  borderRadius: '12px',
                  color: '#f5f6fa',
                }}
              />
              <Bar dataKey="earned" fill="#f5a623" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ACTIVE INVESTMENTS + POOL */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Active investments - 2 cols */}
        <div className="glass rounded-2xl p-6 lg:col-span-2 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              Active Investments
            </h3>
            <Link to="/orders" className="text-xs font-semibold px-2 py-1 rounded-lg hover:opacity-80"
              style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
              View All
            </Link>
          </div>

          {active.length === 0 ? (
            <div className="text-center py-12">
              <PiggyBank className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>No active investments</p>
              <Link to="/plans"
                className="px-5 py-2.5 rounded-xl text-sm font-bold inline-block"
                style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                Start Investing
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map((o) => {
                const total = o.matures_at - o.starts_at
                const elapsed = Math.min(total, Date.now() - o.starts_at)
                const pct = (elapsed / total) * 100
                const profit = o.expected_return - o.amount_invested
                return (
                  <div key={o.id} className="rounded-2xl p-4 group hover:scale-105 transition-transform"
                    style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.15)' }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                      <div>
                        <div className="font-semibold text-white text-sm">{o.plan_name}</div>
                        <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                          Order #{o.id}
                        </div>
                      </div>
                      <Countdown target={o.matures_at} />
                    </div>

                    <div className="flex justify-between items-center gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span style={{ color: 'var(--muted-foreground)' }}>Progress</span>
                          <span className="font-mono font-semibold text-white">{Math.round(pct)}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${pct}%`,
                            background: 'var(--gradient-gold)',
                          }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: 'var(--muted-foreground)' }}>
                        {formatKsh(o.amount_invested)} → <span className="text-green-400 font-semibold">{formatKsh(o.expected_return)}</span>
                      </span>
                      <span className="text-green-400 font-semibold">+{formatKsh(profit)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pool liquidity card */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden group animate-slide-up">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-purple opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity" />
          <div className="relative z-10">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Droplets className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              Share Pool
            </h3>

            <div className="mt-5">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                  Public Pool
                </span>
                <span className="text-lg font-bold font-mono text-white">
                  {formatKsh(pool.public_pool_balance)}
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="h-full rounded-full" style={{
                  width: Math.min(100, (pool.public_pool_balance / (pool.public_pool_balance + pool.reserve_pool_balance)) * 100) + '%',
                  background: 'var(--gradient-gold)',
                }} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(247,147,26,0.1)', border: '1px solid rgba(247,147,26,0.2)' }}>
                <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--muted-foreground)' }}>Reserve</div>
                <div className="font-mono font-bold text-white mt-1">{formatKsh(pool.reserve_pool_balance)}</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--muted-foreground)' }}>Floor</div>
                <div className="font-mono font-bold text-white mt-1">{formatKsh(pool.sold_out_floor)}</div>
              </div>
            </div>

            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span style={{ color: 'var(--muted-foreground)' }}>Auto-replenish</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
