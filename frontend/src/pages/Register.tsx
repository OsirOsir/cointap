import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell, Field } from '@/components/cointap/AuthShell'
import { store } from '@/lib/cointap-store'

export function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [f, setF] = useState({
    full_name: '', email: '', phone: '', password: '', confirm: '',
    ref: searchParams.get('ref') || '',
  })
  const [error, setError] = useState('')
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (f.password !== f.confirm) { setError('Passwords do not match'); return }
    if (f.password.length < 6) { setError('Password must be at least 6 characters'); return }
    store.register({ full_name: f.full_name, email: f.email, phone: f.phone, promo_code: f.ref })
    navigate('/dashboard')
  }

  return (
    <AuthShell
      title="Create Your CoinTap Account"
      subtitle="Start your crypto investment journey with a secure wallet and live growth tracking."
      footer={<>Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }} className="font-medium">Login</Link></>}
    >
      <form onSubmit={submit}>
        <Field label="Full name" value={f.full_name} onChange={up('full_name')} required placeholder="John Doe" />
        <Field label="Email" type="email" value={f.email} onChange={up('email')} required placeholder="you@example.com" />
        <Field label="Phone number" type="tel" value={f.phone} onChange={up('phone')} placeholder="+254 7XX XXX XXX" required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" type="password" value={f.password} onChange={up('password')} required placeholder="••••••••" />
          <Field label="Confirm" type="password" value={f.confirm} onChange={up('confirm')} required placeholder="••••••••" />
        </div>
        <Field label="Referral code (optional)" value={f.ref} onChange={up('ref')} placeholder="CTXXXXX" />
        {error && (
          <div className="mb-3 p-3 rounded-xl text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}
        <button type="submit"
          className="w-full mt-2 py-3.5 rounded-xl font-semibold glow-gold hover:opacity-90 transition"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          Create Secure Wallet
        </button>
      </form>
    </AuthShell>
  )
}
