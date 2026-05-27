import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Wallet, Activity, ArrowDownToLine, TrendingUp, Droplets, Settings, Plus, Check, X, RefreshCw, Zap } from 'lucide-react'
import { formatKsh, store, useStore, type Plan } from '@/lib/cointap-store'
import { Logo } from '@/components/cointap/Logo'
import { NodeBackground } from '@/components/cointap/NodeBackground'
import { Countdown } from '@/components/cointap/Countdown'

type Tab = 'overview' | 'orders' | 'withdrawals' | 'plans' | 'pool' | 'settings'

export function Admin() {
  const [tab, setTab] = useState<Tab>('overview')
  const user = useStore((s) => s.user)

  const tabs: { k: Tab; l: string; I: any }[] = [
    { k: 'overview', l: 'Overview', I: TrendingUp },
    { k: 'orders', l: 'Orders', I: Activity },
    { k: 'withdrawals', l: 'Withdrawals', I: ArrowDownToLine },
    { k: 'plans', l: 'Plans', I: Wallet },
    { k: 'pool', l: 'Pool', I: Droplets },
    { k: 'settings', l: 'Settings', I: Settings },
  ]

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-40" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'rgba(247,147,26,0.15)', color: 'var(--primary)' }}>Admin</span>
          </div>
          <Link to="/dashboard" className="text-sm hover:text-white transition-colors"
            style={{ color: 'var(--muted-foreground)' }}>← User View</Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Tab bar */}
        <div className="flex gap-1 p-1 glass rounded-xl mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className="px-3 py-2 rounded-xl text-sm flex items-center gap-1.5 whitespace-nowrap transition font-medium"
              style={tab === t.k
                ? { background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }
                : { color: 'var(--muted-foreground)' }}>
              <t.I className="w-3.5 h-3.5" /> {t.l}
            </button>
          ))}
        </div>

        {tab === 'overview' && <Overview />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'withdrawals' && <WithdrawalsTab />}
        {tab === 'plans' && <PlansTab />}
        {tab === 'pool' && <PoolTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

function Overview() {
  const wallet = useStore((s) => s.wallet)
  const orders = useStore((s) => s.orders)
  const wds = useStore((s) => s.withdrawals)
  const pool = useStore((s) => s.pool)

  const stats = [
    { I: Users, l: 'Total Users', v: '12,418', a: '+218 today' },
    { I: Wallet, l: 'Wallet Balances', v: formatKsh(8_423_120 + wallet.balance), a: '' },
    { I: ArrowDownToLine, l: 'Total Deposits', v: formatKsh(24_120_000), a: '' },
    { I: TrendingUp, l: 'Total Withdrawn', v: formatKsh(18_200_000), a: '' },
    { I: Activity, l: 'Active Investments', v: String(orders.filter(o => o.status === 'active').length + 348), a: '' },
    { I: Droplets, l: 'Public Pool', v: formatKsh(pool.public_pool_balance), a: '' },
  ]

  const pendingWds = wds.filter(w => w.status === 'pending')

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <NodeBackground />
        <div className="relative">
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Platform Overview</div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1 text-white">CoinTap Operations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Live treasury, pool, and withdrawal queue</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{s.l}</div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(247,147,26,0.12)', color: 'var(--primary)' }}>
                <s.I className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono mt-2 text-white">{s.v}</div>
            {s.a && <div className="text-[11px] text-green-400 mt-1">{s.a}</div>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pool */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-4 text-white">Pool Management</h3>
          <PoolBars />
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => store.adminReleaseBatch()}
              className="py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              Release Batch
            </button>
            <button className="py-2.5 rounded-xl glass text-sm font-semibold text-white">Settings</button>
          </div>
        </div>

        {/* Pending withdrawals */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Withdrawal Queue</h3>
            <span className="text-[10px] px-2 py-1 rounded uppercase font-bold"
              style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
              {pendingWds.length} pending
            </span>
          </div>
          {pendingWds.length === 0 ? (
            <div className="text-sm text-center py-6" style={{ color: 'var(--muted-foreground)' }}>No pending withdrawals</div>
          ) : (
            <div className="space-y-2">
              {pendingWds.slice(0, 4).map(w => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div className="font-mono text-sm text-white">{formatKsh(w.amount)}</div>
                    <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{w.phone}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => store.adminApproveWithdrawal(w.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>Approve</button>
                    <button onClick={() => store.adminRejectWithdrawal(w.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PoolBars() {
  const pool = useStore((s) => s.pool)
  const total = pool.public_pool_balance + pool.reserve_pool_balance
  const publicPct = total > 0 ? Math.round((pool.public_pool_balance / total) * 100) : 0
  const reservePct = 100 - publicPct

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
          <span>Public Pool</span><span className="font-mono text-white">{formatKsh(pool.public_pool_balance)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="h-full rounded-full" style={{ width: `${publicPct}%`, background: 'var(--gradient-gold)' }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
          <span>Reserve Pool</span><span className="font-mono text-white">{formatKsh(pool.reserve_pool_balance)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="h-full rounded-full" style={{ width: `${reservePct}%`, background: 'linear-gradient(90deg, #7c3aed, #f7931a)' }} />
        </div>
      </div>
      <div className="flex justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
        <span>Sold-out Floor</span>
        <span className="font-mono text-white">{formatKsh(pool.sold_out_floor)}</span>
      </div>
    </div>
  )
}

function OrdersTab() {
  const orders = useStore((s) => s.orders)
  const [filter, setFilter] = useState<string>('all')
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">All Orders</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="settled">Settled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>No orders</div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <tr className="text-xs uppercase text-left" style={{ color: 'var(--muted-foreground)' }}>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Return</th>
                  <th className="px-4 py-3">Countdown</th>
                  <th className="px-4 py-3 text-right">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 font-mono text-xs text-white">#{o.id}</td>
                    <td className="px-4 py-3 text-white">{o.plan_name}</td>
                    <td className="px-4 py-3 text-right font-mono text-white">{formatKsh(o.amount_invested)}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-400">{formatKsh(o.expected_return)}</td>
                    <td className="px-4 py-3">
                      {o.status === 'active' ? <Countdown target={o.matures_at} /> : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold"
                        style={o.status === 'active'
                          ? { background: 'rgba(247,147,26,0.15)', color: 'var(--primary)' }
                          : { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {o.status === 'active' && (
                        <button onClick={() => store.adminForceMaturity(o.id)}
                          className="text-xs px-2 py-1 rounded-lg flex items-center gap-1 ml-auto"
                          style={{ background: 'rgba(247,147,26,0.12)', color: 'var(--primary)' }}>
                          <Zap className="w-3 h-3" /> Force Mature
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function WithdrawalsTab() {
  const wds = useStore((s) => s.withdrawals)
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? wds : wds.filter(w => w.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Withdrawal Queue</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm"
          style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>No withdrawals</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(w => (
            <div key={w.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-mono font-bold text-white">{formatKsh(w.amount)}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{w.phone}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {new Date(w.requested_at).toLocaleDateString()}
                </div>
                {w.mpesa_reference && (
                  <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--primary)' }}>Ref: {w.mpesa_reference}</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] px-2 py-1 rounded uppercase font-bold"
                  style={
                    w.status === 'paid' ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' } :
                    w.status === 'rejected' ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } :
                    w.status === 'processing' ? { background: 'rgba(247,147,26,0.15)', color: 'var(--primary)' } :
                    { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }
                  }>{w.status}</span>
                {w.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => store.adminApproveWithdrawal(w.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => store.adminRejectWithdrawal(w.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlansTab() {
  const plans = useStore((s) => s.plans)
  const [showAdd, setShowAdd] = useState(false)
  const [newPlan, setNewPlan] = useState({ name: '', duration_days: 4, profit_percent: 30, min_amount: 500, max_amount: 20000 })

  function addPlan(e: React.FormEvent) {
    e.preventDefault()
    store.adminAddPlan({ ...newPlan, is_active: true })
    setShowAdd(false)
    setNewPlan({ name: '', duration_days: 4, profit_percent: 30, min_amount: 500, max_amount: 20000 })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Investment Plans</h2>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          <Plus className="w-4 h-4" /> Add Plan
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addPlan} className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-white">New Plan</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Plan Name</label>
              <input value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} required
                className="mt-1 w-full px-3 py-2 rounded-xl text-sm text-white"
                style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Duration (days)</label>
              <input type="number" value={newPlan.duration_days} onChange={(e) => setNewPlan({ ...newPlan, duration_days: +e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl text-sm text-white"
                style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Profit %</label>
              <input type="number" value={newPlan.profit_percent} onChange={(e) => setNewPlan({ ...newPlan, profit_percent: +e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl text-sm text-white"
                style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Min Amount</label>
              <input type="number" value={newPlan.min_amount} onChange={(e) => setNewPlan({ ...newPlan, min_amount: +e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl text-sm text-white"
                style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>Save Plan</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm glass text-white">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {plans.map((p) => (
          <div key={p.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-semibold text-white">{p.name}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                {p.duration_days} days · {p.profit_percent}% · {formatKsh(p.min_amount)} – {formatKsh(p.max_amount)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-1 rounded uppercase font-bold"
                style={p.is_active
                  ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }
                  : { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                {p.is_active ? 'Active' : 'Disabled'}
              </span>
              <button onClick={() => store.adminUpdatePlan(p.id, { is_active: !p.is_active })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold glass text-white">
                {p.is_active ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PoolTab() {
  const pool = useStore((s) => s.pool)
  const [pub, setPub] = useState(String(pool.public_pool_balance))
  const [res, setRes] = useState(String(pool.reserve_pool_balance))
  const [floor, setFloor] = useState(String(pool.sold_out_floor))
  const [batch, setBatch] = useState(String(pool.batch_size))
  const [saved, setSaved] = useState(false)

  function save(e: React.FormEvent) {
    e.preventDefault()
    store.adminUpdatePool({
      public_pool_balance: parseFloat(pub),
      reserve_pool_balance: parseFloat(res),
      sold_out_floor: parseFloat(floor),
      batch_size: parseFloat(batch),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inp = (val: string, set: (v: string) => void, label: string) => (
    <div>
      <label className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</label>
      <input type="number" value={val} onChange={(e) => set(e.target.value)}
        className="mt-1 w-full px-3 py-2.5 rounded-xl text-sm text-white font-mono"
        style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Pool Management</h2>
        <button onClick={() => store.adminReleaseBatch()}
          className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          <RefreshCw className="w-4 h-4" /> Release Batch
        </button>
      </div>

      <div className="glass rounded-2xl p-5">
        <PoolBars />
      </div>

      <form onSubmit={save} className="glass rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-white">Update Pool Settings</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {inp(pub, setPub, 'Public Pool Balance')}
          {inp(res, setRes, 'Reserve Pool Balance')}
          {inp(floor, setFloor, 'Sold-out Floor')}
          {inp(batch, setBatch, 'Batch Release Size')}
        </div>
        <button type="submit"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
          style={{ background: saved ? 'rgba(74,222,128,0.2)' : 'var(--gradient-gold)', color: saved ? '#4ade80' : 'var(--primary-foreground)' }}>
          <Check className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}

function SettingsTab() {
  const settings = useStore((s) => s.settings)
  const [f, setF] = useState(settings)
  const [saved, setSaved] = useState(false)

  function save(e: React.FormEvent) {
    e.preventDefault()
    store.updateSettings(f)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inp = (k: keyof typeof f, label: string, type = 'number') => (
    <div>
      <label className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{label}</label>
      <input type={type} value={String(f[k])} onChange={(e) => setF({ ...f, [k]: type === 'number' ? parseFloat(e.target.value) : e.target.value })}
        className="mt-1 w-full px-3 py-2.5 rounded-xl text-sm text-white"
        style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
    </div>
  )

  return (
    <form onSubmit={save} className="space-y-5">
      <h2 className="text-xl font-bold text-white">Platform Settings</h2>
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-white">Purchase Limits</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {inp('min_deposit', 'Min Deposit (Ksh)')}
          {inp('max_deposit', 'Max Deposit (Ksh)')}
          {inp('min_withdrawal', 'Min Withdrawal (Ksh)')}
          {inp('referral_bonus_percent', 'Referral Bonus %')}
        </div>
      </div>
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-white">Sale Window</h3>
        <div className="flex items-center gap-3">
          <div className="relative inline-block w-12 h-6">
            <input type="checkbox" checked={f.sale_open} onChange={(e) => setF({ ...f, sale_open: e.target.checked })}
              className="sr-only peer" id="sale-toggle" />
            <label htmlFor="sale-toggle"
              className="block w-full h-full rounded-full cursor-pointer transition-colors"
              style={{ background: f.sale_open ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}>
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: f.sale_open ? 'translateX(24px)' : 'translateX(0)' }} />
            </label>
          </div>
          <span className="text-sm text-white">
            Sale window is <strong>{f.sale_open ? 'OPEN' : 'CLOSED'}</strong>
          </span>
        </div>
      </div>
      <button type="submit"
        className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
        style={{ background: saved ? 'rgba(74,222,128,0.2)' : 'var(--gradient-gold)', color: saved ? '#4ade80' : 'var(--primary-foreground)' }}>
        <Check className="w-4 h-4" /> {saved ? 'Settings Saved!' : 'Save Settings'}
      </button>
    </form>
  )
}
