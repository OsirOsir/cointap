import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Zap, TrendingUp, Wallet, Clock, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/cointap/Logo'
import { NodeBackground } from '@/components/cointap/NodeBackground'

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass rounded-xl p-4 text-center">
      <div className="text-xl sm:text-2xl font-bold text-gradient-gold">{value}</div>
      <div className="text-[11px] sm:text-xs tracking-wider uppercase mt-1" style={{ color: 'var(--muted-foreground)' }}>{label}</div>
    </div>
  )
}

export function Landing() {
  const plans = [
    { name: 'Starter', days: 4, profit: 30, min: 500 },
    { name: 'Growth', days: 8, profit: 65, min: 2000 },
    { name: 'Premium', days: 12, profit: 95, min: 10000 },
  ]

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-2 text-sm transition-colors hover:text-white"
              style={{ color: 'var(--muted-foreground)' }}>Login</Link>
            <Link to="/register" className="px-4 py-2 text-sm font-semibold rounded-xl glow-gold transition-opacity hover:opacity-90"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
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
            <a href="#plans" className="px-6 py-3.5 rounded-xl glass font-semibold inline-flex items-center justify-center text-white">
              View Plans
            </a>
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
              <div className="text-3xl sm:text-4xl font-bold text-gradient-gold font-mono mt-1">Ksh 2,450,000</div>
              <div className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Public liquidity · Auto-replenishing</div>
            </div>
            <div className="w-full sm:w-64">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
                <span>Pool depletion</span><span>61%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <div className="h-full rounded-full" style={{ width: '61%', background: 'var(--gradient-gold)' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="max-w-6xl mx-auto px-4 py-12">
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

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-12">
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

      {/* Trust */}
      <section className="max-w-6xl mx-auto px-4 py-12">
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
          <div className="text-xs text-center sm:text-right" style={{ color: 'var(--muted-foreground)' }}>
            <div>© {new Date().getFullYear()} CoinTap · cointap.trade</div>
            <div className="mt-1">Investing involves risk. Track responsibly.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
