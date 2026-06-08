import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { Logo } from '@/components/cointap/Logo'

/**
 * Privacy policy — placeholder until the real document is drafted.
 *
 * This page intentionally avoids making specific privacy claims that
 * we can't fully verify (e.g. data retention, third-party sharing).
 * The real text should be reviewed by legal before publishing.
 */
export function Privacy() {
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
          <Shield className="w-3.5 h-3.5" />
          Legal
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
          Privacy <span className="text-gradient-gold">Policy</span>
        </h1>
        <p className="mt-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
        </p>

        <div className="mt-10 glass rounded-2xl p-6 sm:p-8 space-y-6">
          <section>
            <h2 className="font-bold text-white text-lg mb-2">What this page covers</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              This privacy policy describes how CoinTap collects, uses, and protects information you share with us
              when you create an account, deposit funds, invest, and withdraw on the platform.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">Information we collect</h2>
            <ul className="text-sm leading-relaxed space-y-1.5 list-disc pl-5" style={{ color: 'var(--muted-foreground)' }}>
              <li>Account details: name, email, phone number you provide at registration</li>
              <li>Transaction details: deposits, investments, withdrawals through the platform</li>
              <li>Technical data: device, browser, IP address used to access the service</li>
              <li>Communications: support chats and emails you send us</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">How we use your information</h2>
            <ul className="text-sm leading-relaxed space-y-1.5 list-disc pl-5" style={{ color: 'var(--muted-foreground)' }}>
              <li>To operate the platform: process your deposits, plans, and withdrawals</li>
              <li>To secure your account: detect suspicious activity, prevent fraud</li>
              <li>To communicate with you: account alerts, verification, support replies</li>
              <li>To improve the service: understand how the platform is used in aggregate</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">How we protect it</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Passwords are hashed with bcrypt. Sessions use JWT tokens with short expiry windows. All traffic is encrypted
              over HTTPS. Every wallet transaction is recorded with a full audit trail.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">Your choices</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              You can update your profile, change your password, or request account deletion at any time by
              contacting support through the in-app chat.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-white text-lg mb-2">Contact</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              Questions about this policy? Tap the chat bubble on any CoinTap page or write to
              {' '}<span className="text-white font-semibold">noreply@cointap.online</span>.
            </p>
          </section>

          <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
              This policy is being kept current as the platform evolves. Material changes will be announced via email
              to registered users before taking effect.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
