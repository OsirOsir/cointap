import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, AlertTriangle, Lock, Clock, CheckCircle } from 'lucide-react'
import { formatKsh, store, useStore } from '@/lib/cointap-store'
import { TwoFactorInput, EmailVerificationBanner } from '@/components/cointap/Security'

const TWOFA_THRESHOLD = 5_000
const COOLDOWN_MS = 60 * 60_000   // 1 hour demo
const DAILY_LIMIT = 500_000

export function Withdraw() {
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const wallet = useStore((s) => s.wallet)
  const wds = useStore((s) => s.withdrawals)
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState(user?.phone || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [step, setStep] = useState<'form' | '2fa'>('form')
  const [twoFAcode, setTwoFAcode] = useState('')
  const [cooldownLeft, setCooldownLeft] = useState(0)

  // Cooldown ticker
  useEffect(() => {
    const tick = () => {
      if (!user?.last_withdrawal_at) { setCooldownLeft(0); return }
      const elapsed = Date.now() - user.last_withdrawal_at
      const remaining = Math.max(0, COOLDOWN_MS - elapsed)
      setCooldownLeft(remaining)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [user?.last_withdrawal_at])

  if (!user) { navigate('/login'); return null }

  const numericAmount = parseFloat(amount) || 0
  const needs2FA = numericAmount >= TWOFA_THRESHOLD
  const dailyUsed = user.daily_withdrawal_total || 0
  const dailyRemaining = Math.max(0, DAILY_LIMIT - dailyUsed)

  function attemptWithdraw(e: React.FormEvent | null, code?: string) {
    e?.preventDefault()
    setError(''); setSuccess('')

    const res = store.requestWithdrawal(numericAmount, phone, code)
    if (!res.ok) {
      if (res.requires_2fa) {
        setStep('2fa')
        return
      }
      setError(res.error!)
      return
    }
    setSuccess('✓ Withdrawal requested — pending admin approval')
    setAmount('')
    setStep('form')
    setTwoFAcode('')
  }

  function on2FAcomplete(code: string) {
    attemptWithdraw(null, code)
  }

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  // 2FA STEP
  if (step === '2fa') {
    return (
      <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto">
        <button onClick={() => { setStep('form'); setTwoFAcode(''); setError('') }}
          className="inline-flex items-center gap-2 text-sm mb-4 hover:text-white transition-colors"
          style={{ color: 'var(--muted-foreground)' }}>
          <ArrowLeft className="w-4 h-4" /> Back to amount
        </button>

        <div className="glass rounded-2xl p-6 sm:p-8">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse-glow"
              style={{ background: 'var(--gradient-gold)' }}>
              <Shield className="w-8 h-8" style={{ color: 'var(--primary-foreground)' }} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white text-center">Confirm Withdrawal</h1>
          <p className="text-sm text-center mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Enter the 6-digit code from your authenticator
          </p>

          <div className="my-6 p-4 rounded-xl text-center"
            style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.2)' }}>
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>You're withdrawing</div>
            <div className="text-3xl font-bold text-gradient-gold font-mono mt-1">{formatKsh(numericAmount)}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>To {phone}</div>
          </div>

          <TwoFactorInput value={twoFAcode} onChange={setTwoFAcode} onComplete={on2FAcomplete} autoFocus />

          {error && (
            <div className="mt-4 p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button onClick={() => attemptWithdraw(null, twoFAcode)} disabled={twoFAcode.length !== 6}
            className="mt-5 w-full py-3.5 rounded-xl font-semibold glow-gold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            Verify & Withdraw
          </button>

          <div className="mt-4 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Demo code: <code style={{ color: 'var(--primary)' }}>123456</code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto pb-24">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm mb-4 hover:text-white transition-colors"
        style={{ color: 'var(--muted-foreground)' }}>
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {!user.email_verified && (
        <div className="mb-4">
          <EmailVerificationBanner onVerify={() => navigate('/verify-email')} />
        </div>
      )}

      <div className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white">Withdraw to M-Pesa</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Funds sent securely after admin approval.
        </p>

        {/* Balance + Daily limit */}
        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Available</div>
            <div className="text-xl font-bold font-mono text-gradient-gold mt-1">{formatKsh(wallet.balance)}</div>
          </div>
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Daily Limit</div>
            <div className="text-xl font-bold font-mono text-white mt-1">{formatKsh(dailyRemaining)}</div>
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div className="h-full rounded-full" style={{
                width: ((dailyUsed / DAILY_LIMIT) * 100) + '%',
                background: dailyUsed / DAILY_LIMIT > 0.8 ? '#ef4444' : 'var(--gradient-gold)',
              }} />
            </div>
          </div>
        </div>

        {/* Cooldown active */}
        {cooldownLeft > 0 && (
          <div className="mt-4 p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <Clock className="w-5 h-5 flex-shrink-0" style={{ color: '#fbbf24' }} />
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Cooldown active</div>
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Next withdrawal available in <span className="font-bold text-white">{formatTime(cooldownLeft)}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={(e) => attemptWithdraw(e)} className="mt-5 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Amount (Ksh)</label>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); setSuccess('') }}
              min={200} placeholder="Min Ksh 200"
              disabled={cooldownLeft > 0}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono text-lg disabled:opacity-50"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />

            {needs2FA && (
              <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: 'var(--primary)' }}>
                <Shield className="w-3 h-3" />
                2FA verification required (amount over {formatKsh(TWOFA_THRESHOLD)})
              </div>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>M-Pesa Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              disabled={cooldownLeft > 0}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white disabled:opacity-50"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}

          <button type="submit" disabled={cooldownLeft > 0 || !user.email_verified || numericAmount <= 0}
            className="w-full py-3.5 rounded-xl font-semibold glow-gold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {needs2FA && <Lock className="w-4 h-4" />}
            {cooldownLeft > 0 ? 'Cooldown active' :
              !user.email_verified ? 'Verify Email First' :
              needs2FA ? 'Continue to 2FA' : 'Request Withdrawal'}
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="flex items-start gap-2 text-[11px] p-3 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--muted-foreground)' }}>
            <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
            Admin reviews all withdrawals before payout
          </div>
          <div className="flex items-start gap-2 text-[11px] p-3 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--muted-foreground)' }}>
            <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
            2FA for amounts over Ksh 5,000
          </div>
        </div>
      </div>

      {/* Recent withdrawals */}
      <div className="glass rounded-2xl p-5 mt-5">
        <h3 className="font-semibold mb-3 text-white">Recent Withdrawals</h3>
        {wds.length === 0 ? (
          <div className="text-sm text-center py-6" style={{ color: 'var(--muted-foreground)' }}>No withdrawals yet</div>
        ) : (
          <div className="space-y-2">
            {wds.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div className="font-mono text-sm text-white">{formatKsh(w.amount)}</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{w.phone}</div>
                  {w.mpesa_reference && (
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      Ref: {w.mpesa_reference}
                    </div>
                  )}
                </div>
                <span className="text-[10px] px-2 py-1 rounded uppercase font-bold"
                  style={
                    w.status === 'paid' ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' } :
                    w.status === 'rejected' ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } :
                    w.status === 'processing' ? { background: 'rgba(247,147,26,0.15)', color: 'var(--primary)' } :
                    { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }
                  }>{w.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
