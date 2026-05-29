import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Wallet, TrendingUp, Activity, Users,
  LogOut, Menu, X, Settings, User, ChevronRight, Shield,
} from 'lucide-react'
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
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

  // Load all real data from backend on entry, then refresh periodically
  useEffect(() => {
    store.apiLoadAll()
    const t = setInterval(() => {
      store.apiLoadWallet()
      store.apiLoadOrders()
    }, 15000)
    return () => clearInterval(t)
  }, [])

  // Close drawer when route changes
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Lock body scroll when drawer is open (native-app feel)
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  if (!user) return null

  const path = location.pathname

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      {/* ━━━━━━━━━━━━━━━ DESKTOP SIDEBAR ━━━━━━━━━━━━━━━ */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col glass p-5 sticky top-0 h-screen"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <Logo />
        <nav className="mt-8 flex flex-col gap-1 flex-1">
          {nav.map((n) => {
            const active = path === n.to || path.startsWith(n.to + '/')
            return (
              <Link key={n.to} to={n.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                style={active ? {
                  background: 'rgba(247,147,26,0.12)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(247,147,26,0.25)',
                } : {
                  color: 'var(--muted-foreground)',
                  border: '1px solid transparent',
                }}>
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
          <Link to="/profile" className="flex items-center gap-3 p-2 rounded-xl mb-2 transition-all hover:bg-white/5"
            style={path === '/profile' ? { background: 'rgba(247,147,26,0.1)', border: '1px solid rgba(247,147,26,0.2)' } : {}}>
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              {user.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user.full_name}</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--muted-foreground)' }}>{user.email}</div>
            </div>
          </Link>
          <button
            onClick={() => { store.apiLogout(); navigate('/login') }}
            className="flex items-center gap-2 text-sm transition-colors hover:text-red-400"
            style={{ color: 'var(--muted-foreground)' }}>
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* ━━━━━━━━━━━━━━━ MAIN CONTENT ━━━━━━━━━━━━━━━ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 glass px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setDrawerOpen(true)} className="p-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.05)' }} aria-label="Open menu">
            <Menu className="w-5 h-5 text-white" />
          </button>
          <Logo size={32} />
          <Link to="/profile" className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold active:scale-95 transition-transform"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {user.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass px-2 py-2 flex justify-around"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          {nav.map((n) => {
            const active = path === n.to
            return (
              <Link key={n.to} to={n.to}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition active:scale-95"
                style={{ color: active ? 'var(--primary)' : 'var(--muted-foreground)' }}>
                <n.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{n.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* ━━━━━━━━━━━━━━━ MOBILE SLIDE-IN DRAWER ━━━━━━━━━━━━━━━ */}
      {/* Backdrop overlay */}
      <div
        onClick={() => setDrawerOpen(false)}
        className="lg:hidden fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
        }}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className="lg:hidden fixed top-0 left-0 z-50 h-full w-[85%] max-w-[320px] flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #141821 0%, #0a0e1a 100%)',
          borderRight: '1px solid rgba(247,147,26,0.15)',
          boxShadow: '20px 0 60px -20px rgba(0,0,0,0.9), inset -1px 0 0 rgba(255,255,255,0.04)',
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        role="dialog" aria-label="Navigation menu"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Logo size={36} />
          <button onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            aria-label="Close menu">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* User card */}
        <Link to="/profile" onClick={() => setDrawerOpen(false)}
          className="mx-4 mt-4 p-4 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, rgba(247,147,26,0.15), rgba(124,58,237,0.08))',
            border: '1px solid rgba(247,147,26,0.25)',
          }}>
          <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold glow-gold"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {user.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
              {user.full_name}
              {user.role === 'admin' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(247,147,26,0.25)', color: 'var(--primary)' }}>
                  ADMIN
                </span>
              )}
            </div>
            <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>
              {user.email}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} />
        </Link>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-widest font-bold px-3 mb-2"
            style={{ color: 'var(--muted-foreground)' }}>
            Navigation
          </div>
          {nav.map((n) => {
            const active = path === n.to || path.startsWith(n.to + '/')
            return (
              <Link key={n.to} to={n.to} onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
                style={active ? {
                  background: 'rgba(247,147,26,0.12)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(247,147,26,0.25)',
                } : {
                  color: 'var(--foreground)',
                  border: '1px solid transparent',
                }}>
                <n.icon className="w-5 h-5" />
                <span className="flex-1">{n.label}</span>
                {active && <ChevronRight className="w-4 h-4" />}
              </Link>
            )
          })}

          {/* Account section */}
          <div className="text-[10px] uppercase tracking-widest font-bold px-3 mt-6 mb-2"
            style={{ color: 'var(--muted-foreground)' }}>
            Account
          </div>

          <Link to="/profile" onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
            style={path === '/profile' ? {
              background: 'rgba(247,147,26,0.12)',
              color: 'var(--primary)',
              border: '1px solid rgba(247,147,26,0.25)',
            } : {
              color: 'var(--foreground)',
              border: '1px solid transparent',
            }}>
            <User className="w-5 h-5" />
            <span className="flex-1">My Profile</span>
          </Link>

          <Link to="/withdraw" onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
            style={{ color: 'var(--foreground)' }}>
            <Wallet className="w-5 h-5" />
            <span className="flex-1">Withdraw</span>
          </Link>

          {user.role === 'admin' && (
            <Link to="/admin" onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={path.startsWith('/admin') ? {
                background: 'rgba(247,147,26,0.12)',
                color: 'var(--primary)',
                border: '1px solid rgba(247,147,26,0.25)',
              } : {
                color: 'var(--primary)',
                border: '1px solid transparent',
              }}>
              <Shield className="w-5 h-5" />
              <span className="flex-1">Admin Panel</span>
            </Link>
          )}
        </nav>

        {/* Footer with sign out */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => { setDrawerOpen(false); store.apiLogout(); navigate('/login') }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
          <div className="text-[10px] text-center mt-3" style={{ color: 'var(--muted-foreground)' }}>
            CoinTap v1.0 · cointap.online
          </div>
        </div>
      </aside>
    </div>
  )
}
