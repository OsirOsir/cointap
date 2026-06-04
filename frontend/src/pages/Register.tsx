import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell, Field } from '@/components/cointap/AuthShell'
import { Captcha, PasswordStrength, getPasswordStrength } from '@/components/cointap/Security'
import { GoogleSignInButton, OrDivider } from '@/components/cointap/GoogleSignIn'
import { store } from '@/lib/cointap-store'
import { AlertTriangle } from 'lucide-react'

export function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Track whether the referral code came from the URL (?ref=...) — if so, we
  // lock the field so the user can't accidentally clear or modify it during
  // registration. This protects the referrer's credit.
  const refFromUrl = (searchParams.get('ref') || '').trim().toUpperCase()
  const [f, setF] = useState({
    full_name: '', email: '', phone: '', password: '', confirm: '',
    ref: refFromUrl,
  })
  const refLocked = refFromUrl.length > 0
  const [error, setError] = useState('')
  const [captchaOK, setCaptchaOK] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validations
    if (!f.full_name.trim() || f.full_name.trim().length < 2) {
      setError('Please enter your full name'); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      setError('Please enter a valid email address'); return
    }
    if (!/^\+?\d{9,15}$/.test(f.phone.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number'); return
    }
    if (f.password !== f.confirm) {
      setError('Passwords do not match'); return
    }

    const { score, label } = getPasswordStrength(f.password)
    if (score < 3) {
      setError(`Password is "${label}". Please use a stronger password.`); return
    }

    if (!captchaOK) { setError('Please complete the bot check'); return }
    if (!agreed) { setError('You must accept the Terms & Privacy Policy'); return }

    setSubmitting(true)
    const res = await store.apiRegister({
      full_name: f.full_name.trim(),
      email: f.email.toLowerCase().trim(),
      phone: f.phone.trim(),
      password: f.password,
      promo_code: f.ref.trim(),
    })
    setSubmitting(false)

    if (!res.ok) {
      setError(res.error || 'Registration failed')
      return
    }
    navigate('/dashboard')
  }

  return (
    <AuthShell
      title="Create Your CoinTap Account"
      subtitle="Start your crypto investment journey with a secure wallet and live growth tracking."
      footer={<>Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }} className="font-medium">Login</Link></>}>

      {/* Google Sign-up */}
      <GoogleSignInButton
        label="Sign up with Google"
        onSuccess={(isNewUser) => {
          // Google accounts skip email verification — go straight to dashboard
          navigate(isNewUser ? '/dashboard' : '/dashboard')
        }}
        onError={(msg) => setError(msg)}
      />
      <OrDivider label="or with email" />

      <form onSubmit={submit}>
        <Field label="Full name" value={f.full_name} onChange={up('full_name')} required placeholder="John Doe" />
        <Field label="Email" type="email" value={f.email} onChange={up('email')} required placeholder="you@example.com" />
        <Field label="Phone number" type="tel" value={f.phone} onChange={up('phone')} placeholder="+254 7XX XXX XXX" required />

        <Field label="Password" type="password" value={f.password} onChange={up('password')} required placeholder="••••••••" />
        {f.password && (
          <div className="-mt-1 mb-3">
            <PasswordStrength password={f.password} />
          </div>
        )}

        <Field label="Confirm password" type="password" value={f.confirm} onChange={up('confirm')} required placeholder="••••••••" />
        {f.confirm && f.confirm !== f.password && (
          <div className="-mt-2 mb-3 text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Passwords don't match
          </div>
        )}

        {/* Referral code — locked when supplied via URL to protect referrer credit */}
        {refLocked ? (
          <div className="block mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs tracking-wider uppercase"
                style={{ color: 'var(--muted-foreground)' }}>
                Referred by a Friend
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
                🔒 Locked
              </span>
            </div>
            <div className="relative">
              <input value={f.ref} readOnly
                aria-label="Referral code (locked)"
                tabIndex={-1}
                className="w-full px-4 py-3 rounded-xl text-white font-mono tracking-widest font-bold pointer-events-none select-none"
                style={{
                  background: 'rgba(247,147,26,0.08)',
                  border: '1px solid rgba(247,147,26,0.3)',
                  fontSize: '0.95rem',
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                }} />
              {/* Hidden field that submits with the form — readOnly works but
                  belt-and-suspenders in case the visible input is intercepted */}
              <input type="hidden" name="ref" value={f.ref} />
            </div>
            <div className="text-[10px] mt-1.5 flex items-center gap-1.5"
              style={{ color: 'var(--muted-foreground)' }}>
              <span>✓ Your friend will be credited when you start investing.</span>
            </div>
          </div>
        ) : (
          <Field label="Referral code (optional)" value={f.ref} onChange={up('ref')}
            placeholder="CTXXXXX" maxLength={10} />
        )}

        <div className="mb-3">
          <Captcha onValid={() => setCaptchaOK(true)} onInvalid={() => setCaptchaOK(false)} />
        </div>

        <label className="flex items-start gap-2 cursor-pointer mb-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 flex-shrink-0 accent-orange-500" />
          <span>
            I agree to the <a href="#" style={{ color: 'var(--primary)' }} className="font-semibold">Terms of Service</a> and <a href="#" style={{ color: 'var(--primary)' }} className="font-semibold">Privacy Policy</a>, and confirm I am 18 years or older.
          </span>
        </label>

        {error && (
          <div className="mb-3 p-3 rounded-xl text-sm flex items-center gap-2"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full mt-2 py-3.5 rounded-xl font-semibold glow-gold hover:opacity-90 transition disabled:opacity-60"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          {submitting ? 'Creating account…' : 'Create Secure Wallet'}
        </button>
      </form>
    </AuthShell>
  )
}
