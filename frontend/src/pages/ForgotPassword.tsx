import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell, Field } from '@/components/cointap/AuthShell'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <AuthShell
      title="Reset Your Password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={<>Remember it? <Link to="/login" style={{ color: 'var(--primary)' }} className="font-medium">Back to login</Link></>}
    >
      {!sent ? (
        <form onSubmit={submit}>
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@cointap.trade" required />
          <button type="submit"
            className="w-full py-3.5 rounded-xl font-semibold glow-gold hover:opacity-90 transition"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            Send Reset Link
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
          </div>
        </div>
      )}
    </AuthShell>
  )
}
