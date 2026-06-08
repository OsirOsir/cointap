import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  ArrowRight, Shield, Zap, TrendingUp, Wallet, Clock, CheckCircle2,
  Menu, X, Smartphone, Lock, BarChart3, Mail, Eye, ChevronDown,
  Coins, RefreshCw, Globe,
} from 'lucide-react'
import { Logo } from '@/components/cointap/Logo'
import { NodeBackground } from '@/components/cointap/NodeBackground'
import { LiveNumber } from '@/components/cointap/LiveNumber'
import { poolApi } from '@/lib/api'

const navLinks = [
  { href: '#how', label: 'How it works' },
  { href: '#plans', label: 'Plans' },
  { href: '#why', label: 'Why CoinTap' },
  { href: '#security', label: 'Security' },
  { href: '#faq', label: 'FAQ' },
]

// ─── ATOMIC UI BITS ──────────────────────────────────────────────────────

function TrustBadge({ icon: Icon, label, sub }: { icon: any; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl glass">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(247,147,26,0.12)' }}>
        <Icon className="w-4.5 h-4.5" style={{ color: 'var(--primary)' }} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate">{label}</div>
        <div className="text-[11px] truncate" style={{ color: 'var(--muted-foreground)' }}>{sub}</div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon: Icon, title, body, accent,
}: { icon: any; title: string; body: string; accent?: boolean }) {
  return (
    <div
      className="glass rounded-2xl p-6 relative overflow-hidden transition-all hover:translate-y-[-2px]"
      style={accent ? { boxShadow: '0 0 0 1px rgba(247,147,26,0.3), 0 20px 40px -20px rgba(247,147,26,0.2)' } : {}}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(247,147,26,0.18), rgba(247,147,26,0.05))', color: 'var(--primary)' }}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-white mb-1.5">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{body}</p>
    </div>
  )
}

function FaqRow({ q, a, defaultOpen = false }: { q: string; a: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass rounded-xl overflow-hidden transition-all"
      style={open ? { boxShadow: '0 0 0 1px rgba(247,147,26,0.25)' } : {}}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left active:scale-[0.995] transition-transform">
        <span className="font-semibold text-white text-sm sm:text-base">{q}</span>
        <ChevronDown
          className="w-5 h-5 shrink-0 transition-transform"
          style={{
            color: 'var(--muted-foreground)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }} />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm leading-relaxed"
          style={{ color: 'var(--muted-foreground)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="pt-4">{a}</div>
        </div>
      )}
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────

export function Landing() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [poolBalance, setPoolBalance] = useState<number>(0)
  const [poolReserve, setPoolReserve] = useState<number>(0)
  const [poolDepletion, setPoolDepletion] = useState<number>(0)
  const [poolLoaded, setPoolLoaded] = useState(false)

  // Smooth scroll to anchor
  function scrollTo(href: string) {
    const id = href.replace('#', '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileNavOpen(false)
  }

  // Real pool data — public endpoint
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data: any = await poolApi.status()
        if (cancelled) return
        const pub = Number(data?.pool?.public_pool_balance ?? data?.public_pool_balance ?? 0)
        const res = Number(data?.pool?.reserve_pool_balance ?? data?.reserve_pool_balance ?? 0)
        setPoolBalance(pub)
        setPoolReserve(res)
        const total = pub + res
        setPoolDepletion(total > 0 ? Math.round((1 - pub / total) * 100) : 0)
        setPoolLoaded(true)
      } catch { /* leave defaults */ }
    }
    load()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileNavOpen])

  const plans = [
    { name: 'Starter', days: 4, profit: 30, min: 500,   blurb: 'Try the platform with a small amount' },
    { name: 'Growth',  days: 8, profit: 65, min: 2000,  blurb: 'For investors ready to commit a bit more' },
    { name: 'Premium', days: 12, profit: 95, min: 10000, blurb: 'Higher commitment, longer cycle' },
  ]

  return (
    <div className="min-h-screen" style={{ scrollBehavior: 'smooth' }}>

      {/* ━━━━━━━━━━━━━━━━━━ NAV ━━━━━━━━━━━━━━━━━━ */}
      <header className="sticky top-0 z-40 glass" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Logo />
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
            <button onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.05)' }}
              aria-label="Open menu">
              <Menu className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        onClick={() => setMobileNavOpen(false)}
        className="lg:hidden fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          opacity: mobileNavOpen ? 1 : 0, pointerEvents: mobileNavOpen ? 'auto' : 'none',
        }} aria-hidden={!mobileNavOpen} />
      <aside
        className="lg:hidden fixed top-0 right-0 z-50 h-full w-[85%] max-w-[320px] flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #141821 0%, #0a0e1a 100%)',
          borderLeft: '1px solid rgba(247,147,26,0.15)',
          boxShadow: '-20px 0 60px -20px rgba(0,0,0,0.9)',
          transform: mobileNavOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
        }} role="dialog" aria-label="Menu">
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Logo size={32} />
          <button onClick={() => setMobileNavOpen(false)}
            className="p-2 rounded-xl active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.05)' }} aria-label="Close menu">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-widest font-bold px-3 mb-2"
            style={{ color: 'var(--muted-foreground)' }}>Explore</div>
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
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>Login</Link>
          <Link to="/register" onClick={() => setMobileNavOpen(false)}
            className="w-full block text-center py-3 rounded-xl text-sm font-bold glow-gold"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>Get Started</Link>
        </div>
      </aside>

      {/* ━━━━━━━━━━━━━━━━━━ HERO ━━━━━━━━━━━━━━━━━━ */}
      <section className="relative overflow-hidden">
        <NodeBackground />

        {/* Ambient gold glow blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(247,147,26,0.4), transparent 60%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4), transparent 60%)', filter: 'blur(70px)' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-16 sm:pt-24 pb-12 sm:pb-16">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-8 items-center">

            {/* LEFT — copy + CTAs */}
            <div className="text-center lg:text-left">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] text-white">
                Grow your money,{' '}
                <span className="text-gradient-gold">on your own terms.</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg max-w-xl mx-auto lg:mx-0"
                style={{ color: 'var(--muted-foreground)' }}>
                CoinTap is a global investment platform. Fund your wallet through M-Pesa, cards, or bank transfer.
                Choose a plan, watch your countdown in real time, and withdraw the moment it matures.
                No hidden fees. No surprises.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/register"
                  className="px-6 py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 glow-gold hover:opacity-90 transition"
                  style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                  Create free account <ArrowRight className="w-4 h-4" />
                </Link>
                <button onClick={() => scrollTo('#how')}
                  className="px-6 py-3.5 rounded-xl glass font-semibold inline-flex items-center justify-center text-white">
                  See how it works
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center lg:justify-start gap-4 text-xs"
                style={{ color: 'var(--muted-foreground)' }}>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Free to join</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Multiple payment methods</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> 24/7 chat</span>
              </div>
            </div>

            {/* RIGHT — visual: stylized "live pool" card */}
            <div className="relative">
              <div className="relative glass rounded-3xl p-6 sm:p-7 overflow-hidden"
                style={{ boxShadow: '0 30px 60px -30px rgba(247,147,26,0.3)' }}>
                <div className="absolute top-0 right-0 w-40 h-40 opacity-30 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(247,147,26,0.6), transparent 70%)', filter: 'blur(40px)' }} />

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold"
                      style={{ color: 'var(--muted-foreground)' }}>Live pool balance</span>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold"
                      style={{ color: '#4ade80' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      LIVE
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-mono font-bold text-gradient-gold mt-2">
                    {poolLoaded ? (
                      <LiveNumber value={poolBalance} prefix="Ksh " jitter={0.0015} pulse />
                    ) : (
                      <span className="opacity-30">Ksh ——</span>
                    )}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    Public liquidity available right now
                  </div>

                  <div className="mt-5">
                    <div className="flex justify-between text-[11px] mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
                      <span>Pool depletion</span><span>{poolDepletion}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: poolDepletion + '%', background: 'var(--gradient-gold)' }} />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Reserve</div>
                      <div className="text-sm font-mono font-bold text-white mt-1">
                        {poolLoaded ? `Ksh ${poolReserve.toLocaleString()}` : '——'}
                      </div>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Auto-replenish</div>
                      <div className="text-sm font-bold text-green-400 mt-1 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Active
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <TrustBadge icon={Smartphone} label="Multiple Payments" sub="M-Pesa, cards & more" />
            <TrustBadge icon={Mail} label="Verified Sender" sub="DKIM, SPF, DMARC" />
            <TrustBadge icon={Lock} label="HTTPS Everywhere" sub="TLS encrypted" />
            <TrustBadge icon={BarChart3} label="Live Pool Data" sub="Real-time balances" />
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ HOW IT WORKS — id="how" ━━━━━━━━━━━━━━━━━━ */}
      <section id="how" className="max-w-6xl mx-auto px-4 py-16 sm:py-20 scroll-mt-20">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--primary)' }}>
            How it works
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Four steps. No middlemen.</h2>
          <p className="mt-3 max-w-xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            From your M-Pesa to your investment and back — entirely in one app.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { I: Wallet, t: 'Deposit',  d: 'Top up via M-Pesa, card, or bank transfer. Funds land in your wallet in seconds.', step: 1 },
            { I: Coins, t: 'Invest',   d: 'Pick a plan that suits you. Buy shares from the live pool.', step: 2 },
            { I: Clock, t: 'Grow',     d: 'Watch your live countdown on the dashboard. Earnings mature on schedule.', step: 3 },
            { I: CheckCircle2, t: 'Withdraw', d: 'Cash out the moment your plan matures. Funds return through the same method you used to deposit.', step: 4 },
          ].map((s) => (
            <div key={s.step} className="glass rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-3 right-4 text-5xl font-display font-bold opacity-5 text-white">
                {s.step}
              </div>
              <div className="relative w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(247,147,26,0.18), rgba(247,147,26,0.05))', color: 'var(--primary)' }}>
                <s.I className="w-5 h-5" />
              </div>
              <div className="relative mt-4 font-bold text-white">{s.t}</div>
              <div className="relative text-sm mt-2 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ PLANS — id="plans" ━━━━━━━━━━━━━━━━━━ */}
      <section id="plans" className="max-w-6xl mx-auto px-4 py-16 sm:py-20 scroll-mt-20">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--primary)' }}>
            Plans
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Pick a plan that fits you</h2>
          <p className="mt-3 max-w-xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            Start small. Move up when you're comfortable.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {plans.map((p, i) => (
            <div key={p.name} className="relative glass rounded-2xl p-6 transition-all hover:translate-y-[-3px]"
              style={i === 1 ? { boxShadow: '0 0 0 1px rgba(247,147,26,0.4), 0 30px 60px -30px rgba(247,147,26,0.3)' } : {}}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>{p.name}</span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(247,147,26,0.12)', color: 'var(--primary)' }}>
                  {p.days} days
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-5xl font-display font-bold text-gradient-gold">{p.profit}<span className="text-3xl">%</span></span>
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>profit on maturity</div>

              <div className="mt-5 p-3 rounded-xl text-xs" style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--muted-foreground)' }}>
                {p.blurb}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>From</span>
                <span className="text-sm font-mono font-bold text-white">Ksh {p.min.toLocaleString()}</span>
              </div>

              <Link to="/register"
                className="mt-5 block text-center px-4 py-3 rounded-xl font-semibold hover:opacity-90 transition"
                style={
                  i === 1
                    ? { background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.08)' }
                }>
                Get started
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-6 glass rounded-xl p-4 text-xs flex items-start gap-3"
          style={{ color: 'var(--muted-foreground)' }}>
          <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--primary)' }} />
          <div>
            <strong className="text-white">A note on returns:</strong> The percentages above are target profits per cycle, not guaranteed.
            Investments carry risk and platform performance varies with pool demand. Only invest what you're comfortable with.
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ WHY — id="why" ━━━━━━━━━━━━━━━━━━ */}
      <section id="why" className="max-w-6xl mx-auto px-4 py-16 sm:py-20 scroll-mt-20">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--primary)' }}>
            Why CoinTap
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Investing without the noise.</h2>
          <p className="mt-3 max-w-xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            A platform we'd want to use ourselves. Transparent. Fast. No nonsense.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard icon={Smartphone} title="Pay your way"
            body="Deposit and withdraw through M-Pesa, cards, or bank transfer. Use whatever method works best for you." />
          <FeatureCard icon={Eye} title="Transparent pool" accent
            body="The pool balance is live on the homepage. You can see exactly how much liquidity is available before you invest." />
          <FeatureCard icon={Clock} title="Real-time countdown"
            body="Every active investment shows a live countdown to maturity on your dashboard. No guessing when funds unlock." />
          <FeatureCard icon={TrendingUp} title="Honest analytics"
            body="Your dashboard shows YOUR data — real balance over time, real earnings, real allocation. No fake charts." />
          <FeatureCard icon={Zap} title="Fast withdrawals"
            body="When your plan matures, request a withdrawal. Most are processed within minutes during business hours." />
          <FeatureCard icon={Globe} title="Built for everyone"
            body="A global platform. Whether you're new to investing or experienced, the flow is the same: simple, fast, clear." />
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ SECURITY — id="security" ━━━━━━━━━━━━━━━━━━ */}
      <section id="security" className="max-w-6xl mx-auto px-4 py-16 sm:py-20 scroll-mt-20">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--primary)' }}>
            Security
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Protecting your account</h2>
          <p className="mt-3 max-w-xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
            Standard, modern web security at every layer. No fancy claims — just the basics done well.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { I: Lock,        t: 'Bcrypt passwords', d: 'Passwords are hashed with bcrypt — never stored in plain text. We can\'t see your password.' },
            { I: Shield,      t: 'JWT sessions',     d: 'Short-lived tokens with auto-refresh. Sessions expire automatically when idle.' },
            { I: Mail,        t: 'Email verification', d: 'Verified domain (DKIM + SPF + DMARC). Real password reset and account verification emails.' },
            { I: Eye,         t: 'Atomic transactions', d: 'Every wallet movement is logged. Failed transfers reverse automatically — you\'re never out-of-balance.' },
          ].map((f, i) => (
            <div key={i} className="glass rounded-2xl p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(247,147,26,0.12)', color: 'var(--primary)' }}>
                <f.I className="w-5 h-5" />
              </div>
              <div className="font-bold mt-3 text-white">{f.t}</div>
              <div className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ FAQ — id="faq" ━━━━━━━━━━━━━━━━━━ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-16 sm:py-20 scroll-mt-20">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--primary)' }}>
            Frequently asked
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Straight answers</h2>
          <p className="mt-3" style={{ color: 'var(--muted-foreground)' }}>
            The questions we get most often, answered honestly.
          </p>
        </div>

        <div className="space-y-3">
          <FaqRow defaultOpen
            q="Is CoinTap legitimate or is this a scam?"
            a={<>
              CoinTap is a working investment platform in active beta. We don't make crypto trading
              claims, we don't promise guaranteed riches, and we don't run pyramid mechanics that pay
              old users with new users' deposits. Investments are share-based purchases against a public
              pool whose balance is displayed live on this page. That said — like any investment,
              there is risk. We explain the model in plain language so you can decide for yourself.
            </>} />
          <FaqRow
            q="How do returns work?"
            a={<>
              When you buy a plan, you commit funds for a fixed cycle (4–12 days). At maturity, the
              full amount plus the plan's profit returns to your wallet. The pool that backs payouts
              is shown live on the homepage so you can see liquidity health at any time.
            </>} />
          <FaqRow
            q="What if a plan doesn't perform?"
            a={<>
              Funds sitting in your wallet aren't at risk until you actively buy a plan. Returns are
              targets per cycle, not guarantees. If a plan completes successfully, you receive your
              principal plus profit. If the platform pauses (e.g. maintenance, pool issues), the team
              will communicate transparently and either refund or hold the cycle until conditions allow.
            </>} />
          <FaqRow
            q="When can I withdraw?"
            a={<>
              Any time funds are sitting in your wallet — whether from a matured plan, referral bonus,
              or unused deposit. Request a withdrawal, an admin approves, and M-Pesa B2C sends it back
              to your phone. Most withdrawals are processed within minutes during business hours.
            </>} />
          <FaqRow
            q="Are my funds protected?"
            a={<>
              CoinTap is a digital investment platform. Like other digital platforms (Robinhood,
              Cash App Investing, etc.), holdings are not bank deposits. Your wallet is protected by
              modern security: bcrypt password hashing, JWT-based sessions, atomic ledger transactions,
              and a full audit trail on every transfer. Every wallet movement is reversible if something
              fails — you're never silently left out-of-balance.
            </>} />
          <FaqRow
            q="How does the referral program work?"
            a={<>
              Every account gets a unique referral code. Share it. When someone signs up using your code
              and invests, you earn a 3% bonus on their first investment. There are also milestone
              bonuses when you hit referral tiers (Bronze, Silver, Gold, Diamond, Legend). All bonuses
              land in your wallet — no separate accounts to track.
            </>} />
          <FaqRow
            q="What's the minimum to start?"
            a={<>
              The Starter plan accepts as little as <strong className="text-white">Ksh 500</strong>.
              That's intentional — we want people to be able to test the platform with a small amount
              before committing more.
            </>} />
          <FaqRow
            q="Can I trust the live pool number?"
            a={<>
              Yes. The number you see at the top of this page (and on your dashboard) is pulled directly
              from the platform database in real time, refreshed every 15 seconds. It reflects actual
              public pool liquidity, not a marketing figure.
            </>} />
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Still have questions? Tap the chat bubble in the corner of any page — we usually reply within a few minutes.
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ FINAL CTA ━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
        <div className="relative glass rounded-3xl p-8 sm:p-12 overflow-hidden text-center">
          <NodeBackground />
          <div className="absolute inset-0 pointer-events-none opacity-30"
            style={{ background: 'radial-gradient(circle at 50% 0%, rgba(247,147,26,0.3), transparent 60%)' }} />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
              Ready to <span className="text-gradient-gold">start</span>?
            </h2>
            <p className="mt-4 max-w-xl mx-auto" style={{ color: 'var(--muted-foreground)' }}>
              Free to join. Takes about 60 seconds. Verify your email, deposit via M-Pesa, and you're set.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register"
                className="px-7 py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2 glow-gold hover:opacity-90 transition"
                style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                Create my account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login"
                className="px-7 py-3.5 rounded-xl glass font-semibold inline-flex items-center justify-center text-white">
                I already have one
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ COMPLIANCE ━━━━━━━━━━━━━━━━━━ */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3 mb-3">
            <Shield className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--primary)' }} />
            <div className="text-sm font-bold text-white">Risk disclosure</div>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
            CoinTap is a digital investment platform. Investments carry risk — past performance does
            not guarantee future results. Returns shown are targets, not guarantees. Holdings on the
            platform are not bank deposits and are not covered by deposit insurance schemes. Withdrawals
            depend on pool liquidity at the time of request. If you do not understand the model, please
            do not invest.
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━ FOOTER ━━━━━━━━━━━━━━━━━━ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="mt-4 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo />
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs"
              style={{ color: 'var(--muted-foreground)' }}>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <button onClick={() => scrollTo('#faq')} className="hover:text-white transition-colors">FAQ</button>
              <Link to="/apply" className="hover:text-white transition-colors">Careers</Link>
            </div>
            <div className="text-xs text-center sm:text-right" style={{ color: 'var(--muted-foreground)' }}>
              © {new Date().getFullYear()} CoinTap · cointap.online
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
