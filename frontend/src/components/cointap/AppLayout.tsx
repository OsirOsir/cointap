import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, Wallet, TrendingUp, Activity, Users, LogOut, Menu, X, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { store, useStore } from '@/lib/cointap-store'

const nav = [
  { to: '/dashboard', label: 'Overview', icon: Home },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/plans', label: 'Invest', icon: TrendingUp },
  { to: '/orders', label: 'Orders', icon: Activity },
  { to: '/referrals', label: 'Refer', icon: Users },
]

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useStore((s) => s.user)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

  // Auto-settle matured orders
  useEffect(() => {
    store.settleMaturedOrders()
    const t = setInterval(() => store.settleMaturedOrders(), 5000)
    return () => clearInterval(t)
  }, [])

  if (!user) return null

  const path = location.pathname

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col glass p-5 sticky top-0 h-screen"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <Logo />
        <nav className="mt-8 flex flex-col gap-1 flex-1">
          {nav.map((n) => {
            const active = path === n.to || path.startsWith(n.to + '/')
            return (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={active ? {
                  background: 'rgba(247,147,26,0.12)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(247,147,26,0.25)',
                } : {
                  color: 'var(--muted-foreground)',
                  border: '1px solid transparent',
                }}
              >
                <n.icon className="w-4 h-4" /> {n.label}
              </Link>
            )
          })}
        </nav>
        <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {user.role === 'admin' && (
            <Link to="/admin" className="flex items-center gap-2 text-sm mb-3 transition-colors"
              style={{ color: 'var(--primary)' }}>
              <Settings className="w-4 h-4" /> Admin Panel
            </Link>
          )}
          <div className="text-xs mb-2 truncate" style={{ color: 'var(--muted-foreground)' }}>{user.email}</div>
          <button
            onClick={() => { store.logout(); navigate('/login') }}
            className="flex items-center gap-2 text-sm transition-colors hover:text-red-400"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-40 glass px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Logo size={32} />
          <button onClick={() => setOpen(!open)} className="p-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            {open ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </header>

        {open && (
          <div className="lg:hidden glass p-4 space-y-1 z-30"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
                style={{ color: 'var(--muted-foreground)' }}>
                <n.icon className="w-4 h-4" /> {n.label}
              </Link>
            ))}
            {user.role === 'admin' && (
              <Link to="/admin" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
                style={{ color: 'var(--primary)' }}>
                <Settings className="w-4 h-4" /> Admin Panel
              </Link>
            )}
            <button
              onClick={() => { store.logout(); navigate('/login') }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass px-2 py-2 flex justify-around"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {nav.map((n) => {
            const active = path === n.to
            return (
              <Link key={n.to} to={n.to}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition"
                style={{ color: active ? 'var(--primary)' : 'var(--muted-foreground)' }}>
                <n.icon className="w-5 h-5" />
                <span className="text-[10px]">{n.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
