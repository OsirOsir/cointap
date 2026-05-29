import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Lock, X, Zap, Shield, Coins } from 'lucide-react'
import { formatKsh, store, useStore, type Plan } from '@/lib/cointap-store'
import { UsdtBadge } from '@/lib/usdt'

export function Plans() {
  const plans = useStore((s) => s.plans)
  const pool = useStore((s) => s.pool)
  const wallet = useStore((s) => s.wallet)
  const settings = useStore((s) => s.settings)
  const [selected, setSelected] = useState<Plan | null>(null)

  if (!settings.sale_open) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass rounded-3xl p-12 text-center max-w-md animate-slide-up">
          <TrendingUp className="w-16 h-16 mx-auto mb-6 opacity-30" />
          <h2 className="text-3xl font-bold text-white">Sale Window Closed</h2>
          <p className="mt-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Share purchases are currently closed. Please check again later.
          </p>
          <div className="mt-6 p-4 rounded-xl text-xs" style={{ background: 'rgba(247,147,26,0.1)', border: '1px solid rgba(247,147,26,0.2)' }}>
            <span style={{ color: 'var(--muted-foreground)' }}>Next batch releases in </span>
            <span className="font-bold text-white">2 hours 34 minutes</span>
          </div>
        </div>
      </div>
    )
  }

  const activePlans = plans.filter(p => p.is_active)

  return (
    <div className="space-y-6 pb-10">
      {/* Header + Summary */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display">Investment Plans</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
            Choose a plan that matches your investment goals. All returns are guaranteed.
          </p>
        </div>

        {/* Pool + Wallet summary */}
        <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 animate-slide-up">
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Available Shares in Pool
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-gradient-gold font-mono mt-2">
              {formatKsh(pool.public_pool_balance)}
            </div>
            <div className="mt-1">
              <UsdtBadge ksh={pool.public_pool_balance} size="xs" variant="gold" />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
              {pool.public_pool_balance <= pool.sold_out_floor ? 'Low stock — new batch releasing soon' : 'Plenty available'}
            </p>
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Your Wallet Balance
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-white font-mono mt-2">
              {formatKsh(wallet.balance)}
            </div>
            <div className="mt-1">
              <UsdtBadge ksh={wallet.balance} size="xs" variant="muted" />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
              Ready to invest
            </p>
          </div>
        </div>

        {pool.public_pool_balance <= pool.sold_out_floor && (
          <div className="p-4 rounded-2xl text-sm text-center text-yellow-400 animate-pulse"
            style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)' }}>
            ⚠️ Pool is approaching capacity. New batch releasing soon.
          </div>
        )}
      </div>

      {/* Plan cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {activePlans.map((p, i) => {
          const isPopular = i === Math.floor(activePlans.length / 2)
          return (
            <div key={p.id} className={`glass rounded-3xl p-6 relative overflow-hidden group transition-all hover:scale-105 animate-slide-up ${
              isPopular ? 'lg:scale-105' : ''
            }`}
              style={isPopular ? { boxShadow: '0 0 0 1px rgba(247,147,26,0.5), 0 0 40px -10px rgba(247,147,26,0.4)' } : {}}>
              
              {/* Glow background on hover */}
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-gold opacity-0 rounded-full blur-3xl group-hover:opacity-5 transition-opacity" />

              {/* Popular badge */}
              {isPopular && (
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase"
                  style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)', letterSpacing: '0.1em' }}>
                  Most Popular
                </div>
              )}

              <div className="relative z-10">
                {/* Icon + Name */}
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: isPopular ? 'var(--gradient-gold)' : 'rgba(247,147,26,0.15)', color: isPopular ? 'var(--primary-foreground)' : 'var(--primary)' }}>
                    {i === 0 ? <Coins className="w-5 h-5" /> : i === 1 ? <TrendingUp className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                    {p.name}
                  </span>
                </div>

                {/* Main CTA: Profit % */}
                <div className="mt-5">
                  <div className="text-5xl font-bold text-gradient-gold font-mono leading-none">
                    {p.profit_percent}%
                  </div>
                  <div className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    Profit in {p.duration_days} days
                  </div>
                </div>

                {/* Details grid */}
                <div className="mt-6 space-y-3">
                  <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Minimum</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">{formatKsh(p.min_amount)}</div>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Maximum</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">{formatKsh(p.max_amount)}</div>
                  </div>
                </div>

                {/* Example return */}
                <div className="mt-5 p-4 rounded-2xl"
                  style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Example</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{formatKsh(p.min_amount)}</span>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>→</span>
                    <span className="text-sm font-bold text-green-400">{formatKsh(p.min_amount + (p.min_amount * p.profit_percent) / 100)}</span>
                  </div>
                </div>

                {/* CTA Button */}
                <button onClick={() => setSelected(p)}
                  className="mt-6 w-full py-3 rounded-xl font-bold uppercase tracking-wider glow-gold hover:opacity-90 transform hover:scale-105 transition-all"
                  style={{ background: isPopular ? 'var(--gradient-gold)' : 'rgba(247,147,26,0.15)', color: isPopular ? 'var(--primary-foreground)' : 'var(--primary)', border: '1px solid rgba(247,147,26,0.3)' }}>
                  {isPopular ? 'Get Started' : 'Invest Now'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Risk disclaimer */}
      <div className="glass rounded-2xl p-5 flex items-start gap-4 animate-slide-up">
        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <p className="font-semibold text-white mb-1">Important</p>
          <p>Investments are locked for the plan duration. Returns are credited to your wallet automatically on maturity. All plans are backed by our reserve pool. Past performance does not guarantee future results.</p>
        </div>
      </div>

      {selected && <BuyModal plan={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function BuyModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const navigate = useNavigate()
  const wallet = useStore((s) => s.wallet)
  const [amount, setAmount] = useState(String(plan.min_amount))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const a = parseFloat(amount) || 0
  const ret = a + (a * plan.profit_percent) / 100
  const profit = ret - a
  const isValid = a >= plan.min_amount && a <= plan.max_amount && a <= wallet.balance

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const res = await store.apiBuyShares(plan.id, a)
    setBusy(false)
    if (!res.ok) { setError(res.error || 'Failed'); return }
    onClose()
    navigate('/orders')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-slide-up"
      style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}>
      <div className="glass rounded-3xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-2xl font-bold text-white">{plan.name} Plan</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {plan.profit_percent}% return in {plan.duration_days} days
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--muted-foreground)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 mt-6">
          {/* Input */}
          <div>
            <label className="text-xs uppercase tracking-widest font-semibold block mb-2" 
              style={{ color: 'var(--muted-foreground)' }}>
              Investment Amount (Ksh)
            </label>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError('') }}
              min={plan.min_amount} max={plan.max_amount}
              className="w-full px-4 py-3 rounded-xl text-white font-mono text-xl font-bold"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(247,147,26,0.2)' }} />
            <div className="text-xs mt-2 flex justify-between" style={{ color: 'var(--muted-foreground)' }}>
              <span>Min {formatKsh(plan.min_amount)}</span>
              <span>Max {formatKsh(plan.max_amount)}</span>
            </div>
          </div>

          {/* Expected return breakdown */}
          <div className="space-y-3 p-4 rounded-2xl" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Investment</span>
              <span className="font-mono font-semibold text-white">{formatKsh(a)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Profit ({plan.profit_percent}%)</span>
              <span className="font-mono font-semibold text-green-400">+{formatKsh(profit)}</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} className="pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--muted-foreground)' }}>Expected Return</span>
                <span className="text-xl font-bold text-gradient-gold font-mono">{formatKsh(ret)}</span>
              </div>
            </div>
          </div>

          {/* Balance check */}
          {a > wallet.balance && (
            <div className="p-3 rounded-xl text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              Insufficient balance. Please deposit Ksh {formatKsh(a - wallet.balance)}.
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button type="submit" disabled={!isValid || busy}
            className="w-full py-4 rounded-xl font-bold uppercase tracking-wider glow-gold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all"
            style={{ background: isValid ? 'var(--gradient-gold)' : 'rgba(247,147,26,0.2)', color: 'var(--primary-foreground)' }}>
            {busy ? 'Processing…' : isValid ? 'Confirm Investment' : 'Invalid Amount'}
          </button>
        </form>

        <p className="text-xs mt-5 text-center" style={{ color: 'var(--muted-foreground)' }}>
          Funds will be locked until maturity date.
        </p>
      </div>
    </div>
  )
}
