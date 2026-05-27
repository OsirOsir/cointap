import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, PiggyBank } from 'lucide-react'
import { formatKsh, useStore } from '@/lib/cointap-store'
import { Countdown } from '@/components/cointap/Countdown'
import { NodeBackground } from '@/components/cointap/NodeBackground'

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
  return (
    <div className="glass rounded-xl p-4 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: color || 'rgba(247,147,26,0.12)', color: color ? undefined : 'var(--primary)' }}>
          <Icon className="w-4 h-4" style={{ color: color ? 'inherit' : undefined }} />
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-bold mt-2 font-mono text-white">{value}</div>
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

  return (
    <div className="space-y-6">
      {/* Hero wallet card */}
      <div className="glass rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <NodeBackground />
        <div className="relative">
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Welcome back</div>
          <div className="text-xl sm:text-2xl font-bold mt-1 text-white">{user?.full_name || 'Investor'}</div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Wallet Balance</span>
          </div>
          <div className="text-3xl sm:text-5xl font-bold text-gradient-gold mt-1 font-mono">
            {formatKsh(wallet.balance)}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/wallet"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold glow-gold hover:opacity-90"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              Deposit
            </Link>
            <Link to="/plans" className="px-4 py-2.5 rounded-xl glass text-sm font-semibold text-white">Buy Shares</Link>
            <Link to="/withdraw" className="px-4 py-2.5 rounded-xl glass text-sm font-semibold text-white">Withdraw</Link>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ArrowDownRight} label="Total Deposited" value={formatKsh(wallet.total_deposited)}
          color={undefined} />
        <StatCard icon={ArrowUpRight} label="Total Withdrawn" value={formatKsh(wallet.total_withdrawn)} />
        <StatCard icon={TrendingUp} label="Total Earned" value={formatKsh(wallet.total_earned)} />
        <StatCard icon={Users} label="Referral Earnings" value={formatKsh(referrals)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Active investments */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Active Investments</h3>
            <Link to="/orders" className="text-xs" style={{ color: 'var(--primary)' }}>View all</Link>
          </div>
          {active.length === 0 ? (
            <div className="text-center py-10">
              <PiggyBank className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(136,146,164,0.4)' }} />
              <div className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>No active investments yet</div>
              <Link to="/plans"
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                Browse Plans
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {active.slice(0, 3).map((o) => {
                const total = o.matures_at - o.starts_at
                const elapsed = Math.min(total, Date.now() - o.starts_at)
                const pct = (elapsed / total) * 100
                return (
                  <div key={o.id} className="rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-sm font-semibold text-white">{o.plan_name}</div>
                        <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>#{o.id}</div>
                      </div>
                      <Countdown target={o.matures_at} />
                    </div>
                    <div className="mt-3 flex justify-between text-xs">
                      <span style={{ color: 'var(--muted-foreground)' }}>Invested</span>
                      <span className="font-mono text-white">
                        {formatKsh(o.amount_invested)} → <span className="text-green-400">{formatKsh(o.expected_return)}</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--gradient-gold)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pool card */}
        <div className="glass rounded-2xl p-5 relative overflow-hidden">
          <h3 className="font-semibold text-white">Live Share Pool</h3>
          <div className="mt-4">
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Available</div>
            <div className="text-2xl font-bold text-gradient-gold font-mono mt-1">
              {formatKsh(pool.public_pool_balance)}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
              <span>Reserve</span><span className="font-mono">{formatKsh(pool.reserve_pool_balance)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div className="h-full rounded-full" style={{
                width: `${Math.min(100, (pool.public_pool_balance / (pool.public_pool_balance + pool.reserve_pool_balance)) * 100)}%`,
                background: 'var(--gradient-gold)',
              }} />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Auto-replenish enabled
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>Active Orders</div>
            <div className="text-xl font-bold font-mono text-white">{active.length}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
