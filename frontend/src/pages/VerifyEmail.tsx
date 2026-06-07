import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell, Field } from '@/components/cointap/AuthShell'
import { http } from '@/lib/api'
import { Mail, Check, AlertTriangle } from 'lucide-react'

/**
 * /verify-email[?token=XXX]  — handles three different scenarios:
 *
 *  1. URL has ?token=XXX → user clicked the magic link from their email.
 *     Verify the token on the backend, show success and redirect to login.
 *
 *  2. No token in URL → user manually visited /verify-email after signup.
 *     Show a "check your email" message + form to resend the verification.
 *
 *  3. Token is invalid/expired → show a clear "expired" UI + resend form.
 */
export function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = (searchParams.get('token') || '').trim()
  const initialEmail = (searchParams.get('email') || '').trim()

  // ── Token-flow state (when arriving from email link) ─────────
  const [state, setState] = useState<'check' | 'verifying' | 'verified' | 'invalid' | 'no-token'>(
    token ? 'check' : 'no-token'
  )
  const [verifyError, setVerifyError] = useState('')

  // ── Resend-flow state (manual visit, or after invalid token) ─
  const [email, setEmail] = useState(initialEmail)
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    // Pre-flight check first so we can render the right state without a
    // round trip through an error.
    http.get<{ ok: boolean; valid: boolean }>(
      `/auth/verify-email-token?token=${encodeURIComponent(token)}`,
    )
      .then((res) => {
        if (cancelled) return
        if (!res.valid) {
          setState('invalid')
          return
        }
        // Token is valid — consume it
        setState('verifying')
        return http.post('/auth/verify-email', { token }, false)
          .then(() => {
            if (cancelled) return
            setState('verified')
            setTimeout(() => navigate('/login'), 2500)
          })
          .catch((e: any) => {
            if (cancelled) return
            setVerifyError(e?.message || 'Verification failed')
            setState('invalid')
          })
      })
      .catch(() => {
        if (cancelled) return
        setState('invalid')
      })
    return () => { cancelled = true }
  }, [token, navigate])

  async function resend(e?: React.FormEvent) {
    e?.preventDefault()
    setResendError('')
    setResendDone(false)
    if (!email.trim()) {
      setResendError('Please enter your email')
      return
    }
    setResending(true)
    try {
      await http.post('/auth/resend-verification', { email: email.trim().toLowerCase() }, false)
      setResendDone(true)
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('valid email')) {
        setResendError(msg)
      } else {
        setResendDone(true)   // fail closed to mimic success
      }
    } finally {
      setResending(false)
    }
  }

  // ── Render states ───────────────────────────────────────────

  if (state === 'check' || state === 'verifying') {
    return (
      <AuthShell title="Verifying your email…" subtitle="Just a moment.">
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 rounded-full animate-spin"
            style={{ border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)' }} />
        </div>
      </AuthShell>
    )
  }

  if (state === 'verified') {
    return (
      <AuthShell
        title="Email verified! 🎉"
        subtitle="Redirecting you to sign in…"
        footer={<>Or <Link to="/login" style={{ color: 'var(--primary)' }} className="font-medium">go now</Link></>}
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.15)' }}>
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-sm text-white font-medium">All set</div>
          <div className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            Your CoinTap account is active. Sign in to start investing.
          </div>
        </div>
      </AuthShell>
    )
  }

  if (state === 'invalid') {
    return (
      <AuthShell
        title="Link expired or invalid"
        subtitle="Verification links expire after 24 hours."
        footer={<>Already verified? <Link to="/login" style={{ color: 'var(--primary)' }} className="font-medium">Sign in</Link></>}
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div className="text-sm text-white font-medium">This link no longer works</div>
          <div className="text-xs mt-2 mb-5" style={{ color: 'var(--muted-foreground)' }}>
            {verifyError || 'It may have been used already or has expired. Enter your email below and we\'ll send a fresh one.'}
          </div>
          <ResendForm
            email={email} setEmail={setEmail}
            resending={resending} resendDone={resendDone} resendError={resendError}
            onSubmit={resend}
          />
        </div>
      </AuthShell>
    )
  }

  // state === 'no-token' — manual visit (e.g. right after signup)
  return (
    <AuthShell
      title="Check your email"
      subtitle="We sent you a verification link. Click it to activate your account."
      footer={<>Already verified? <Link to="/login" style={{ color: 'var(--primary)' }} className="font-medium">Sign in</Link></>}
    >
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(247,147,26,0.15)' }}>
          <Mail className="w-7 h-7" style={{ color: 'var(--primary)' }} />
        </div>
        <div className="text-sm text-white font-medium">Almost there</div>
        <div className="text-xs mt-2 mb-5" style={{ color: 'var(--muted-foreground)' }}>
          Open the email we sent and click "Verify my email". The link expires in 24 hours.
        </div>
        <div className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
          Didn't get it? Check spam, or resend below.
        </div>
        <ResendForm
          email={email} setEmail={setEmail}
          resending={resending} resendDone={resendDone} resendError={resendError}
          onSubmit={resend}
        />
      </div>
    </AuthShell>
  )
}


function ResendForm({ email, setEmail, resending, resendDone, resendError, onSubmit }: {
  email: string
  setEmail: (v: string) => void
  resending: boolean
  resendDone: boolean
  resendError: string
  onSubmit: (e?: React.FormEvent) => void
}) {
  if (resendDone) {
    return (
      <div className="p-3 rounded-lg text-xs"
        style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#86efac' }}>
        ✓ If that email is unverified, we just sent another link.
      </div>
    )
  }
  return (
    <form onSubmit={onSubmit}>
      <Field label="Your email" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com" required />
      {resendError && (
        <div className="mb-3 p-2.5 rounded-lg text-xs text-red-300"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {resendError}
        </div>
      )}
      <button type="submit" disabled={resending}
        className="w-full py-3 rounded-xl font-semibold transition disabled:opacity-50"
        style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
        {resending ? 'Sending…' : 'Resend verification email'}
      </button>
    </form>
  )
}
