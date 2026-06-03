import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowRight, Shield, Zap, TrendingUp, Wallet, Clock, CheckCircle2, Menu, X } from 'lucide-react'
import { Logo } from '@/components/cointap/Logo'
import { NodeBackground } from '@/components/cointap/NodeBackground'
import { LiveNumber } from '@/components/cointap/LiveNumber'
import { poolApi } from '@/lib/api'

const navLinks = [
  { href: '#how', label: 'How it works' },
  { href: '#plans', label: 'Plans' },
  { href: '#why', label: 'Why CoinTap' },
  { href: '#security', label: 'Security' },
]

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass rounded-xl p-4 text-center">
      <div className="text-xl sm:text-2xl font-bold text-gradient-gold">{value}</div>
      <div className="text-[11px] sm:text-xs tracking-wider uppercase mt-1" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
    </div>
  )
}

export function Landing() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [poolBalance, setPoolBalance] = useState<number>(2_450_000)
  const [poolDepletion, setPoolDepletion] = useState<number>(61)

  // Smooth scroll to anchor when clicked
  function scrollTo(href: string) {
    const id = href.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setMobileNavOpen(false)
  }

  // Fetch real pool status (public endpoint — works without login).
  // Refresh every 15s so the number stays roughly real.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data: any = await poolApi.status()
        if (cancelled) return
        const pub = Number(data?.public_pool_balance ?? 0)
        const res = Number(data?.reserve_pool_balance ?? 0)
        if (pub > 0) setPoolBalance(pub)
        const total = pub + res
        if (total > 0) setPoolDepletion(Math.round((1 - pub / total) * 100))
      } catch { /* keep defaults */ }
    }
    load()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Close mobile nav on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileNavOpen])

  const plans = [
    { name: 'Starter', days: 4, profit: 30, min: 500 },
    { name: 'Growth', days: 8, profit: 65, min: 2000 },
    { name: 'Premium', days: 12, profit: 95, min: 10000 },
  ]

  return (
    <div className="min-h-screen" style={{ scrollBehavior: 'smooth' }}>
      {/* ━━━━━━━━━━━━━━━━━━ NAV ━━━━━━━━━━━━━━━━━━ */}
      <header className="sticky top-0 z-40 glass" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className="px-3 py-2 text-sm font-medium rounded-lg transition-all hover:text-white"
                style={{ color: 'var(--muted-foreground)' }}>
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-2 text-sm transition-colors hover:text-white"
              style={{ color: 'var(--muted-foreground)' }}>Login</Link>
            <Link to="/register" className="px-4 py-2 text-sm font-semibold rounded-xl glow-gold transition-opacity hover:opacity-90"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              Get Started
            </Link>

            {/* Mobile hamburger — visible only below lg */}
            <button onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.05)' }}
              aria-label="Open menu">
              <Menu className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-in nav drawer */}
      <div
        onClick={() => setMobileNavOpen(false)}
        className="lg:hidden fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          opacity: mobileNavOpen ? 1 : 0,
          pointerEvents: mobileNavOpen ? 'auto' : 'none',
        }}
        aria-hidden={!mobileNavOpen} />
      <aside
        className="lg:hidden fixed top-0 right-0 z-50 h-full w-[85%] max-w-[320px] flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #141821 0%, #0a0e1a 100%)',
          borderLeft: '1px solid rgba(247,147,26,0.15)',
          boxShadow: '-20px 0 60px -20px rgba(0,0,0,0.9)',
          transform: mobileNavOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        role="dialog" aria-label="Menu">
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Logo size={32} />
          <button onClick={() => setMobileNavOpen(false)}
            className="p-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            aria-label="Close menu">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-widest font-bold px-3 mb-2"
            style={{ color: 'var(--muted-foreground)' }}>
            Explore
          </div>
          {navLinks.map((l) => (
            <button key={l.href} onClick={() => scrollTo(l.href)}
              className="w-full flex items-center px-3 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] text-left"
              style={{ color: 'var(--foreground)' }}>
              {l.label}
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to="/login" onClick={() => setMobileNavOpen(false)}
            className="w-full block text-center py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
            Login
          </Link>
          <Link to="/register" onClick={() => setMobileNavOpen(false)}
            className="w-full block text-center py-3 rounded-xl text-sm font-bold glow-gold"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            Get Started
          </Link>
        </div>
      </aside>

      {/* ━━━━━━━━━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━━━━ */}
      <section className="relative overflow-hidden">
        <NodeBackground />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs mb-6"
            style={{ color: 'var(--primary)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live pool · M-Pesa enabled
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] text-white">
            Invest Smarter <br />
            with <span className="text-gradient-gold">CoinTap</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg max-w-xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            Deposit funds, buy investment shares, track your growth in real time, and withdraw your returns directly through M-Pesa.
          </p>
          <div className="mt-3 text-xs tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>
            Deposit · Invest · Grow · Withdraw
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="px-6 py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 glow-gold hover:opacity-90"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              Start Investing <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={() => scrollTo('#plans')}
              className="px-6 py-3.5 rounded-xl glass font-semibold inline-flex items-center justify-center text-white">
              View Plans
            </button>
          </div>
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            <Stat value="12.4K" label="Investors" />
            <Stat value="Ksh 84M" label="Paid Out" />
            <Stat value="2.4M" label="Pool Live" />
            <Stat value="99.9%" label="Uptime" />
          </div>
        </div>
      </section>

      {/* Pool preview */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <NodeBackground />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Available Share Pool</div>
              <div className="text-3xl sm:text-4xl font-bold text-gradient-gold font-mono mt-1">
                <LiveNumber value={poolBalance} prefix="Ksh " jitter={0.0015} pulse />
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Public liquidity · Auto-replenishing</div>
            </div>
            <div className="w-full sm:w-64">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
                <span>Pool depletion</span><span>{poolDepletion}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: poolDepletion + '%', background: 'var(--gradient-gold)' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ HOW IT WORKS — id="how" ━━━━━━━━━━━━━━━━━━ */}
      <section id="how" className="max-w-6xl mx-auto px-4 py-12 scroll-mt-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-10">How CoinTap Works</h2>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { I: Wallet, t: 'Deposit', d: 'Top up wallet via M-Pesa STK' },
            { I: TrendingUp, t: 'Invest', d: 'Buy shares from the live pool' },
            { I: Clock, t: 'Grow', d: 'Watch your countdown mature' },
            { I: CheckCircle2, t: 'Withdraw', d: 'Cash out to M-Pesa instantly' },
          ].map((s, i) => (
            <div key={i} className="glass rounded-xl p-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(247,147,26,0.12)', color: 'var(--primary)' }}>
                <s.I className="w-5 h-5" />
              </div>
              <div className="mt-3 font-semibold text-white">{i + 1}. {s.t}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ PLANS — id="plans" ━━━━━━━━━━━━━━━━━━ */}
      <section id="plans" className="max-w-6xl mx-auto px-4 py-12 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Investment Plans</h2>
          <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>Pick a plan, watch your countdown, withdraw to M-Pesa.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {plans.map((p, i) => (
            <div key={p.name} className="relative glass rounded-2xl p-6"
              style={i === 1 ? { boxShadow: '0 0 0 1px rgba(247,147,26,0.4)' } : {}}>
              {i === 1 && (
                <div className="absolute -top-2.5 left-6 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>Popular</div>
              )}
              <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{p.name} Plan</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gradient-gold">{p.profit}%</span>
                <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>profit</span>
              </div>
              <div className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>in {p.days} days</div>
              <div className="mt-5 text-xs" style={{ color: 'var(--muted-foreground)' }}>Min Ksh {p.min.toLocaleString()}</div>
              <Link to="/register"
                className="mt-5 block text-center px-4 py-2.5 rounded-xl font-semibold hover:opacity-90"
                style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                Invest Now
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ WHY COINTAP — id="why" ━━━━━━━━━━━━━━━━━━ */}
      <section id="why" className="max-w-6xl mx-auto px-4 py-12 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Why CoinTap</h2>
          <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>Built for Kenyan investors. Transparent, fast, and reliable.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { I: Shield, t: 'Secure Wallet', d: 'Encrypted access. Atomic transactions. Full audit logs.' },
            { I: Zap, t: 'Fast Withdrawals', d: 'Admin-approved M-Pesa payouts via Daraja B2C.' },
            { I: TrendingUp, t: 'Transparent Growth', d: 'Live countdowns and real-time pool stats.' },
          ].map((f, i) => (
            <div key={i} className="glass rounded-xl p-5">
              <f.I className="w-6 h-6" style={{ color: 'var(--primary)' }} />
              <div className="font-semibold mt-3 text-white">{f.t}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ SECURITY — id="security" ━━━━━━━━━━━━━━━━━━ */}
      <section id="security" className="max-w-6xl mx-auto px-4 py-12 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Security First</h2>
          <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>Your funds and data are protected at every layer.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { t: 'Bcrypt Passwords', d: 'Industry-standard password hashing — never stored in plain text.' },
            { t: 'Two-Factor Auth', d: 'Optional 2FA via authenticator apps. Required for large withdrawals.' },
            { t: 'Encrypted Sessions', d: 'JWT tokens with auto-refresh and short expiry windows.' },
            { t: 'Audit Logs', d: 'Every admin action is logged with a full timestamped trail.' },
          ].map((f, i) => (
            <div key={i} className="glass rounded-xl p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(247,147,26,0.12)', color: 'var(--primary)' }}>
                <Shield className="w-5 h-5" />
              </div>
              <div className="font-semibold mt-3 text-white">{f.t}</div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="glass rounded-xl p-4 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <Shield className="w-4 h-4 inline mr-2 mb-0.5" style={{ color: 'var(--primary)' }} />
          CoinTap is a centralized investment platform. Investing involves risk. Past performance does not guarantee future results.
          Please invest responsibly and only what you can afford. Read our{' '}
          <span className="underline cursor-pointer" style={{ color: 'var(--primary)' }}>Terms & Conditions</span> and{' '}
          <span className="underline cursor-pointer" style={{ color: 'var(--primary)' }}>Risk Disclaimer</span>.
        </div>
      </section>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="mt-8 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {navLinks.map((l) => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className="hover:text-white transition-colors">
                {l.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-center sm:text-right" style={{ color: 'var(--muted-foreground)' }}>
            <div>© {new Date().getFullYear()} CoinTap · cointap.online</div>
            <div className="mt-1">Investing involves risk. Track responsibly.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
