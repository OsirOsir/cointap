import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell, Field } from '@/components/cointap/AuthShell'
import { http } from '@/lib/api'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }
    setSubmitting(true)
    try {
      // The API responds the same way whether the email exists or not,
      // to prevent enumeration. We always show the success screen on 200.
      await http.post('/auth/forgot-password', { email: email.trim().toLowerCase() }, false)
      setSent(true)
    } catch (e: any) {
      // Only surface user-friendly errors (rate-limited or invalid format).
      // For other failures, behave like success — the user shouldn't be
      // able to detect whether their email exists.
      const msg = e?.message || ''
      if (msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('valid email')) {
        setError(msg)
      } else {
        setSent(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Reset Your Password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={<>Remember it? <Link to="/login" style={{ color: 'var(--primary)' }} className="font-medium">Back to login</Link></>}
    >
      {!sent ? (
        <form onSubmit={submit}>
          <Field label="Email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" required autoFocus />

          {error && (
            <div className="mb-3 p-3 rounded-lg text-sm text-red-300"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-xl font-semibold glow-gold hover:opacity-90 transition disabled:opacity-50"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {submitting ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>
      ) : (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.15)' }}>
            <span className="text-2xl">✓</span>
          </div>
          <div className="text-sm text-white font-medium">Check your email</div>
          <div className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            If <strong>{email}</strong> has an account, you'll receive a reset link shortly.
            The link expires in 1 hour.
          </div>
          <div className="text-xs mt-4" style={{ color: 'var(--muted-foreground)' }}>
            Didn't get it? Check spam, or <button onClick={() => { setSent(false); setEmail('') }}
              className="font-semibold underline"
              style={{ color: 'var(--primary)' }}>try again</button>.
          </div>
        </div>
      )}
    </AuthShell>
  )
}
