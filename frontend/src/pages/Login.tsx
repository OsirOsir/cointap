import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell, Field } from '@/components/cointap/AuthShell'
import { store } from '@/lib/cointap-store'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    const isAdmin = email.toLowerCase().includes('admin')
    store.login(email, isAdmin)
    navigate(isAdmin ? '/admin' : '/dashboard')
  }

  return (
    <AuthShell
      title="Welcome Back to CoinTap"
      subtitle="Access your wallet, track active investments, and manage withdrawals securely."
      footer={<>New to CoinTap? <Link to="/register" style={{ color: 'var(--primary)' }} className="font-medium">Create account</Link></>}
    >
      <form onSubmit={submit}>
        <Field label="Email or phone" type="text" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@cointap.trade" required />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••" required />
        <div className="flex justify-end -mt-1 mb-4">
          <Link to="/forgot-password" className="text-xs hover:text-white transition-colors" style={{ color: 'var(--muted-foreground)' }}>
            Forgot password?
          </Link>
        </div>
        <button type="submit"
          className="w-full py-3.5 rounded-xl font-semibold glow-gold hover:opacity-90 transition"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          Login to Dashboard
        </button>
      </form>
      <div className="mt-4 p-3 rounded-xl text-xs text-center" style={{ background: 'rgba(247,147,26,0.05)', border: '1px solid rgba(247,147,26,0.1)', color: 'var(--muted-foreground)' }}>
        Demo: use any email + password. Use <code className="text-xs" style={{ color: 'var(--primary)' }}>admin@cointap.trade</code> for admin access.
      </div>
    </AuthShell>
  )
}
