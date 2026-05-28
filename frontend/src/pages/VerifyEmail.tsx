import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/cointap/AuthShell'
import { TwoFactorInput } from '@/components/cointap/Security'
import { store, useStore } from '@/lib/cointap-store'
import { Mail, Check, RefreshCw, AlertTriangle } from 'lucide-react'

export function VerifyEmail() {
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (user?.email_verified) {
      setVerified(true)
      setTimeout(() => navigate('/dashboard'), 1500)
    }
  }, [user, navigate])

  useEffect(() => {
    if (resendIn > 0) {
      const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendIn])

  function submit(value: string) {
    setError('')
    // Demo: accept any 6-digit code, or specifically "123456"
    if (value.length !== 6) {
      setError('Enter the full 6-digit code')
      return
    }
    store.verifyEmail()
    setVerified(true)
    setTimeout(() => navigate('/dashboard'), 1500)
  }

  function resend() {
    setResendIn(60)
    setCode('')
    setError('')
  }

  if (!user) {
    return (
      <AuthShell title="Verify Your Email" subtitle="">
        <div className="text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Please <a href="/login" style={{ color: 'var(--primary)' }}>login</a> first.
        </div>
      </AuthShell>
    )
  }

  if (verified) {
    return (
      <AuthShell title="Email Verified!" subtitle="Welcome to CoinTap.">
        <div className="flex flex-col items-center py-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-glow"
            style={{ background: 'var(--gradient-gold)' }}>
            <Check className="w-10 h-10" style={{ color: 'var(--primary-foreground)' }} strokeWidth={3} />
          </div>
          <p className="mt-4 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
            Redirecting to your dashboard...
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Verify Your Email"
      subtitle={`We sent a 6-digit code to ${user.email}`}
      footer={<button onClick={() => { store.logout(); navigate('/login') }} style={{ color: 'var(--muted-foreground)' }} className="text-xs">Use a different account</button>}>

      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse-glow"
          style={{ background: 'var(--gradient-gold)' }}>
          <Mail className="w-8 h-8" style={{ color: 'var(--primary-foreground)' }} />
        </div>
      </div>

      <TwoFactorInput value={code} onChange={setCode} onComplete={submit} autoFocus />

      {error && (
        <div className="mt-4 p-3 rounded-xl text-sm flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <button onClick={() => submit(code)} disabled={code.length !== 6}
        className="mt-5 w-full py-3.5 rounded-xl font-semibold glow-gold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
        Verify Email
      </button>

      <div className="mt-4 text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
        Didn't get the code?{' '}
        {resendIn > 0 ? (
          <span>Resend in <span className="font-bold text-white">{resendIn}s</span></span>
        ) : (
          <button onClick={resend} className="font-semibold inline-flex items-center gap-1"
            style={{ color: 'var(--primary)' }}>
            <RefreshCw className="w-3 h-3" /> Resend code
          </button>
        )}
      </div>

      <div className="mt-4 p-3 rounded-xl text-xs text-center" style={{ background: 'rgba(247,147,26,0.05)', border: '1px solid rgba(247,147,26,0.1)', color: 'var(--muted-foreground)' }}>
        Demo: enter any 6-digit code (e.g. <code style={{ color: 'var(--primary)' }}>123456</code>)
      </div>
    </AuthShell>
  )
}
