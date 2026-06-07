import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell, Field } from '@/components/cointap/AuthShell'
import { PasswordStrength, getPasswordStrength } from '@/components/cointap/Security'
import { http } from '@/lib/api'

/**
 * /reset-password?token=XXX — landing page from the password reset email.
 *
 * Token is in the URL. User enters a new password. On success, we
 * redirect to /login so they can sign in with the new password.
 *
 * Edge cases handled:
 *   - Missing token in URL → friendly error + link back to /forgot-password
 *   - Expired/invalid token (server-side check) → friendly error
 *   - Password too weak → inline validation
 *   - Mismatched confirm → inline validation
 *   - Network / server error → user-friendly retry message
 */
export function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = (searchParams.get('token') || '').trim()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // If somebody hits this page without a token (e.g. bookmark from later),
  // bail immediately to a helpful error state.
  const noToken = !token

  const strength = getPasswordStrength(password)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (strength.score < 2) {
      setError('Please choose a stronger password')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await http.post('/auth/reset-password',
        { token, new_password: password },
        false,
      )
      setDone(true)
      // Auto-redirect to login after a moment so they don't have to click
      setTimeout(() => navigate('/login'), 2500)
    } catch (e: any) {
      setError(e?.message || 'Could not reset password. The link may have expired.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── States ─────────────────────────────────────────────────

  if (noToken) {
    return (
      <AuthShell
        title="Invalid reset link"
        subtitle="This page needs a valid reset token to work."
        footer={<>Need a new link? <Link to="/forgot-password" style={{ color: 'var(--primary)' }} className="font-medium">Request one</Link></>}
      >
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)' }}>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-sm text-white font-medium">No reset token found</div>
          <div className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            Make sure you opened the link from your email exactly as it was sent.
            If the link expired, you can request a new one.
          </div>
        </div>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated!"
        subtitle="Redirecting you to sign in…"
        footer={<>Or <Link to="/login" style={{ color: 'var(--primary)' }} className="font-medium">go now</Link></>}
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.15)' }}>
            <span className="text-3xl">✓</span>
          </div>
          <div className="text-sm text-white font-medium">All set</div>
          <div className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            Use your new password to sign in.
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Make it strong — at least 8 characters."
      footer={<>Changed your mind? <Link to="/login" style={{ color: 'var(--primary)' }} className="font-medium">Back to login</Link></>}
    >
      <form onSubmit={submit}>
        <Field label="New password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters" required autoFocus />
        {password.length > 0 && <PasswordStrength password={password} />}

        <Field label="Confirm new password" type="password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type it again" required />

        {error && (
          <div className="mb-3 p-3 rounded-lg text-sm text-red-300"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full py-3.5 rounded-xl font-semibold glow-gold hover:opacity-90 transition disabled:opacity-50"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          {submitting ? 'Saving…' : 'Reset Password'}
        </button>
      </form>
    </AuthShell>
  )
}
