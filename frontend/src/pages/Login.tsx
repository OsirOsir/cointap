import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell, Field } from '@/components/cointap/AuthShell'
import { Captcha, TwoFactorInput } from '@/components/cointap/Security'
import { GoogleSignInButton, OrDivider } from '@/components/cointap/GoogleSignIn'
import { store, useStore } from '@/lib/cointap-store'
import { Lock, AlertTriangle, Shield } from 'lucide-react'

export function Login() {
  const navigate = useNavigate()
  const lockoutUntil = useStore((s) => s.lockout_until)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaOK, setCaptchaOK] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials')
  const [twoFAcode, setTwoFAcode] = useState('')
  const [twoFAerror, setTwoFAerror] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutMinutes, setLockoutMinutes] = useState(0)

  // Lockout countdown ticker
  useEffect(() => {
    if (!lockoutUntil) {
      setIsLocked(false)
      return
    }
    const tick = () => {
      const remaining = lockoutUntil - Date.now()
      if (remaining <= 0) {
        setIsLocked(false)
        setLockoutMinutes(0)
        store.clearLockout()
      } else {
        setIsLocked(true)
        setLockoutMinutes(Math.ceil(remaining / 60_000))
      }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [lockoutUntil])

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Email and password are required'); return }
    if (!captchaOK) { setError('Please complete the bot check'); return }

    const res = await store.apiLogin(email, password)

    if (!res.ok) {
      setError(res.error || 'Login failed')
      return
    }

    // Route based on real role from backend
    navigate(res.user?.role === 'admin' ? '/admin' : '/dashboard')
  }

  function submit2FA(code: string) {
    setTwoFAerror('')
    const res = store.verify2FA(code)
    if (!res.ok) {
      setTwoFAerror(res.error || 'Invalid code')
      setTwoFAcode('')
      return
    }
    const isAdmin = email.toLowerCase().includes('admin')
    navigate(isAdmin ? '/admin' : '/dashboard')
  }

  if (step === '2fa') {
    return (
      <AuthShell
        title="Two-Factor Authentication"
        subtitle="Enter the 6-digit code from your authenticator app"
        footer={<button onClick={() => { setStep('credentials'); setTwoFAcode(''); setTwoFAerror('') }} style={{ color: 'var(--primary)' }} className="font-medium">← Back to login</button>}>
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse-glow"
            style={{ background: 'var(--gradient-gold)' }}>
            <Shield className="w-8 h-8" style={{ color: 'var(--primary-foreground)' }} />
          </div>
        </div>

        <TwoFactorInput value={twoFAcode} onChange={setTwoFAcode} onComplete={submit2FA} autoFocus />

        {twoFAerror && (
          <div className="mt-4 p-3 rounded-xl text-sm flex items-center gap-2"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {twoFAerror}
          </div>
        )}

        <button onClick={() => submit2FA(twoFAcode)} disabled={twoFAcode.length !== 6}
          className="mt-5 w-full py-3.5 rounded-xl font-semibold glow-gold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          Verify & Continue
        </button>

        <div className="mt-4 p-3 rounded-xl text-xs text-center" style={{ background: 'rgba(247,147,26,0.05)', border: '1px solid rgba(247,147,26,0.1)', color: 'var(--muted-foreground)' }}>
          Demo: use code <code className="font-bold" style={{ color: 'var(--primary)' }}>123456</code>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Welcome Back to CoinTap"
      subtitle="Access your wallet, track active investments, and manage withdrawals securely."
      footer={<>New to CoinTap? <Link to="/register" style={{ color: 'var(--primary)' }} className="font-medium">Create account</Link></>}>

      {isLocked && (
        <div className="mb-5 p-4 rounded-xl flex items-start gap-3 animate-pulse-glow"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
          <div>
            <div className="font-bold text-red-400 text-sm">Account Locked</div>
            <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Too many failed attempts. Try again in <span className="font-bold text-white">{lockoutMinutes} minute{lockoutMinutes !== 1 ? 's' : ''}</span>.
            </div>
          </div>
        </div>
      )}

      {/* Google Sign-In */}
      {!isLocked && (
        <>
          <GoogleSignInButton
            label="Continue with Google"
            onSuccess={() => navigate('/dashboard')}
            onError={(msg) => setError(msg)}
          />
          <OrDivider label="or sign in with email" />
        </>
      )}

      <form onSubmit={submitCredentials}>
        <fieldset disabled={isLocked} className="space-y-0">
          <Field label="Email or phone" type="text" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@cointap.trade" required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" required />
        </fieldset>

        <div className="flex justify-end -mt-1 mb-4">
          <Link to="/forgot-password" className="text-xs hover:text-white transition-colors" style={{ color: 'var(--muted-foreground)' }}>
            Forgot password?
          </Link>
        </div>

        <Captcha onValid={() => setCaptchaOK(true)} onInvalid={() => setCaptchaOK(false)} />

        {error && (
          <div className="mt-4 p-3 rounded-xl text-sm flex items-center gap-2"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <button type="submit" disabled={isLocked || !captchaOK}
          className="mt-4 w-full py-3.5 rounded-xl font-semibold glow-gold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed">
          <span style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)', display: 'block', margin: -14, padding: 14, borderRadius: 12 }}>
            {isLocked ? 'Account Locked' : 'Login to Dashboard'}
          </span>
        </button>
      </form>

      <div className="mt-4 p-3 rounded-xl text-xs text-center" style={{ background: 'rgba(247,147,26,0.05)', border: '1px solid rgba(247,147,26,0.1)', color: 'var(--muted-foreground)' }}>
        Sign in with your registered email and password.
      </div>
    </AuthShell>
  )
}
