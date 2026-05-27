import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Lock, X } from 'lucide-react'
import { formatKsh, store, useStore, type Plan } from '@/lib/cointap-store'

export function Plans() {
  const plans = useStore((s) => s.plans)
  const pool = useStore((s) => s.pool)
  const wallet = useStore((s) => s.wallet)
  const settings = useStore((s) => s.settings)
  const [selected, setSelected] = useState<Plan | null>(null)

  if (!settings.sale_open) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass rounded-2xl p-10 text-center max-w-md">
          <TrendingUp className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
          <h2 className="text-xl font-bold text-white">Sale Window Closed</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Share purchases are currently closed. Please check again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Pool / wallet summary */}
      <div className="glass rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Available Shares</div>
          <div className="text-2xl font-bold text-gradient-gold font-mono">{formatKsh(pool.public_pool_balance)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Your Wallet</div>
          <div className="font-mono font-semibold text-white">{formatKsh(wallet.balance)}</div>
        </div>
      </div>

      {pool.public_pool_balance <= pool.sold_out_floor && (
        <div className="p-4 rounded-xl text-sm text-center text-red-400"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠ Pool is at capacity limit. New batch releasing soon.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.filter(p => p.is_active).map((p, i) => (
          <div key={p.id} className="glass rounded-2xl p-5 relative overflow-hidden"
            style={i === 1 ? { boxShadow: '0 0 0 1px rgba(247,147,26,0.4)' } : {}}>
            {i === 1 && (
              <div className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>Popular</div>
            )}
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--primary)' }} /> {p.name}
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gradient-gold">{p.profit_percent}%</span>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>in {p.duration_days}d</span>
            </div>
            <div className="mt-4 space-y-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              <div className="flex justify-between">
                <span>Min</span><span className="font-mono text-white">{formatKsh(p.min_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Max</span><span className="font-mono text-white">{formatKsh(p.max_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>e.g. {formatKsh(p.min_amount)}</span>
                <span className="font-mono text-green-400">→ {formatKsh(p.min_amount + (p.min_amount * p.profit_percent) / 100)}</span>
              </div>
            </div>
            <button onClick={() => setSelected(p)}
              className="mt-5 w-full py-2.5 rounded-xl font-semibold hover:opacity-90"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              Buy Shares
            </button>
          </div>
        ))}
      </div>

      {selected && <BuyModal plan={selected} onClose={() => setSelected(null)} />}

      <div className="glass rounded-xl p-4 flex items-start gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
        <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
        Investments are locked for the plan duration. Returns are credited to your wallet automatically on maturity. Investing involves risk.
      </div>
    </div>
  )
}

function BuyModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const navigate = useNavigate()
  const [amount, setAmount] = useState(String(plan.min_amount))
  const [error, setError] = useState('')
  const a = parseFloat(amount) || 0
  const ret = a + (a * plan.profit_percent) / 100

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = store.buyShares(plan, a)
    if (!res.ok) { setError(res.error || 'Failed'); return }
    onClose()
    navigate('/orders')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-white">{plan.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
          {plan.profit_percent}% profit in {plan.duration_days} days
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Amount (Ksh)</label>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError('') }}
              min={plan.min_amount} max={plan.max_amount}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono text-lg"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div className="text-[10px] mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Min {formatKsh(plan.min_amount)} · Max {formatKsh(plan.max_amount)}
            </div>
          </div>
          <div className="rounded-xl p-4 flex justify-between items-center"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-xs uppercase" style={{ color: 'var(--muted-foreground)' }}>Expected Return</span>
            <span className="text-xl font-bold text-green-400 font-mono">{formatKsh(ret)}</span>
          </div>
          {error && (
            <div className="p-3 rounded-xl text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          <button className="w-full py-3 rounded-xl font-semibold glow-gold hover:opacity-90"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            Confirm Investment
          </button>
        </form>
      </div>
    </div>
  )
}
