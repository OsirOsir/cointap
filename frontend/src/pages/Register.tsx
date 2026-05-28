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
  const [f, setF] = useState({
    full_name: '', email: '', phone: '', password: '', confirm: '',
    ref: searchParams.get('ref') || '',
  })
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

        <Field label="Referral code (optional)" value={f.ref} onChange={up('ref')} placeholder="CTXXXXX" />

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
