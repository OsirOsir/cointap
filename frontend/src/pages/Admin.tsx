import { useState, useMemo, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import {
  Shield, Users, Package, Droplets, BarChart3, Megaphone, Settings as SettingsIcon,
  ScrollText, Wallet, FileText, Search, Edit2, Trash2, UserX, UserCheck, Plus,
  Check, X, AlertTriangle, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  Activity, DollarSign, Clock, ArrowLeft, Home, RefreshCw,
} from 'lucide-react'
import { formatKsh, store, useStore, type Plan, type AdminUser, type Announcement } from '@/lib/cointap-store'
import { adminApi } from '@/lib/api'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

type Tab = 'overview' | 'users' | 'plans' | 'pool' | 'orders' | 'withdrawals' | 'analytics' | 'announcements' | 'settings' | 'logs' | 'security'

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'plans', label: 'Plans', icon: Package },
  { key: 'pool', label: 'Pool', icon: Droplets },
  { key: 'orders', label: 'Orders', icon: FileText },
  { key: 'withdrawals', label: 'Withdrawals', icon: Wallet },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
  { key: 'logs', label: 'Activity Logs', icon: ScrollText },
]

export function Admin() {
  const user = useStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('overview')

  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-10">
      {/* BACK NAVIGATION BAR */}
      <div className="flex items-center justify-between flex-wrap gap-3 animate-slide-up">
        <Link to="/dashboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold glass hover:scale-105 active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold glass hover:scale-105 active:scale-95 transition-all"
            title="Go to site home">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Site</span>
          </Link>
        </div>
      </div>

      {/* HEADER */}
      <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden animate-slide-up">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-gold opacity-10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center glow-gold"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Administrator Console
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">CoinTap Admin</h1>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="glass rounded-2xl p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap flex items-center gap-2 transition-all"
                style={{
                  background: active ? 'var(--gradient-gold)' : 'transparent',
                  color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                }}>
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="animate-slide-up">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'plans' && <PlansTab />}
        {tab === 'pool' && <PoolTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'withdrawals' && <WithdrawalsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'announcements' && <AnnouncementsTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'logs' && <LogsTab />}
      </div>
    </div>
  )
}

// ─── OVERVIEW ─────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.dashboard()
      setStats(data.stats)
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={load} />

  const cards = [
    { label: 'Total Users', value: stats?.total_users ?? 0, icon: Users, color: 'rgba(74,222,128,0.2)' },
    { label: 'Active Users', value: stats?.active_users ?? 0, icon: UserCheck, color: 'rgba(56,189,248,0.2)' },
    { label: 'Total Deposits', value: formatKsh(stats?.total_deposited ?? 0), icon: ArrowDownToLine, color: 'rgba(247,147,26,0.2)' },
    { label: 'Total Withdrawn', value: formatKsh(stats?.total_withdrawn ?? 0), icon: ArrowUpFromLine, color: 'rgba(124,58,237,0.2)' },
    { label: 'Active Orders', value: stats?.active_orders ?? 0, icon: Activity, color: 'rgba(251,191,36,0.2)' },
    { label: 'Pending Withdrawals', value: stats?.pending_withdrawals ?? 0, icon: Clock, color: 'rgba(239,68,68,0.2)' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={load} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5 group hover:scale-105 transition-transform">
            <div className="flex items-start justify-between">
              <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                {s.label}
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: s.color, color: 'var(--primary)' }}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-3">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <button onClick={async () => { await adminApi.releaseBatch(); load() }}
            className="p-4 rounded-xl text-left hover:scale-105 transition-transform"
            style={{ background: 'rgba(247,147,26,0.1)', border: '1px solid rgba(247,147,26,0.3)' }}>
            <Droplets className="w-5 h-5 mb-2" style={{ color: 'var(--primary)' }} />
            <div className="text-sm font-semibold text-white">Release Pool Batch</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Move funds from reserve → public
            </div>
          </button>
          <div className="p-4 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <SettingsIcon className="w-5 h-5 mb-2" style={{ color: '#7c3aed' }} />
            <div className="text-sm font-semibold text-white">Platform Status</div>
            <div className="text-xs mt-0.5 text-green-400">● Online</div>
          </div>
          <div className="p-4 rounded-xl"
            style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
            <Activity className="w-5 h-5 mb-2" style={{ color: '#4ade80' }} />
            <div className="text-sm font-semibold text-white">Settled Orders</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              {stats?.settled_orders ?? 0} completed
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Shared loading / error states
function LoadingState() {
  return (
    <div className="glass rounded-2xl p-12 flex flex-col items-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      <p className="mt-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading…</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
      <p className="text-sm text-red-400">{message}</p>
      <button onClick={onRetry} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
        style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
        Retry
      </button>
    </div>
  )
}

// ─── USERS MANAGEMENT ─────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<any | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.users(1, query)
      setUsers(data.users || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(), 400)
    return () => clearTimeout(t)
  }, [query])

  if (loading && users.length === 0) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <Search className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="flex-1 bg-transparent text-white outline-none" />
        <span className="text-xs px-3 py-1 rounded-lg" style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
          {users.length} users
        </span>
        <button onClick={load} className="p-1.5 rounded-lg" title="Refresh"
          style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {users.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ color: 'var(--muted-foreground)' }}>No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const wallet = u.wallet || {}
            return (
              <div key={u.id} className="glass rounded-2xl p-4 hover:scale-[1.01] transition-transform">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ background: 'var(--gradient-gold)' }}>
                      {u.full_name.split(' ').map((p: string) => p[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        {u.full_name}
                        {u.role === 'admin' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(247,147,26,0.2)', color: 'var(--primary)' }}>
                            ADMIN
                          </span>
                        )}
                        {!u.is_active && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                            SUSPENDED
                          </span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {u.email} · {u.phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-right">
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Wallet</div>
                      <div className="font-mono font-bold text-white">{formatKsh(wallet.balance ?? 0)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Earned</div>
                      <div className="font-mono font-bold text-green-400">{formatKsh(wallet.total_earned ?? 0)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Orders</div>
                      <div className="font-mono font-bold text-white">{u.order_count ?? 0}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditing(u)}
                      className="p-2 rounded-lg hover:opacity-80" title="Adjust wallet"
                      style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && <WalletAdjustModal user={editing} onClose={() => { setEditing(null); load() }} />}
    </div>
  )
}

function WalletAdjustModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [amount, setAmount] = useState('0')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const a = parseFloat(amount) || 0
  const currentBalance = user.wallet?.balance ?? 0

  async function submit() {
    if (a === 0 || !reason) return
    setBusy(true)
    setError('')
    try {
      await adminApi.adjustWallet(user.id, a, reason)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Adjustment failed')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }} onClick={onClose}>
      <div className="glass rounded-3xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Adjust Wallet</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{user.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Current Balance</div>
          <div className="font-mono font-bold text-white text-xl">{formatKsh(currentBalance)}</div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Amount (+ to credit, − to debit)
            </label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div className="flex gap-2">
            {[1000, 5000, 10000, -1000].map((v) => (
              <button key={v} onClick={() => setAmount(String(a + v))}
                className="flex-1 py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
                {v > 0 ? `+${v / 1000}K` : `${v / 1000}K`}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Reason</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Bonus, refund, correction"
              className="mt-1 w-full px-4 py-3 rounded-xl text-white"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>New Balance</span>
            <span className="font-mono font-bold text-green-400">{formatKsh(currentBalance + a)}</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button onClick={submit} disabled={a === 0 || !reason || busy}
            className="w-full py-3 rounded-xl font-bold glow-gold disabled:opacity-50"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {busy ? 'Applying…' : 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PLANS MANAGEMENT ─────────────────────────────────────
function PlansTab() {
  const plans = useStore((s) => s.plans)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">All Plans ({plans.length})</h3>
        <button onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 glow-gold"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div key={p.id} className="glass rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-bold text-white">{p.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  ID: {p.id}
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.is_active ? 'text-green-400' : 'text-red-400'}`}
                style={{ background: p.is_active ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)' }}>
                {p.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <div className="text-3xl font-bold text-gradient-gold font-mono">{p.profit_percent}%</div>
            <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              in {p.duration_days} days
            </div>

            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Min</span>
                <span className="font-mono text-white">{formatKsh(p.min_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Max</span>
                <span className="font-mono text-white">{formatKsh(p.max_amount)}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setEditing(p)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
                Edit
              </button>
              <button onClick={() => store.adminUpdatePlan(p.id, { is_active: !p.is_active })}
                className="flex-1 py-2 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
                {p.is_active ? 'Disable' : 'Enable'}
              </button>
              <button onClick={() => { if (confirm(`Delete ${p.name}?`)) store.adminDeletePlan(p.id) }}
                className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <PlanEditModal plan={editing} onClose={() => { setEditing(null); setCreating(false) }} />
      )}
    </div>
  )
}

function PlanEditModal({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: plan?.name || '',
    duration_days: plan?.duration_days || 7,
    profit_percent: plan?.profit_percent || 25,
    min_amount: plan?.min_amount || 500,
    max_amount: plan?.max_amount || 50000,
    is_active: plan?.is_active ?? true,
  })

  function submit() {
    if (!form.name) return
    if (plan) {
      store.adminUpdatePlan(plan.id, form)
    } else {
      store.adminAddPlan(form)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }} onClick={onClose}>
      <div className="glass rounded-3xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">{plan ? 'Edit Plan' : 'New Plan'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Plan Name', key: 'name', type: 'text' },
            { label: 'Duration (days)', key: 'duration_days', type: 'number' },
            { label: 'Profit Percent (%)', key: 'profit_percent', type: 'number' },
            { label: 'Minimum Amount (Ksh)', key: 'min_amount', type: 'number' },
            { label: 'Maximum Amount (Ksh)', key: 'max_amount', type: 'number' },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                {f.label}
              </label>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
                className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
                style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          ))}

          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4" />
            Active (visible to users)
          </label>

          <button onClick={submit}
            className="w-full py-3 rounded-xl font-bold glow-gold"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {plan ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── POOL MANAGEMENT ──────────────────────────────────────
function PoolTab() {
  const pool = useStore((s) => s.pool)
  const [injectAmount, setInjectAmount] = useState('100000')

  const inject = (target: 'public' | 'reserve') => {
    const a = parseFloat(injectAmount) || 0
    if (a > 0) store.adminInjectFunds(a, target)
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-gold opacity-10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Public Pool
            </div>
            <div className="text-3xl font-bold text-gradient-gold font-mono mt-2">{formatKsh(pool.public_pool_balance)}</div>
            <button onClick={() => inject('public')}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              + Inject to Public
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-purple opacity-10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Reserve Pool
            </div>
            <div className="text-3xl font-bold font-mono text-white mt-2">{formatKsh(pool.reserve_pool_balance)}</div>
            <button onClick={() => inject('reserve')}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(124,58,237,0.2)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.4)' }}>
              + Inject to Reserve
            </button>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <label className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          Inject Amount (Ksh)
        </label>
        <input type="number" value={injectAmount} onChange={(e) => setInjectAmount(e.target.value)}
          className="mt-2 w-full px-4 py-3 rounded-xl text-white font-mono text-lg font-bold"
          style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(247,147,26,0.2)' }} />
        <div className="flex gap-2 mt-3">
          {[100000, 500000, 1000000, 5000000].map((v) => (
            <button key={v} onClick={() => setInjectAmount(String(v))}
              className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
              {(v / 1000)}K
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold text-white mb-4">Pool Configuration</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Sold-Out Floor
            </label>
            <input type="number" value={pool.sold_out_floor}
              onChange={(e) => store.adminUpdatePool({ sold_out_floor: parseFloat(e.target.value) || 0 })}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Batch Size
            </label>
            <input type="number" value={pool.batch_size}
              onChange={(e) => store.adminUpdatePool({ batch_size: parseFloat(e.target.value) || 0 })}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
        <button onClick={() => store.adminReleaseBatch()}
          className="mt-4 w-full py-3 rounded-xl font-bold glow-gold"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          Release Batch ({formatKsh(pool.batch_size)})
        </button>
      </div>
    </div>
  )
}

// ─── ORDERS MANAGEMENT ────────────────────────────────────
function OrdersTab() {
  const orders = useStore((s) => s.orders)

  if (orders.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p style={{ color: 'var(--muted-foreground)' }}>No orders yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <div key={o.id} className="glass rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="font-semibold text-white">{o.plan_name}</div>
            <div className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>#{o.id}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Invested</div>
              <div className="font-mono font-semibold text-white">{formatKsh(o.amount_invested)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Return</div>
              <div className="font-mono font-semibold text-green-400">{formatKsh(o.expected_return)}</div>
            </div>
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase`}
              style={{
                background: o.status === 'active' ? 'rgba(247,147,26,0.15)' : 'rgba(74,222,128,0.15)',
                color: o.status === 'active' ? 'var(--primary)' : '#4ade80',
              }}>
              {o.status}
            </span>
            {o.status === 'active' && (
              <button onClick={() => store.adminForceMaturity(o.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
                Force Mature
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── WITHDRAWALS ──────────────────────────────────────────
function WithdrawalsTab() {
  const withdrawals = useStore((s) => s.withdrawals)
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'rejected'>('pending')
  const filtered = filter === 'all' ? withdrawals : withdrawals.filter((w) => w.status === filter)

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-2 flex gap-1">
        {(['pending', 'paid', 'rejected', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="flex-1 py-2 rounded-lg text-xs font-bold uppercase"
            style={{
              background: filter === f ? 'var(--gradient-gold)' : 'transparent',
              color: filter === f ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            }}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ color: 'var(--muted-foreground)' }}>No {filter} withdrawals</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((w) => (
            <div key={w.id} className="glass rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-bold text-white font-mono">{formatKsh(w.amount)}</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>To {w.phone}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase`}
                  style={{
                    background: w.status === 'pending' ? 'rgba(251,191,36,0.15)' :
                      w.status === 'paid' ? 'rgba(74,222,128,0.15)' :
                        'rgba(239,68,68,0.15)',
                    color: w.status === 'pending' ? '#fbbf24' :
                      w.status === 'paid' ? '#4ade80' : '#ef4444',
                  }}>
                  {w.status}
                </span>
                {w.status === 'pending' && (
                  <>
                    <button onClick={() => store.adminApproveWithdrawal(w.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                      style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => store.adminRejectWithdrawal(w.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ANALYTICS ────────────────────────────────────────────
function AnalyticsTab() {
  const users = useStore((s) => s.admin_users)
  const plans = useStore((s) => s.plans)

  const userGrowth = [
    { day: 'Mon', users: 12 }, { day: 'Tue', users: 19 }, { day: 'Wed', users: 24 },
    { day: 'Thu', users: 35 }, { day: 'Fri', users: 42 }, { day: 'Sat', users: 55 }, { day: 'Sun', users: 68 },
  ]

  const revenueData = [
    { month: 'Jan', revenue: 120000 }, { month: 'Feb', revenue: 180000 }, { month: 'Mar', revenue: 240000 },
    { month: 'Apr', revenue: 380000 }, { month: 'May', revenue: 520000 },
  ]

  const planDistribution = plans.map((p) => ({ name: p.name, value: Math.floor(Math.random() * 100) + 20 }))
  const COLORS = ['#f5a623', '#7c3aed', '#fbbf24', '#4ade80']

  const topInvestors = [...users].sort((a, b) => b.total_deposited - a.total_deposited).slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold text-white mb-4">User Growth (7d)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" stroke="rgba(136,146,164,0.6)" style={{ fontSize: '11px' }} />
              <YAxis stroke="rgba(136,146,164,0.6)" style={{ fontSize: '11px' }} />
              <Tooltip contentStyle={{ background: 'rgba(20,24,33,0.95)', border: '1px solid rgba(247,147,26,0.3)', borderRadius: '12px' }} />
              <Line type="monotone" dataKey="users" stroke="#f5a623" strokeWidth={3} dot={{ fill: '#f5a623' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" stroke="rgba(136,146,164,0.6)" style={{ fontSize: '11px' }} />
              <YAxis stroke="rgba(136,146,164,0.6)" style={{ fontSize: '11px' }} />
              <Tooltip contentStyle={{ background: 'rgba(20,24,33,0.95)', border: '1px solid rgba(247,147,26,0.3)', borderRadius: '12px' }} />
              <Bar dataKey="revenue" fill="#f5a623" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold text-white mb-4">Plan Popularity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {planDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(20,24,33,0.95)', border: '1px solid rgba(247,147,26,0.3)', borderRadius: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5 text-xs">
            {planDistribution.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  {p.name}
                </span>
                <span className="font-mono" style={{ color: 'var(--muted-foreground)' }}>{p.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold text-white mb-4">Top Investors</h3>
          <div className="space-y-2">
            {topInvestors.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{u.full_name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{u.email}</div>
                </div>
                <div className="font-mono font-bold text-white text-sm">{formatKsh(u.total_deposited)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────
function AnnouncementsTab() {
  const announcements = useStore((s) => s.announcements)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<{ title: string; message: string; type: Announcement['type']; is_active: boolean }>({
    title: '', message: '', type: 'info', is_active: true,
  })

  function submit() {
    if (!form.title || !form.message) return
    store.adminAddAnnouncement(form)
    setForm({ title: '', message: '', type: 'info', is_active: true })
    setCreating(false)
  }

  const typeColors = {
    info: { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
    success: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
    warning: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
    critical: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Active Announcements</h3>
        <button onClick={() => setCreating(!creating)}
          className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 glow-gold"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          <Plus className="w-4 h-4" /> {creating ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {creating && (
        <div className="glass rounded-2xl p-5 space-y-3 animate-slide-up">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Holiday Promotion"
              className="mt-1 w-full px-4 py-3 rounded-xl text-white"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Message</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={3} placeholder="Your announcement message..."
              className="mt-1 w-full px-4 py-3 rounded-xl text-white resize-none"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Type</label>
            <div className="flex gap-2 mt-1">
              {(['info', 'success', 'warning', 'critical'] as const).map((t) => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className="flex-1 py-2 rounded-lg text-xs font-bold capitalize"
                  style={{
                    background: form.type === t ? typeColors[t].bg : 'rgba(0,0,0,0.2)',
                    color: form.type === t ? typeColors[t].color : 'var(--muted-foreground)',
                    border: '1px solid ' + (form.type === t ? typeColors[t].border : 'rgba(255,255,255,0.05)'),
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button onClick={submit}
            className="w-full py-3 rounded-xl font-bold glow-gold"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            Publish Announcement
          </button>
        </div>
      )}

      <div className="space-y-2">
        {announcements.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p style={{ color: 'var(--muted-foreground)' }}>No announcements yet</p>
          </div>
        ) : announcements.map((a) => {
          const c = typeColors[a.type]
          return (
            <div key={a.id} className="glass rounded-2xl p-4" style={{ borderLeft: `4px solid ${c.color}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                      style={{ background: c.bg, color: c.color }}>{a.type}</span>
                    <div className="text-sm font-bold text-white">{a.title}</div>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--muted-foreground)' }}>{a.message}</p>
                  <div className="text-[10px] mt-2" style={{ color: 'var(--muted-foreground)' }}>
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => store.adminToggleAnnouncement(a.id)}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: a.is_active ? 'rgba(74,222,128,0.15)' : 'rgba(136,146,164,0.15)', color: a.is_active ? '#4ade80' : 'var(--muted-foreground)' }}>
                    {a.is_active ? 'LIVE' : 'OFF'}
                  </button>
                  <button onClick={() => store.adminDeleteAnnouncement(a.id)}
                    className="p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SYSTEM SETTINGS ──────────────────────────────────────
function SettingsTab() {
  const settings = useStore((s) => s.settings)

  const toggles: { key: keyof typeof settings; label: string; description: string }[] = [
    { key: 'deposits_enabled', label: 'Deposits Enabled', description: 'Allow users to deposit funds' },
    { key: 'withdrawals_enabled', label: 'Withdrawals Enabled', description: 'Allow users to request withdrawals' },
    { key: 'registrations_enabled', label: 'Registrations Open', description: 'Allow new user signups' },
    { key: 'sale_open', label: 'Share Sale Window', description: 'Allow share purchases' },
    { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Show maintenance banner platform-wide' },
  ]

  const numbers: { key: keyof typeof settings; label: string; suffix?: string }[] = [
    { key: 'min_deposit', label: 'Minimum Deposit', suffix: 'Ksh' },
    { key: 'max_deposit', label: 'Maximum Deposit', suffix: 'Ksh' },
    { key: 'min_withdrawal', label: 'Minimum Withdrawal', suffix: 'Ksh' },
    { key: 'referral_bonus_percent', label: 'Referral Bonus', suffix: '%' },
  ]

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          Platform Toggles
        </h3>
        <div className="space-y-2">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div>
                <div className="text-sm font-semibold text-white">{t.label}</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{t.description}</div>
              </div>
              <button onClick={() => store.updateSettings({ [t.key]: !settings[t.key] })}
                className="relative w-12 h-6 rounded-full transition-all"
                style={{ background: settings[t.key] ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}>
                <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: settings[t.key] ? '26px' : '4px' }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          Financial Limits
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {numbers.map((n) => (
            <div key={n.key}>
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                {n.label} {n.suffix && `(${n.suffix})`}
              </label>
              <input type="number" value={settings[n.key] as number}
                onChange={(e) => store.updateSettings({ [n.key]: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
                style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── ACTIVITY LOGS ────────────────────────────────────────
function LogsTab() {
  const logs = useStore((s) => s.activity_logs)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Recent Activity ({logs.length})</h3>
        <button onClick={() => { if (confirm('Clear all logs?')) store.adminClearActivityLogs() }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          <Trash2 className="w-3 h-3" /> Clear Logs
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ color: 'var(--muted-foreground)' }}>No activity logged yet</p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-2 max-h-[600px] overflow-y-auto">
          {logs.map((l) => (
            <div key={l.id} className="p-3 rounded-lg hover:bg-white/5 flex items-start gap-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(247,147,26,0.15)', color: 'var(--primary)' }}>
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-semibold text-white">{l.action}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--muted-foreground)' }}>
                    {l.target}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{l.details}</div>
                <div className="text-[10px] mt-1 font-mono" style={{ color: 'rgba(136,146,164,0.6)' }}>
                  {l.admin_email} · {new Date(l.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SECURITY MONITORING ──────────────────────────────────
function SecurityTab() {
  const events = useStore((s) => s.security_events)
  const attempts = useStore((s) => s.login_attempts)
  const lockoutUntil = useStore((s) => s.lockout_until)
  const users = useStore((s) => s.admin_users)
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')

  const filtered = filter === 'all' ? events : events.filter((e) => e.severity === filter)

  const stats = {
    failed_logins_24h: attempts.filter((a) => !a.success && a.timestamp > Date.now() - 86400000).length,
    locked_accounts: lockoutUntil && lockoutUntil > Date.now() ? 1 : 0,
    critical_events: events.filter((e) => e.severity === 'critical').length,
    flagged_users: users.filter((u) => (u as any).flagged).length,
  }

  const severityColors = {
    info: { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
    warning: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
    critical: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>Failed logins (24h)</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{stats.failed_logins_24h}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>Locked accounts</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{stats.locked_accounts}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>Critical events</div>
          <div className="text-2xl font-bold font-mono mt-1" style={{ color: stats.critical_events > 0 ? '#ef4444' : 'white' }}>
            {stats.critical_events}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>Flagged users</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{stats.flagged_users}</div>
        </div>
      </div>

      {/* Lockout control */}
      {lockoutUntil && lockoutUntil > Date.now() && (
        <div className="glass rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap"
          style={{ border: '1px solid rgba(239,68,68,0.4)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Account locked</div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Locked until {new Date(lockoutUntil).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <button onClick={() => store.clearLockout()}
            className="px-4 py-2 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(247,147,26,0.15)', color: 'var(--primary)', border: '1px solid rgba(247,147,26,0.3)' }}>
            Unlock Now
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="glass rounded-2xl p-2 flex gap-1 overflow-x-auto">
        {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap"
            style={{
              background: filter === f ? 'var(--gradient-gold)' : 'transparent',
              color: filter === f ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* Event feed */}
      <div className="glass rounded-2xl p-2 max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p style={{ color: 'var(--muted-foreground)' }}>No security events</p>
          </div>
        ) : filtered.map((e) => {
          const c = severityColors[e.severity]
          return (
            <div key={e.id} className="p-3 rounded-lg flex items-start gap-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ background: c.bg, color: c.color }}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-semibold text-white capitalize">{e.type.replace(/_/g, ' ')}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                    style={{ background: c.bg, color: c.color }}>{e.severity}</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{e.details}</div>
                <div className="text-[10px] mt-1 font-mono" style={{ color: 'rgba(136,146,164,0.6)' }}>
                  {e.email} · {new Date(e.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
