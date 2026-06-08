import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Logo } from '@/components/cointap/Logo'

/**
 * Terms of service — placeholder until the real document is drafted.
 *
 * Like Privacy.tsx, intentionally conservative — only states things we
 * can actually back up. Specific clauses (jurisdiction, dispute
 * resolution, fee schedule) should be reviewed by legal.
 */
export function Terms() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 glass" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm hover:text-white transition-colors"
            style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <Logo size={28} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs mb-5"
          style={{ color: 'var(--primary)' }}>
          <FileText className="w-3.5 h-3.5" />
          Legal
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
          Terms <span className="text-gradient-gold">of Service</span>
        </h1>
        <p className="mt-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
        </p>

        <div className="mt-10 glass rounded-2xl p-6 sm:p-8 space-y-6">
          <section>
            <h2 className="font-bold text-white text-lg mb-2">1. Acceptance</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              By creating an account on CoinTap, you agree to these terms and to our Privacy Policy. If you
              do not agree with any part of these terms, please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">2. The service</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              CoinTap is a digital investment platform that lets you deposit funds, purchase plan shares from
              a public pool, and withdraw matured returns. We do not provide financial, tax, or legal advice.
              Plans, returns, and minimum amounts may change. Current details are always shown live on the site.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">3. Your account</h2>
            <ul className="text-sm leading-relaxed space-y-1.5 list-disc pl-5" style={{ color: 'var(--muted-foreground)' }}>
              <li>You must provide accurate registration details and keep them current.</li>
              <li>You are responsible for your password and for activity on your account.</li>
              <li>One account per person. Multi-account abuse may result in suspension.</li>
              <li>We may require email verification before allowing certain actions.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">4. Risk</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Investments on CoinTap carry risk. Returns are targets, not guarantees. Holdings on the platform
              are not bank deposits and are not covered by deposit insurance schemes. Withdrawals depend on
              pool liquidity at the time of request. <span className="text-white font-semibold">Only invest what
              you are comfortable with.</span>
            </p>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">5. Prohibited use</h2>
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--muted-foreground)' }}>
              You agree not to use CoinTap for:
            </p>
            <ul className="text-sm leading-relaxed space-y-1.5 list-disc pl-5" style={{ color: 'var(--muted-foreground)' }}>
              <li>Money laundering, fraud, or any illegal activity</li>
              <li>Accessing other users' accounts without authorisation</li>
              <li>Automated scraping, scripts, or bot-driven account creation</li>
              <li>Reverse-engineering or attempting to interfere with the service</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">6. Fees</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Joining CoinTap is free. Any deposit, plan, or withdrawal fees are displayed in the app before you
              confirm a transaction. We will never charge you something you haven't approved on screen.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">7. Termination</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              You can close your account any time by contacting support. We may suspend or terminate accounts
              that violate these terms, with notice where reasonably possible.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">8. Changes</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              We may update these terms as the platform evolves. Material changes will be announced via email
              to registered users before they take effect.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">Contact</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Questions about these terms? Use the in-app chat or write to{' '}
              <span className="text-white font-semibold">noreply@cointap.online</span>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
