import { useState, useMemo, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import {
  Shield, Users, Package, Droplets, BarChart3, Megaphone, Settings as SettingsIcon,
  ScrollText, Wallet, FileText, Search, Edit2, Trash2, UserX, UserCheck, Plus,
  Check, X, AlertTriangle, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  Activity, DollarSign, Clock, ArrowLeft, Home, RefreshCw, MessageCircle, Send,
  Briefcase, Download, MapPin, Phone, Mail, GraduationCap, Palette,
} from 'lucide-react'
import { formatKsh, store, useStore, type Plan, type AdminUser, type Announcement } from '@/lib/cointap-store'
import { adminApi, adminChatApi, adminCareersApi } from '@/lib/api'
import { QrGenerator } from '@/components/cointap/QrGenerator'
import { ReferralBadge } from '@/components/cointap/ReferralBadge'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

type Tab = 'overview' | 'users' | 'plans' | 'pool' | 'orders' | 'withdrawals' | 'chat' | 'careers' | 'analytics' | 'announcements' | 'settings' | 'logs' | 'security'

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'plans', label: 'Plans', icon: Package },
  { key: 'pool', label: 'Pool', icon: Droplets },
  { key: 'orders', label: 'Orders', icon: FileText },
  { key: 'withdrawals', label: 'Withdrawals', icon: Wallet },
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'careers', label: 'Careers', icon: Briefcase },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
  { key: 'logs', label: 'Activity Logs', icon: ScrollText },
]

export function Admin() {
  const user = useStore((s) => s.user)
  const [tab, setTab] = useState<Tab>('overview')
  const [chatUnread, setChatUnread] = useState(0)

  // Poll the global chat-unread badge every 15s while admin is in this view
  useEffect(() => {
    if (!user || user.role !== 'admin') return
    let cancelled = false
    async function fetchUnread() {
      try {
        const data = await adminChatApi.unreadCount()
        if (!cancelled) setChatUnread(Number(data?.unread || 0))
      } catch { /* silent */ }
    }
    fetchUnread()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchUnread()
    }, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [user])

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
            const showBadge = t.key === 'chat' && chatUnread > 0
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="relative px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap flex items-center gap-2 transition-all"
                style={{
                  background: active ? 'var(--gradient-gold)' : 'transparent',
                  color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                }}>
                <Icon className="w-4 h-4" />
                {t.label}
                {showBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ background: '#ef4444' }}>
                    {chatUnread > 9 ? '9+' : chatUnread}
                  </span>
                )}
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
        {tab === 'chat' && <ChatTab />}
        {tab === 'careers' && <CareersTab />}
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
  const [viewing, setViewing] = useState<any | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [toast, setToast] = useState('')

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

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function toggleSuspend(u: any) {
    setBusyId(u.id)
    try {
      const res = await adminApi.suspendUser(u.id)
      flash(res.suspended ? `${u.full_name} suspended` : `${u.full_name} unsuspended`)
      await load()
    } catch (e: any) {
      flash(e?.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(u: any) {
    if (!confirm(`PERMANENTLY DELETE ${u.full_name} (${u.email})?\n\nThis cannot be undone. If they have active orders or pending withdrawals, deletion will be blocked.`)) return
    setBusyId(u.id)
    try {
      await adminApi.deleteUser(u.id)
      flash(`${u.full_name} deleted`)
      await load()
    } catch (e: any) {
      flash(e?.message || 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  if (loading && users.length === 0) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white animate-slide-up"
          style={{ background: 'rgba(247,147,26,0.95)' }}>
          {toast}
        </div>
      )}

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
            const refCount = u.referral_count ?? 0
            const activeRefs = u.active_referral_count ?? 0
            return (
              <div key={u.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <button onClick={() => setViewing(u)}
                      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white hover:scale-110 transition-transform"
                      style={{ background: 'var(--gradient-gold)' }}>
                      {u.full_name.split(' ').map((p: string) => p[0]).slice(0, 2).join('')}
                    </button>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
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
                    <div className="text-right">
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Refs</div>
                      <div className="font-mono font-bold text-white flex items-center gap-1.5 justify-end">
                        {(u as any).badge?.tier && (
                          <ReferralBadge data={(u as any).badge} size="sm" />
                        )}
                        {refCount === 0 && !(u as any).badge?.tier && (
                          <span>{refCount} <span className="text-[10px] text-green-400">({activeRefs} active)</span></span>
                        )}
                        {refCount > 0 && (
                          <span className="text-[10px] text-green-400">{activeRefs} inv</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setViewing(u)} disabled={busyId === u.id}
                      className="p-2 rounded-lg hover:opacity-80 disabled:opacity-50" title="View details"
                      style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                      <Search className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditing(u)} disabled={busyId === u.id}
                      className="p-2 rounded-lg hover:opacity-80 disabled:opacity-50" title="Adjust wallet"
                      style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {u.role !== 'admin' && (
                      <>
                        <button onClick={() => toggleSuspend(u)} disabled={busyId === u.id}
                          className="p-2 rounded-lg hover:opacity-80 disabled:opacity-50"
                          title={u.is_active ? 'Suspend (blacklist)' : 'Unsuspend'}
                          style={{
                            background: u.is_active ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)',
                            color: u.is_active ? '#fbbf24' : '#4ade80',
                          }}>
                          {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button onClick={() => remove(u)} disabled={busyId === u.id}
                          className="p-2 rounded-lg hover:opacity-80 disabled:opacity-50" title="Delete user"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && <WalletAdjustModal user={editing} onClose={() => { setEditing(null); load() }} />}
      {viewing && <UserDetailModal userId={viewing.id} onClose={() => setViewing(null)} />}
    </div>
  )
}

function UserDetailModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const data = await adminApi.userDetail(userId)
        setUser(data.user)
      } catch (e: any) {
        setError(e?.message || 'Failed to load user')
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }} onClick={onClose}>
      <div className="glass rounded-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">User Details</h3>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={() => {}} />}

        {user && (
          <div className="space-y-4">
            {/* Identity */}
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
                style={{ background: 'var(--gradient-gold)' }}>
                {user.full_name.split(' ').map((p: string) => p[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white">{user.full_name}</div>
                <div className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{user.email}</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{user.phone}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Stat label="Wallet Balance" value={formatKsh(Number(user.wallet?.balance ?? 0))} />
              <Stat label="Total Deposited" value={formatKsh(Number(user.wallet?.total_deposited ?? 0))} />
              <Stat label="Total Earned" value={formatKsh(Number(user.wallet?.total_earned ?? 0))} />
              <Stat label="Total Withdrawn" value={formatKsh(Number(user.wallet?.total_withdrawn ?? 0))} />
              <Stat label="Orders" value={String(user.order_count ?? 0)} />
              <Stat label="Referral Code" value={user.referral_code || '—'} />
            </div>

            {/* Referrals */}
            <div>
              <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                Referrals ({user.referral_count})
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto"
                  style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                  {user.active_referral_count} ACTIVE
                </span>
              </h4>
              {user.referrals && user.referrals.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {user.referrals.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-lg text-xs"
                      style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <div>
                        <div className="text-white font-semibold">{r.referred_name}</div>
                        <div style={{ color: 'var(--muted-foreground)' }}>{r.referred_email}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                          style={{
                            background: r.status === 'credited' ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)',
                            color: r.status === 'credited' ? '#4ade80' : '#fbbf24',
                          }}>
                          {r.status}
                        </span>
                        {r.bonus_amount > 0 && (
                          <div className="font-mono text-green-400 mt-0.5">+{formatKsh(r.bonus_amount)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center py-4" style={{ color: 'var(--muted-foreground)' }}>
                  This user hasn't referred anyone yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
      <div className="font-mono font-bold text-white text-sm mt-0.5">{value}</div>
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
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await fetch('/api/plans/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cointap_access')}` },
      }).then((r) => r.json())
      setPlans(data.plans || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function toggleActive(p: any) {
    setBusyId(p.id)
    try {
      await adminApi.updatePlan(p.id, { is_active: !p.is_active })
      flash(`Plan ${p.is_active ? 'disabled' : 'enabled'}`)
      await load()
    } catch (e: any) {
      flash(e?.message || 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(p: any) {
    if (!confirm(`Permanently delete "${p.name}"?\n\nIf any active orders use this plan, deletion will be blocked — disable it instead.`)) return
    setBusyId(p.id)
    try {
      await adminApi.deletePlan(p.id)
      flash(`Plan "${p.name}" deleted`)
      await load()
    } catch (e: any) {
      flash(e?.message || 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  if (loading && plans.length === 0) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white animate-slide-up"
          style={{ background: 'rgba(247,147,26,0.95)' }}>
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">All Plans ({plans.length})</h3>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => setCreating(true)}
            className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 glow-gold"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            <Plus className="w-4 h-4" /> New Plan
          </button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ color: 'var(--muted-foreground)' }}>No plans yet. Create one to get started.</p>
        </div>
      ) : (
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

              <div className="text-3xl font-bold text-gradient-gold font-mono">{Number(p.profit_percent)}%</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                in {p.duration_days} days
              </div>

              <div className="mt-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-foreground)' }}>Min</span>
                  <span className="font-mono text-white">{formatKsh(Number(p.min_amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted-foreground)' }}>Max</span>
                  <span className="font-mono text-white">{formatKsh(Number(p.max_amount))}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditing(p)} disabled={busyId === p.id}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
                  Edit
                </button>
                <button onClick={() => toggleActive(p)} disabled={busyId === p.id}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
                  {p.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => remove(p)} disabled={busyId === p.id}
                  className="p-2 rounded-lg disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <PlanEditModal
          plan={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSaved={(msg) => { flash(msg); load() }}
        />
      )}
    </div>
  )
}

function PlanEditModal({ plan, onClose, onSaved }: { plan: any | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState({
    name: plan?.name || '',
    duration_days: Number(plan?.duration_days || 7),
    profit_percent: Number(plan?.profit_percent || 25),
    min_amount: Number(plan?.min_amount || 500),
    max_amount: Number(plan?.max_amount || 50000),
    is_active: plan?.is_active ?? true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (!form.name.trim()) { setError('Plan name is required'); return }
    if (form.duration_days < 1) { setError('Duration must be at least 1 day'); return }
    if (form.profit_percent <= 0) { setError('Profit percent must be greater than 0'); return }
    if (form.min_amount < 0 || form.max_amount < 0) { setError('Amounts cannot be negative'); return }
    if (form.min_amount > form.max_amount) { setError('Min amount cannot exceed max amount'); return }

    setBusy(true)
    try {
      if (plan) {
        await adminApi.updatePlan(plan.id, form)
        onSaved(`Plan "${form.name}" updated`)
      } else {
        await adminApi.createPlan(form)
        onSaved(`Plan "${form.name}" created`)
      }
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
      setBusy(false)
    }
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

          {error && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button onClick={submit} disabled={busy}
            className="w-full py-3 rounded-xl font-bold glow-gold disabled:opacity-60"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {busy ? 'Saving…' : plan ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── POOL MANAGEMENT ──────────────────────────────────────
function PoolTab() {
  const [pool, setPool] = useState<any | null>(null)
  const [draft, setDraft] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await fetch('/api/pool/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cointap_access')}` },
      }).then((r) => r.json())
      const p = data.pool || data
      setPool(p)
      setDraft({
        public_pool_balance: Number(p.public_pool_balance || 0),
        reserve_pool_balance: Number(p.reserve_pool_balance || 0),
        sold_out_floor: Number(p.sold_out_floor || 0),
        batch_release_amount: Number(p.batch_release_amount || 0),
        auto_replenish_enabled: !!p.auto_replenish_enabled,
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to load pool')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function set(key: string, value: any) {
    setDraft({ ...draft, [key]: value })
  }

  async function inject(target: 'public' | 'reserve', amount: number) {
    if (!amount || amount <= 0) return
    const key = target === 'public' ? 'public_pool_balance' : 'reserve_pool_balance'
    setSaving(true)
    try {
      const newVal = Number(pool[key] || 0) + amount
      await adminApi.updatePool({ [key]: newVal })
      flash(`Injected ${formatKsh(amount)} into ${target} pool`)
      await load()
    } catch (e: any) {
      flash(e?.message || 'Inject failed')
    } finally {
      setSaving(false)
    }
  }

  async function saveAll() {
    if (!draft) return
    setSaving(true)
    try {
      await adminApi.updatePool(draft)
      flash('Pool settings saved')
      await load()
    } catch (e: any) {
      flash(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function releaseBatch() {
    setReleasing(true)
    try {
      await adminApi.releaseBatch()
      flash('Batch released from reserve → public')
      await load()
    } catch (e: any) {
      flash(e?.message || 'Release failed')
    } finally {
      setReleasing(false)
    }
  }

  if (loading && !pool) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!pool || !draft) return null

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white animate-slide-up"
          style={{ background: 'rgba(247,147,26,0.95)' }}>
          {toast}
        </div>
      )}

      {/* Live balances */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-gold opacity-10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Public Pool (live)
            </div>
            <div className="text-3xl font-bold text-gradient-gold font-mono mt-2">
              {formatKsh(Number(pool.public_pool_balance))}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-purple opacity-10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Reserve Pool (live)
            </div>
            <div className="text-3xl font-bold font-mono text-white mt-2">
              {formatKsh(Number(pool.reserve_pool_balance))}
            </div>
          </div>
        </div>
      </div>

      {/* Editable form */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold text-white mb-4 flex items-center justify-between">
          <span>Pool Settings</span>
          <button onClick={load} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </h3>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Public Pool Balance
            </label>
            <input type="number" value={draft.public_pool_balance}
              onChange={(e) => set('public_pool_balance', parseFloat(e.target.value) || 0)}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Reserve Pool Balance
            </label>
            <input type="number" value={draft.reserve_pool_balance}
              onChange={(e) => set('reserve_pool_balance', parseFloat(e.target.value) || 0)}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Sold-Out Floor
            </label>
            <input type="number" value={draft.sold_out_floor}
              onChange={(e) => set('sold_out_floor', parseFloat(e.target.value) || 0)}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Batch Release Amount
            </label>
            <input type="number" value={draft.batch_release_amount}
              onChange={(e) => set('batch_release_amount', parseFloat(e.target.value) || 0)}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>

        <label className="flex items-center gap-2 mt-4 text-sm text-white cursor-pointer">
          <input type="checkbox" checked={draft.auto_replenish_enabled}
            onChange={(e) => set('auto_replenish_enabled', e.target.checked)}
            className="w-4 h-4" />
          Auto-replenish enabled (scheduler releases batches automatically)
        </label>

        <button onClick={saveAll} disabled={saving}
          className="mt-5 w-full py-3 rounded-xl font-bold glow-gold disabled:opacity-60"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          {saving ? 'Saving…' : 'Save Pool Settings'}
        </button>
      </div>

      {/* Inject + Release actions */}
      <PoolInjectControls onInject={inject} saving={saving} />

      <button onClick={releaseBatch} disabled={releasing}
        className="w-full py-3 rounded-xl font-bold disabled:opacity-60"
        style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}>
        {releasing ? 'Releasing…' : `Release Batch from Reserve → Public (${formatKsh(Number(pool.batch_release_amount || 0))})`}
      </button>
    </div>
  )
}

function PoolInjectControls({ onInject, saving }: { onInject: (target: 'public' | 'reserve', amount: number) => void; saving: boolean }) {
  const [injectAmount, setInjectAmount] = useState('100000')
  const a = parseFloat(injectAmount) || 0

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-bold text-white mb-3">Quick Inject Funds</h3>
      <label className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
        Amount (Ksh)
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
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={() => onInject('public', a)} disabled={saving || a <= 0}
          className="py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          + Inject to Public
        </button>
        <button onClick={() => onInject('reserve', a)} disabled={saving || a <= 0}
          className="py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: 'rgba(124,58,237,0.2)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.4)' }}>
          + Inject to Reserve
        </button>
      </div>
    </div>
  )
}

// ─── ORDERS MANAGEMENT ────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'Active' | 'Matured' | 'Settled' | 'Cancelled' | ''>('Active')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await adminApi.orders(filter)
      setOrders(data.orders || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function forceMature(o: any) {
    if (!confirm(`Force order #${o.id} to mature now? The user's wallet will be credited with ${formatKsh(Number(o.expected_return))}.`)) return
    setBusyId(o.id)
    try {
      await adminApi.forceMature(o.id)
      flash(`Order #${o.id} matured + settled`)
      await load()
    } catch (e: any) {
      flash(e?.message || 'Force-mature failed')
    } finally {
      setBusyId(null)
    }
  }

  async function cancel(o: any) {
    if (!confirm(`Cancel order #${o.id}?\n\nThe user will be refunded ${formatKsh(Number(o.amount_invested))}. This cannot be undone.`)) return
    setBusyId(o.id)
    try {
      await adminApi.cancelOrder(o.id)
      flash(`Order #${o.id} cancelled + user refunded`)
      await load()
    } catch (e: any) {
      flash(e?.message || 'Cancel failed')
    } finally {
      setBusyId(null)
    }
  }

  const TABS: { key: typeof filter; label: string }[] = [
    { key: 'Active', label: 'Active' },
    { key: 'Matured', label: 'Matured' },
    { key: 'Settled', label: 'Settled' },
    { key: 'Cancelled', label: 'Cancelled' },
    { key: '', label: 'All' },
  ]

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white animate-slide-up"
          style={{ background: 'rgba(247,147,26,0.95)' }}>
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="glass rounded-2xl p-2 flex gap-1 flex-1">
          {TABS.map((t) => (
            <button key={t.label} onClick={() => setFilter(t.key)}
              className="flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all"
              style={{
                background: filter === t.key ? 'var(--gradient-gold)' : 'transparent',
                color: filter === t.key ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              }}>
              {t.label}
            </button>
          ))}
          <button onClick={load} className="px-3 rounded-lg" title="Refresh"
            style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <button onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 glow-gold"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          <Plus className="w-4 h-4" /> Create on behalf
        </button>
      </div>

      {loading && orders.length === 0 ? <LoadingState /> :
       error ? <ErrorState message={error} onRetry={load} /> :
       orders.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ color: 'var(--muted-foreground)' }}>No {filter ? filter.toLowerCase() : ''} orders</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const status = String(o.status).toLowerCase()
            return (
              <div key={o.id} className="glass rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-white">{o.plan_name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    <span className="font-semibold text-white">{o.user_name || `User #${o.user_id}`}</span>
                    {o.user_email && <> · {o.user_email}</>}
                  </div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    Order #{o.id} · {o.starts_at && new Date(o.starts_at).toLocaleDateString()} → {o.matures_at && new Date(o.matures_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-right">
                    <div className="text-[10px] uppercase" style={{ color: 'var(--muted-foreground)' }}>Invested</div>
                    <div className="font-mono font-semibold text-white text-sm">{formatKsh(Number(o.amount_invested))}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase" style={{ color: 'var(--muted-foreground)' }}>Return</div>
                    <div className="font-mono font-semibold text-green-400 text-sm">{formatKsh(Number(o.expected_return))}</div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase"
                    style={{
                      background:
                        status === 'active' ? 'rgba(247,147,26,0.15)' :
                        status === 'matured' ? 'rgba(56,189,248,0.15)' :
                        status === 'settled' ? 'rgba(74,222,128,0.15)' :
                        'rgba(239,68,68,0.15)',
                      color:
                        status === 'active' ? 'var(--primary)' :
                        status === 'matured' ? '#38bdf8' :
                        status === 'settled' ? '#4ade80' : '#ef4444',
                    }}>
                    {o.status}
                  </span>
                  {(status === 'active' || status === 'matured') && (
                    <>
                      <button onClick={() => forceMature(o)} disabled={busyId === o.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                        style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
                        Force Mature
                      </button>
                      <button onClick={() => cancel(o)} disabled={busyId === o.id}
                        className="p-1.5 rounded-lg disabled:opacity-50" title="Cancel + refund"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {creating && (
        <CreateOrderModal onClose={() => setCreating(false)} onCreated={(msg) => { flash(msg); load() }} />
      )}
    </div>
  )
}

function CreateOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: (msg: string) => void }) {
  const [users, setUsers] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [userId, setUserId] = useState<string>('')
  const [planId, setPlanId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const [u, p] = await Promise.all([adminApi.users(1, ''), fetch('/api/plans/', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('cointap_access')}` },
        }).then((r) => r.json())])
        setUsers(u.users || [])
        setPlans(p.plans || [])
      } catch (e: any) {
        setError(e?.message || 'Failed to load users/plans')
      }
    })()
  }, [])

  const selectedUser = users.find((u) => String(u.id) === userId)
  const selectedPlan = plans.find((p) => String(p.id) === planId)
  const a = parseFloat(amount) || 0

  async function submit() {
    setError('')
    if (!userId) { setError('Pick a user'); return }
    if (!planId) { setError('Pick a plan'); return }
    if (a <= 0) { setError('Enter an amount'); return }
    setBusy(true)
    try {
      await adminApi.createOrder(Number(userId), Number(planId), a)
      onCreated(`Order created for ${selectedUser?.full_name}`)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Create failed')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }} onClick={onClose}>
      <div className="glass rounded-3xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Create Order on Behalf</h3>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>User</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="">— Select user —</option>
              {users.filter((u) => u.role !== 'admin').map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email}) — Wallet: {formatKsh(Number(u.wallet?.balance ?? 0))}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Plan</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="">— Select plan —</option>
              {plans.filter((p) => p.is_active).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({Number(p.profit_percent)}% / {p.duration_days}d) — {formatKsh(Number(p.min_amount))} → {formatKsh(Number(p.max_amount))}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Amount (Ksh)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder={selectedPlan ? `Between ${formatKsh(Number(selectedPlan.min_amount))} and ${formatKsh(Number(selectedPlan.max_amount))}` : ''}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          {selectedPlan && a > 0 && (
            <div className="rounded-xl p-3 text-xs"
              style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div className="flex justify-between mb-1">
                <span style={{ color: 'var(--muted-foreground)' }}>Expected return</span>
                <span className="font-mono font-bold text-green-400">
                  {formatKsh(a + (a * Number(selectedPlan.profit_percent)) / 100)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Matures in</span>
                <span className="font-mono text-white">{selectedPlan.duration_days} days</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button onClick={submit} disabled={busy}
            className="w-full py-3 rounded-xl font-bold glow-gold disabled:opacity-60"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {busy ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── WITHDRAWALS ──────────────────────────────────────────
function WithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'Pending' | 'Paid' | 'Rejected' | ''>('Pending')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      // Backend expects capitalized status — '' means All
      const data = await adminApi.withdrawals(filter)
      setWithdrawals(data.withdrawals || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load withdrawals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function approve(w: any) {
    if (!confirm(`Approve withdrawal of ${formatKsh(Number(w.amount))} to ${w.phone}?\n\nThis triggers M-Pesa B2C payout.`)) return
    setBusyId(w.id)
    try {
      await adminApi.approveWithdrawal(w.id)
      flash('Withdrawal approved — payout initiated')
      await load()
    } catch (e: any) {
      flash(e?.message || 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  async function reject(w: any) {
    const reason = prompt('Reason for rejection?', 'Insufficient verification')
    if (reason === null) return
    setBusyId(w.id)
    try {
      await adminApi.rejectWithdrawal(w.id, reason)
      flash('Withdrawal rejected — funds returned to user wallet')
      await load()
    } catch (e: any) {
      flash(e?.message || 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  const TABS: { key: typeof filter; label: string }[] = [
    { key: 'Pending', label: 'Pending' },
    { key: 'Paid', label: 'Paid' },
    { key: 'Rejected', label: 'Rejected' },
    { key: '', label: 'All' },
  ]

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white animate-slide-up"
          style={{ background: 'rgba(247,147,26,0.95)' }}>
          {toast}
        </div>
      )}

      <div className="glass rounded-2xl p-2 flex gap-1">
        {TABS.map((t) => (
          <button key={t.label} onClick={() => setFilter(t.key)}
            className="flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all"
            style={{
              background: filter === t.key ? 'var(--gradient-gold)' : 'transparent',
              color: filter === t.key ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
            }}>
            {t.label}
          </button>
        ))}
        <button onClick={load} className="px-3 rounded-lg" title="Refresh"
          style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading && withdrawals.length === 0 ? <LoadingState /> :
       error ? <ErrorState message={error} onRetry={load} /> :
       withdrawals.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ color: 'var(--muted-foreground)' }}>
            No {filter ? filter.toLowerCase() : ''} withdrawals
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {withdrawals.map((w) => {
            const status = String(w.status).toLowerCase()
            return (
              <div key={w.id} className="glass rounded-2xl p-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white font-mono text-lg">{formatKsh(Number(w.amount))}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    <span className="font-semibold text-white">{w.user_name || `User #${w.user_id}`}</span>
                    {w.user_email && <> · {w.user_email}</>}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    To {w.phone}
                    {w.requested_at && <> · {new Date(w.requested_at).toLocaleString()}</>}
                  </div>
                  {w.admin_note && (
                    <div className="text-xs mt-1 italic" style={{ color: '#fbbf24' }}>
                      Note: {w.admin_note}
                    </div>
                  )}
                  {w.mpesa_reference && (
                    <div className="text-[10px] font-mono mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      Ref: {w.mpesa_reference}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase"
                    style={{
                      background:
                        status === 'pending' ? 'rgba(251,191,36,0.15)' :
                        status === 'processing' ? 'rgba(56,189,248,0.15)' :
                        status === 'paid' ? 'rgba(74,222,128,0.15)' :
                        'rgba(239,68,68,0.15)',
                      color:
                        status === 'pending' ? '#fbbf24' :
                        status === 'processing' ? '#38bdf8' :
                        status === 'paid' ? '#4ade80' : '#ef4444',
                    }}>
                    {w.status}
                  </span>
                  {(status === 'pending' || status === 'processing') && (
                    <>
                      <button onClick={() => approve(w)} disabled={busyId === w.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                        style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => reject(w)} disabled={busyId === w.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
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
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<any | null>(null)  // null = closed; {} = new; {id,...} = edit
  const [busyId, setBusyId] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await adminApi.listAnnouncements()
      setAnnouncements(data.announcements || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function toggleActive(a: any) {
    setBusyId(a.id)
    try {
      await adminApi.updateAnnouncement(a.id, { is_active: !a.is_active })
      flash(a.is_active ? 'Hidden from users' : 'Now live to users')
      await load()
    } catch (e: any) {
      flash(e?.message || 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(a: any) {
    if (!confirm(`Delete announcement "${a.title}"?`)) return
    setBusyId(a.id)
    try {
      await adminApi.deleteAnnouncement(a.id)
      flash('Announcement deleted')
      await load()
    } catch (e: any) {
      flash(e?.message || 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  const typeColors: Record<string, { bg: string; color: string; border: string }> = {
    info: { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
    success: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
    warning: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
    critical: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  }

  if (loading && announcements.length === 0) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white animate-slide-up"
          style={{ background: 'rgba(247,147,26,0.95)' }}>
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-bold text-white">Announcements ({announcements.length})</h3>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => setEditor({})}
            className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 glow-gold"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ color: 'var(--muted-foreground)' }}>
            No announcements yet. Create one to display it on user dashboards.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => {
            const c = typeColors[a.type] || typeColors.info
            return (
              <div key={a.id} className="glass rounded-2xl p-4" style={{ borderLeft: `4px solid ${c.color}` }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                        style={{ background: c.bg, color: c.color }}>{a.type}</span>
                      <div className="text-sm font-bold text-white">{a.title}</div>
                    </div>
                    <p className="text-xs mt-1.5 whitespace-pre-wrap" style={{ color: 'var(--muted-foreground)' }}>{a.message}</p>
                    <div className="text-[10px] mt-2" style={{ color: 'var(--muted-foreground)' }}>
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleActive(a)} disabled={busyId === a.id}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold disabled:opacity-50"
                      style={{
                        background: a.is_active ? 'rgba(74,222,128,0.15)' : 'rgba(136,146,164,0.15)',
                        color: a.is_active ? '#4ade80' : 'var(--muted-foreground)',
                      }}>
                      {a.is_active ? 'LIVE' : 'OFF'}
                    </button>
                    <button onClick={() => setEditor(a)} disabled={busyId === a.id}
                      className="p-2 rounded-lg disabled:opacity-50"
                      style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(a)} disabled={busyId === a.id}
                      className="p-2 rounded-lg disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editor && (
        <AnnouncementEditor
          announcement={editor.id ? editor : null}
          typeColors={typeColors}
          onClose={() => setEditor(null)}
          onSaved={(msg) => { flash(msg); load() }}
        />
      )}
    </div>
  )
}

function AnnouncementEditor({
  announcement, typeColors, onClose, onSaved,
}: {
  announcement: any | null
  typeColors: Record<string, { bg: string; color: string; border: string }>
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [form, setForm] = useState({
    title: announcement?.title || '',
    message: announcement?.message || '',
    type: (announcement?.type || 'info') as 'info' | 'success' | 'warning' | 'critical',
    is_active: announcement?.is_active ?? true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.message.trim()) { setError('Message is required'); return }
    setBusy(true)
    try {
      if (announcement) {
        await adminApi.updateAnnouncement(announcement.id, form)
        onSaved('Announcement updated')
      } else {
        await adminApi.createAnnouncement(form)
        onSaved('Announcement published')
      }
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Save failed')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }} onClick={onClose}>
      <div className="glass rounded-3xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">{announcement ? 'Edit' : 'New'} Announcement</h3>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={120} placeholder="e.g. Scheduled maintenance Saturday"
              className="mt-1 w-full px-4 py-3 rounded-xl text-white"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Message</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4} placeholder="What you want users to know..."
              className="mt-1 w-full px-4 py-3 rounded-xl text-white resize-none"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Type</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {(['info', 'success', 'warning', 'critical'] as const).map((t) => (
                <button key={t} onClick={() => setForm({ ...form, type: t })}
                  className="flex-1 py-2 rounded-lg text-xs font-bold capitalize min-w-[70px]"
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

          <label className="flex items-center gap-2 text-sm text-white cursor-pointer pt-2">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4" />
            Active (shown to users immediately)
          </label>

          {error && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button onClick={submit} disabled={busy}
            className="w-full py-3 rounded-xl font-bold glow-gold disabled:opacity-60"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {busy ? 'Saving…' : announcement ? 'Save Changes' : 'Publish Announcement'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CAREERS (job applications) ────────────────────────────
type Application = {
  id: number
  full_name: string
  whatsapp: string
  email: string
  county: string
  school: string
  course: string
  year_of_study: string
  available_remote: string
  has_experience: string
  why_interested: string
  pitch_cointap: string
  position: string
  status: string
  admin_notes: string | null
  has_cv?: boolean
  cv_filename?: string | null
  cv_size_bytes?: number | null
  referrer?: string | null
  ip_address?: string | null
  created_at: string
  updated_at?: string
}

const APP_STATUS_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: '#3b82f6' },
  { key: 'reviewed', label: 'Reviewed', color: '#a78bfa' },
  { key: 'shortlisted', label: 'Shortlisted', color: '#fbbf24' },
  { key: 'contacted', label: 'Contacted', color: '#fb923c' },
  { key: 'hired', label: 'Hired', color: '#4ade80' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444' },
]

function statusMeta(key: string) {
  return APP_STATUS_OPTIONS.find((s) => s.key === key) || { key, label: key, color: '#888' }
}

function CareersTab() {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [apps, setApps] = useState<Application[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Application | null>(null)
  const [showQr, setShowQr] = useState(false)

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await adminCareersApi.list(filter, search)
      setApps(data.applications || [])
      setStats(data.stats || {})
    } catch (e: any) {
      setError(e?.message || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])
  useEffect(() => {
    const t = setTimeout(load, 300)   // debounce search
    return () => clearTimeout(t)
  }, [search])

  async function changeStatus(app: Application, newStatus: string) {
    try {
      const data = await adminCareersApi.update(app.id, { status: newStatus })
      setApps((prev) => prev.map((a) => a.id === app.id ? data.application : a))
      if (selected?.id === app.id) setSelected(data.application)
      load()  // refresh stats
    } catch (e: any) {
      alert(e?.message || 'Could not update status')
    }
  }

  async function saveNotes(app: Application, notes: string) {
    try {
      const data = await adminCareersApi.update(app.id, { admin_notes: notes })
      setSelected(data.application)
      setApps((prev) => prev.map((a) => a.id === app.id ? data.application : a))
    } catch (e: any) {
      alert(e?.message || 'Could not save notes')
    }
  }

  async function deleteApp(app: Application) {
    if (!confirm(`Delete application from ${app.full_name}? This cannot be undone.`)) return
    try {
      await adminCareersApi.remove(app.id)
      setApps((prev) => prev.filter((a) => a.id !== app.id))
      if (selected?.id === app.id) setSelected(null)
      load()
    } catch (e: any) {
      alert(e?.message || 'Could not delete')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + stats */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Briefcase className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          Job Applications
          {stats.total > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(247,147,26,0.15)', color: 'var(--primary)' }}>
              {stats.total}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowQr(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
            style={{
              background: 'rgba(247,147,26,0.12)',
              color: 'var(--primary)',
              border: '1px solid rgba(247,147,26,0.3)',
            }}>
            <Palette className="w-3.5 h-3.5" /> QR Code
          </button>
          <button onClick={load}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)' }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {showQr && <QrGenerator onClose={() => setShowQr(false)} />}

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <FilterPill label="All" count={stats.total || 0}
          active={filter === 'all'} onClick={() => setFilter('all')} />
        {APP_STATUS_OPTIONS.map((s) => (
          <FilterPill key={s.key} label={s.label} count={stats[s.key] || 0} color={s.color}
            active={filter === s.key} onClick={() => setFilter(s.key)} />
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--muted-foreground)' }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, school, county…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white"
          style={{ background: 'rgba(30,37,53,0.6)', border: '1px solid rgba(255,255,255,0.1)' }} />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm text-red-400"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Two-pane layout: list + detail */}
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-3">
        {/* List */}
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Loading applications…
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {filter === 'all' ? 'No applications yet.' : `No ${filter} applications.`}
            </div>
          ) : (
            apps.map((a) => (
              <button key={a.id} onClick={() => setSelected(a)}
                className="w-full text-left p-3 rounded-xl transition-all"
                style={selected?.id === a.id ? {
                  background: 'rgba(247,147,26,0.1)',
                  border: '1px solid rgba(247,147,26,0.3)',
                } : {
                  background: 'rgba(30,37,53,0.5)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">{a.full_name}</div>
                    <div className="text-[11px] mt-0.5 flex items-center gap-1.5"
                      style={{ color: 'var(--muted-foreground)' }}>
                      <GraduationCap className="w-3 h-3" />
                      <span className="truncate">{a.school}</span>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-[10px] mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div>
          {selected ? (
            <ApplicationDetail app={selected}
              onStatusChange={(s) => changeStatus(selected, s)}
              onSaveNotes={(n) => saveNotes(selected, n)}
              onDelete={() => deleteApp(selected)} />
          ) : (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(30,37,53,0.3)', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <Briefcase className="w-10 h-10 mx-auto opacity-30" style={{ color: 'var(--primary)' }} />
              <p className="text-sm mt-3" style={{ color: 'var(--muted-foreground)' }}>
                Select an application to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterPill({ label, count, color, active, onClick }: {
  label: string; count: number; color?: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all"
      style={active ? {
        background: color || 'var(--gradient-gold)',
        color: color ? 'white' : 'var(--primary-foreground)',
      } : {
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
      <span>{label}</span>
      {count > 0 && (
        <span className="px-1.5 py-0 rounded-full text-[10px]"
          style={{
            background: active ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
          }}>
          {count}
        </span>
      )}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status)
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: `${meta.color}25`, color: meta.color }}>
      {meta.label}
    </span>
  )
}

function ApplicationDetail({ app, onStatusChange, onSaveNotes, onDelete }: {
  app: Application
  onStatusChange: (s: string) => void
  onSaveNotes: (n: string) => void
  onDelete: () => void
}) {
  const [notes, setNotes] = useState(app.admin_notes || '')
  const [notesDirty, setNotesDirty] = useState(false)

  useEffect(() => {
    setNotes(app.admin_notes || '')
    setNotesDirty(false)
  }, [app.id, app.admin_notes])

  return (
    <div className="rounded-2xl p-4 sm:p-5 space-y-4"
      style={{ background: 'rgba(30,37,53,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-white">{app.full_name}</h3>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Applied {new Date(app.created_at).toLocaleString()}
          </div>
        </div>
        <button onClick={onDelete} aria-label="Delete"
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Status changer */}
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold"
          style={{ color: 'var(--muted-foreground)' }}>Status</div>
        <div className="flex flex-wrap gap-1.5">
          {APP_STATUS_OPTIONS.map((s) => (
            <button key={s.key} onClick={() => onStatusChange(s.key)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={app.status === s.key ? {
                background: s.color, color: 'white',
              } : {
                background: 'rgba(255,255,255,0.04)',
                color: s.color,
                border: `1px solid ${s.color}40`,
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="WhatsApp" value={app.whatsapp}
          href={`https://wa.me/${app.whatsapp.replace(/\D/g, '')}`} />
        <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={app.email}
          href={`mailto:${app.email}`} />
        <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="County" value={app.county} />
        <InfoRow icon={<GraduationCap className="w-3.5 h-3.5" />} label="School" value={app.school} />
        <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Course" value={app.course} />
        <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Year"
          value={app.year_of_study.replace('_', ' ').replace('year ', 'Year ')} />
      </div>

      {/* Role-fit fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <InfoRow label="Remote-ready" value={app.available_remote.replace('_', ' ')} />
        <InfoRow label="Sales experience" value={app.has_experience.replace('_', ' ')} />
      </div>

      {/* Free-text answers */}
      <div className="space-y-3">
        <QuoteBlock label="Why this role?" text={app.why_interested} />
        <QuoteBlock label="Pitch for CoinTap" text={app.pitch_cointap} />
      </div>

      {/* CV download */}
      {app.has_cv && (
        <a href={adminCareersApi.cvUrl(app.id)} target="_blank" rel="noopener"
          className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold no-underline"
          style={{
            background: 'rgba(247,147,26,0.1)',
            color: 'var(--primary)',
            border: '1px solid rgba(247,147,26,0.25)',
          }}>
          <Download className="w-4 h-4" />
          Download CV
          {app.cv_size_bytes && (
            <span className="ml-auto text-[10px] opacity-70">
              {(app.cv_size_bytes / 1024).toFixed(0)} KB
            </span>
          )}
        </a>
      )}

      {/* Admin notes */}
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-1.5 font-semibold flex items-center justify-between"
          style={{ color: 'var(--muted-foreground)' }}>
          <span>Internal notes</span>
          {notesDirty && (
            <button onClick={() => { onSaveNotes(notes); setNotesDirty(false) }}
              className="text-[10px] px-2 py-0.5 rounded normal-case"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              Save
            </button>
          )}
        </div>
        <textarea value={notes}
          onChange={(e) => { setNotes(e.target.value); setNotesDirty(true) }}
          rows={3}
          placeholder="Add notes only the team can see…"
          className="w-full px-3 py-2 rounded-xl text-sm text-white"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }} />
      </div>

      {/* Footer meta */}
      <div className="text-[10px] flex items-center justify-between pt-2"
        style={{ color: 'var(--muted-foreground)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span>ID #{app.id}</span>
        {app.referrer && app.referrer !== 'direct' && <span>via {app.referrer}</span>}
        {app.ip_address && <span className="font-mono">{app.ip_address}</span>}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, href }: {
  icon?: React.ReactNode; label: string; value: string; href?: string
}) {
  const content = (
    <>
      <span className="text-[10px] uppercase tracking-wider opacity-60">{label}</span>
      <span className="text-sm text-white font-medium break-all">{value || '—'}</span>
    </>
  )
  const className = "flex flex-col p-2 rounded-lg"
  const style = { background: 'rgba(0,0,0,0.2)' }
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer"
      className={className + " no-underline hover:opacity-80 transition-opacity"} style={style}>
      <div className="flex items-center gap-1.5 mb-0.5" style={{ color: 'var(--primary)' }}>
        {icon} {content}
      </div>
    </a>
  }
  return <div className={className} style={style}>
    {icon && <div className="flex items-center gap-1.5 mb-0.5" style={{ color: 'var(--primary)' }}>
      {icon}
    </div>}
    {content}
  </div>
}

function QuoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-1 font-semibold"
        style={{ color: 'var(--muted-foreground)' }}>{label}</div>
      <div className="text-sm p-3 rounded-xl whitespace-pre-wrap"
        style={{
          background: 'rgba(247,147,26,0.06)',
          border: '1px solid rgba(247,147,26,0.15)',
          color: 'rgba(255,255,255,0.9)',
        }}>
        {text}
      </div>
    </div>
  )
}

// ─── SYSTEM SETTINGS ──────────────────────────────────────
function SettingsTab() {
  const [settings, setSettings] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await adminApi.getSettings()
      setSettings(data.settings)
    } catch (e: any) {
      setError(e?.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function setToggle(key: string, value: boolean) {
    if (!settings) return
    // Optimistic update
    const previous = settings[key]
    setSettings({ ...settings, [key]: value })
    setSaving(true)
    try {
      const data = await adminApi.updateSettings({ [key]: value })
      setSettings(data.settings)
      flash(`${labelFor(key)}: ${value ? 'enabled' : 'disabled'}`)
    } catch (e: any) {
      // Roll back on failure
      setSettings({ ...settings, [key]: previous })
      flash(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function saveMessage() {
    if (!settings) return
    setSaving(true)
    try {
      const data = await adminApi.updateSettings({ maintenance_message: settings.maintenance_message })
      setSettings(data.settings)
      flash('Maintenance message saved')
    } catch (e: any) {
      flash(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function labelFor(key: string): string {
    const t = TOGGLES.find((x) => x.key === key)
    return t?.label || key
  }

  const TOGGLES: { key: string; label: string; description: string; risky?: boolean }[] = [
    { key: 'deposits_enabled', label: 'Deposits Enabled', description: 'Allow users to deposit funds via M-Pesa' },
    { key: 'withdrawals_enabled', label: 'Withdrawals Enabled', description: 'Allow users to request payouts' },
    { key: 'registrations_open', label: 'Registrations Open', description: 'Allow new user signups' },
    { key: 'share_sale_open', label: 'Share Sale Window', description: 'Allow share purchases (buy orders)' },
    { key: 'careers_open', label: 'Job Applications Open', description: 'When OFF, /apply shows "closed" message' },
    { key: 'milestone_counts_signups', label: 'Milestone Counts Signups', description: 'ON: milestone awards on signup count (growth mode). OFF: counts only invested referrals (default).', risky: true },
    { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Show site-wide banner + block deposits / withdrawals / buys / registration', risky: true },
  ]

  if (loading && !settings) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!settings) return null

  return (
    <div className="space-y-4 relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white animate-slide-up"
          style={{ background: 'rgba(247,147,26,0.95)' }}>
          {toast}
        </div>
      )}

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            Platform Toggles
          </h3>
          <button onClick={load} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)' }}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <div className="space-y-2">
          {TOGGLES.map((t) => {
            const on = !!settings[t.key]
            return (
              <div key={t.key} className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{
                  background: t.risky && on ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.2)',
                  border: t.risky && on ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                }}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    {t.label}
                    {t.risky && on && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{t.description}</div>
                </div>
                <button onClick={() => setToggle(t.key, !on)} disabled={saving}
                  className="relative w-12 h-6 rounded-full transition-all disabled:opacity-50 flex-shrink-0"
                  style={{ background: on ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}>
                  <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: on ? '26px' : '4px' }} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {settings.maintenance_mode && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Maintenance Banner Message
          </h3>
          <textarea value={settings.maintenance_message || ''}
            onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
            rows={3} maxLength={500}
            placeholder="Message displayed at the top of every page..."
            className="w-full px-4 py-3 rounded-xl text-white font-medium text-sm resize-none"
            style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <button onClick={saveMessage} disabled={saving}
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold glow-gold disabled:opacity-60"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {saving ? 'Saving…' : 'Save Message'}
          </button>
        </div>
      )}

      {/* Referral Milestone Bonus */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold text-white mb-1 flex items-center gap-2">
          🎁 Referral Milestone Bonus
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
          One-time bonus credited to a user's wallet when they reach this many
          successful (credited) referrals. Set <span className="text-white font-semibold">0</span> on
          either field to disable.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Referrals Required (Threshold)
            </label>
            <input type="number" min={0} value={settings.referral_milestone_threshold ?? 10}
              onChange={(e) => setSettings({ ...settings, referral_milestone_threshold: parseInt(e.target.value) || 0 })}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
              Bonus Amount (Ksh)
            </label>
            <input type="number" min={0} step="any" value={settings.referral_milestone_amount ?? 100}
              onChange={(e) => setSettings({ ...settings, referral_milestone_amount: parseFloat(e.target.value) || 0 })}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>

        <div className="mt-3 p-3 rounded-xl text-xs"
          style={{ background: 'rgba(247,147,26,0.06)', border: '1px solid rgba(247,147,26,0.12)' }}>
          <span style={{ color: 'var(--muted-foreground)' }}>Preview: </span>
          <span className="text-white font-semibold">
            Users get <span style={{ color: 'var(--primary)' }}>Ksh {Number(settings.referral_milestone_amount || 0).toLocaleString()}</span> credited
            to their wallet after reaching <span style={{ color: 'var(--primary)' }}>{settings.referral_milestone_threshold || 0}</span> successful referrals.
          </span>
        </div>

        <button onClick={async () => {
          setSaving(true)
          try {
            const data = await adminApi.updateSettings({
              referral_milestone_threshold: settings.referral_milestone_threshold,
              referral_milestone_amount: settings.referral_milestone_amount,
            })
            setSettings(data.settings)
            flash('Milestone bonus settings saved')
          } catch (e: any) {
            flash(e?.message || 'Save failed')
          } finally {
            setSaving(false)
          }
        }} disabled={saving}
          className="mt-4 w-full py-3 rounded-xl font-bold glow-gold disabled:opacity-60"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          {saving ? 'Saving…' : 'Save Milestone Bonus Settings'}
        </button>
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


// ─── CHAT TAB ───────────────────────────────────────────────────
// Two-pane support inbox. Conversations on the left, active chat on the right.
// Polls every 5s for new conversations and 3s for messages in the active one.
function ChatTab() {
  type Conv = {
    id: number
    user_id: number | null
    is_guest: boolean
    display_name: string
    display_contact: string
    visitor_name?: string | null
    visitor_email?: string | null
    status: 'open' | 'closed'
    unread_admin: number
    unread_user: number
    created_at: string
    last_message_at: string
  }
  type Msg = {
    id: number
    conversation_id: number
    sender: 'user' | 'admin' | 'system'
    body: string
    created_at: string
  }
  type UserContext = {
    id: number
    email: string
    phone: string
    is_active: boolean
    role: string
    referral_code: string
    wallet: any
  } | null

  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open')
  const [search, setSearch] = useState('')
  const [conversations, setConversations] = useState<Conv[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [activeConv, setActiveConv] = useState<Conv | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [userContext, setUserContext] = useState<UserContext>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [error, setError] = useState('')

  // Refresh conversations list
  async function loadConversations(silent = false) {
    if (!silent) setLoadingList(true)
    try {
      const data = await adminChatApi.listConversations(statusFilter, search.trim())
      setConversations(data.conversations || [])
    } catch (e: any) {
      setError(e?.message || 'Could not load conversations')
    } finally {
      if (!silent) setLoadingList(false)
    }
  }

  // Load a specific conversation
  async function loadConversation(id: number, silent = false) {
    if (!silent) setLoadingThread(true)
    try {
      const data = await adminChatApi.getConversation(id)
      if (data?.conversation) {
        setActiveConv(data.conversation)
        setMessages(data.conversation.messages || [])
        setUserContext(data.conversation.user_context || null)
        // Mark as read on the server
        if ((data.conversation.unread_admin ?? 0) > 0) {
          await adminChatApi.markRead(id).catch(() => {})
          // Update local list so the badge clears
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, unread_admin: 0 } : c))
          )
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load conversation')
    } finally {
      if (!silent) setLoadingThread(false)
    }
  }

  // First load + filter changes
  useEffect(() => {
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  // Search with light debounce
  useEffect(() => {
    const id = window.setTimeout(() => loadConversations(), 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Periodic refresh
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      loadConversations(true)
      if (activeId) loadConversation(activeId, true)
    }, 5000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, statusFilter, search])

  async function send() {
    const text = reply.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    setError('')
    try {
      const res = await adminChatApi.reply(activeId, text)
      if (res?.message) {
        setMessages((prev) => [...prev, res.message])
        setReply('')
      }
      // Re-fetch list so last_message_at sorts correctly
      loadConversations(true)
    } catch (e: any) {
      setError(e?.message || 'Could not send reply')
    } finally {
      setSending(false)
    }
  }

  async function closeConv() {
    if (!activeId) return
    if (!confirm('Close this conversation?')) return
    try {
      await adminChatApi.close(activeId)
      await loadConversation(activeId)
      loadConversations(true)
    } catch (e: any) {
      setError(e?.message || 'Could not close')
    }
  }

  async function reopenConv() {
    if (!activeId) return
    try {
      await adminChatApi.reopen(activeId)
      await loadConversation(activeId)
      loadConversations(true)
    } catch (e: any) {
      setError(e?.message || 'Could not reopen')
    }
  }

  function onReplyKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Quick canned replies — keep small and useful
  const SHORTCUTS: { label: string; body: string }[] = [
    { label: '👋 Greet', body: 'Hi there! Thanks for reaching out to CoinTap. How can I help?' },
    { label: '💰 Deposit', body: 'To deposit, go to Wallet → Deposit and enter the amount. You\'ll receive an M-Pesa STK Push prompt on your phone.' },
    { label: '💸 Withdraw', body: 'You can withdraw from matured investments only. Go to Withdraw and enter the amount. Approval takes 1–24 hours.' },
    { label: '🔒 Account', body: 'For account security questions, please verify your registered email so I can help further.' },
    { label: '⏳ Hold', body: 'Let me check that for you — one moment.' },
    { label: '✅ Resolved', body: 'Glad I could help! Is there anything else you need?' },
  ]

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-4 h-[calc(100dvh-220px)] min-h-[500px]">
      {/* LEFT — Conversation list */}
      <div className="glass rounded-2xl flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="p-3 space-y-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-1">
            {(['open', 'closed', 'all'] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${statusFilter === s ? 'text-white' : 'opacity-60 hover:opacity-100'}`}
                style={statusFilter === s
                  ? { background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'var(--muted-foreground)' }
                }>
                {s}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5" style={{ color: 'var(--muted-foreground)' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }} />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingList && (
            <div className="p-4 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Loading…
            </div>
          )}
          {!loadingList && conversations.length === 0 && (
            <div className="p-6 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
              No conversations found.
            </div>
          )}
          {conversations.map((c) => (
            <button key={c.id} onClick={() => { setActiveId(c.id); loadConversation(c.id) }}
              className="w-full text-left px-3 py-3 hover:opacity-80 transition-opacity"
              style={{
                background: activeId === c.id ? 'rgba(247,147,26,0.08)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                borderLeft: activeId === c.id ? '3px solid var(--primary)' : '3px solid transparent',
              }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-sm font-semibold text-white truncate">{c.display_name}</div>
                    {c.is_guest && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted-foreground)' }}>
                        Guest
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {c.display_contact}
                  </div>
                  <div className="text-[10px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(c.last_message_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {c.status === 'closed' && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ml-1"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted-foreground)' }}>
                        Closed
                      </span>
                    )}
                  </div>
                </div>
                {c.unread_admin > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: '#ef4444' }}>
                    {c.unread_admin > 9 ? '9+' : c.unread_admin}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT — Active conversation */}
      <div className="glass rounded-2xl flex flex-col overflow-hidden">
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--muted-foreground)' }} />
              <div className="text-sm font-semibold text-white">Select a conversation</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Pick one from the list to reply.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Active header */}
            <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{activeConv?.display_name || '—'}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--muted-foreground)' }}>
                  {activeConv?.display_contact || '—'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeConv?.status === 'open' ? (
                  <button onClick={closeConv}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
                    Close
                  </button>
                ) : (
                  <button onClick={reopenConv}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                    Reopen
                  </button>
                )}
              </div>
            </div>

            {/* Context strip — only if a registered user */}
            {userContext && (
              <div className="px-4 py-2 flex flex-wrap gap-3 text-[11px]"
                style={{ background: 'rgba(247,147,26,0.04)', borderBottom: '1px solid rgba(247,147,26,0.1)' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>
                  Balance: <span className="font-mono text-white">{formatKsh(userContext.wallet?.balance ?? 0)}</span>
                </span>
                <span style={{ color: 'var(--muted-foreground)' }}>
                  Withdrawable: <span className="font-mono text-green-400">{formatKsh(userContext.wallet?.withdrawable_balance ?? 0)}</span>
                </span>
                <span style={{ color: 'var(--muted-foreground)' }}>
                  Phone: <span className="text-white">{userContext.phone || '—'}</span>
                </span>
                <span style={{ color: 'var(--muted-foreground)' }}>
                  Status: <span className={userContext.is_active ? 'text-green-400' : 'text-red-400'}>
                    {userContext.is_active ? 'Active' : 'Suspended'}
                  </span>
                </span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3"
              style={{ background: 'rgba(0,0,0,0.15)' }}>
              {loadingThread && messages.length === 0 && (
                <div className="text-center text-xs py-8" style={{ color: 'var(--muted-foreground)' }}>Loading…</div>
              )}
              {messages.map((m) => {
                if (m.sender === 'system') {
                  return (
                    <div key={m.id} className="text-center text-[11px] italic px-4" style={{ color: 'var(--muted-foreground)' }}>
                      {m.body}
                    </div>
                  )
                }
                const isAdmin = m.sender === 'admin'
                return (
                  <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] flex flex-col gap-0.5">
                      <div className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${isAdmin ? 'rounded-br-md' : 'rounded-bl-md'}`}
                        style={isAdmin
                          ? { background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }
                          : { background: 'rgba(30,37,53,0.9)', color: 'white', border: '1px solid rgba(255,255,255,0.05)' }
                        }>
                        {m.body}
                      </div>
                      <div className={`text-[10px] px-1 ${isAdmin ? 'text-right' : 'text-left'}`}
                        style={{ color: 'var(--muted-foreground)' }}>
                        {new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Error toast */}
            {error && (
              <div className="px-4 py-2 text-[11px] flex items-center justify-between"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <span>{error}</span>
                <button onClick={() => setError('')} className="ml-2"><X className="w-3 h-3" /></button>
              </div>
            )}

            {/* Shortcuts */}
            {activeConv?.status === 'open' && (
              <div className="px-3 py-2 flex flex-wrap gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
                {SHORTCUTS.map((s) => (
                  <button key={s.label} onClick={() => setReply(s.body)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium hover:opacity-80"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}
                    title={s.body}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Reply box */}
            <div className="p-3 flex items-end gap-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={onReplyKey}
                placeholder={activeConv?.status === 'closed' ? 'Reopen to reply…' : 'Type your reply…'}
                disabled={activeConv?.status === 'closed'} rows={1} maxLength={2000}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white resize-none max-h-32 disabled:opacity-50"
                style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.08)' }} />
              <button onClick={send}
                disabled={!reply.trim() || sending || activeConv?.status === 'closed'}
                aria-label="Send reply"
                className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-transform active:scale-95"
                style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
