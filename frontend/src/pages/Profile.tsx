import { useState } from 'react'
import { User as UserIcon, Mail, Phone, Lock, Check, Copy, Shield, AlertCircle, Save, Smartphone, ShieldCheck, ShieldOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { store, useStore } from '@/lib/cointap-store'
import { PasswordStrength, getPasswordStrength, TwoFactorInput } from '@/components/cointap/Security'

export function Profile() {
  const user = useStore((s) => s.user)
  if (!user) return null

  return (
    <div className="space-y-6 pb-10 max-w-3xl mx-auto">
      {/* HEADER */}
      <div className="glass rounded-3xl p-6 sm:p-8 relative overflow-hidden animate-slide-up">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-gold opacity-10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold glow-gold"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            {user.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              Account Settings
            </div>
            <h1 className="text-3xl font-bold text-white mt-1 truncate">{user.full_name}</h1>
            <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>{user.email}</p>
            {user.role === 'admin' && (
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(247,147,26,0.2)', color: 'var(--primary)' }}>
                <Shield className="w-3 h-3" /> ADMINISTRATOR
              </span>
            )}
          </div>
        </div>
      </div>

      <PersonalInfoSection />
      <EmailVerificationSection />
      <TwoFactorSection />
      <SecuritySection />
      <ReferralSection />
    </div>
  )
}

// ─── EMAIL VERIFICATION STATUS ───────────────────────────────
function EmailVerificationSection() {
  const user = useStore((s) => s.user)!
  const navigate = useNavigate()
  const verified = user.email_verified

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      <h3 className="font-bold text-white flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        Email Verification
      </h3>

      <div className="flex items-center justify-between gap-3 flex-wrap p-4 rounded-xl"
        style={{
          background: verified ? 'rgba(74,222,128,0.08)' : 'rgba(251,191,36,0.08)',
          border: '1px solid ' + (verified ? 'rgba(74,222,128,0.25)' : 'rgba(251,191,36,0.3)'),
        }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{
              background: verified ? 'rgba(74,222,128,0.2)' : 'rgba(251,191,36,0.2)',
              color: verified ? '#4ade80' : '#fbbf24',
            }}>
            {verified ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm">
              {verified ? 'Email verified' : 'Email not verified'}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
              {user.email}
            </div>
          </div>
        </div>
        {!verified && (
          <button onClick={() => navigate('/verify-email')}
            className="px-4 py-2 rounded-lg text-xs font-bold flex-shrink-0"
            style={{ background: '#fbbf24', color: '#0a0e1a' }}>
            Verify Now
          </button>
        )}
      </div>
    </div>
  )
}

// ─── TWO-FACTOR AUTHENTICATION ───────────────────────────────
function TwoFactorSection() {
  const user = useStore((s) => s.user)!
  const [step, setStep] = useState<'overview' | 'setup' | 'verify' | 'disable'>('overview')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  function confirmEnable(value: string) {
    setError('')
    const res = store.verify2FA(value)
    if (!res.ok) { setError(res.error || 'Invalid code'); setCode(''); return }
    store.enable2FA()
    setStep('overview')
    setCode('')
  }

  function confirmDisable(value: string) {
    setError('')
    const res = store.verify2FA(value)
    if (!res.ok) { setError(res.error || 'Invalid code'); setCode(''); return }
    store.disable2FA()
    setStep('overview')
    setCode('')
  }

  // Build a fake "secret" for the QR-style display in setup mode
  const secret = user.two_factor_secret || 'JBSWY3DPEHPK3PXP'
  const otpauthUrl = `otpauth://totp/CoinTap:${user.email}?secret=${secret}&issuer=CoinTap`

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          Two-Factor Authentication
        </h3>
        {user.two_factor_enabled && (
          <span className="text-[10px] px-2 py-1 rounded-full font-bold"
            style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
            ENABLED
          </span>
        )}
      </div>

      {step === 'overview' && (
        <>
          <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Add an extra layer of security. You'll be required to enter a 6-digit code from an
            authenticator app (Google Authenticator, Authy, 1Password) when signing in or making withdrawals over Ksh 5,000.
          </p>

          <div className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5" style={{ color: user.two_factor_enabled ? '#4ade80' : 'var(--muted-foreground)' }} />
              <div>
                <div className="text-sm font-semibold text-white">Authenticator App</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {user.two_factor_enabled ? 'Currently protecting your account' : 'Not configured'}
                </div>
              </div>
            </div>
            {user.two_factor_enabled ? (
              <button onClick={() => setStep('disable')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                Disable
              </button>
            ) : (
              <button onClick={() => setStep('setup')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold glow-gold"
                style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                Enable 2FA
              </button>
            )}
          </div>
        </>
      )}

      {step === 'setup' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl" style={{ background: 'rgba(247,147,26,0.05)', border: '1px solid rgba(247,147,26,0.15)' }}>
            <div className="text-xs font-bold text-white mb-2">Step 1: Add to your authenticator app</div>
            <div className="rounded-lg p-3 font-mono text-sm break-all"
              style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--primary)' }}>
              {secret}
            </div>
            <button onClick={() => navigator.clipboard?.writeText(secret)}
              className="mt-2 text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--primary)' }}>
              <Copy className="w-3 h-3" /> Copy secret
            </button>
            <p className="text-[11px] mt-2" style={{ color: 'var(--muted-foreground)' }}>
              In production, this would also display as a scannable QR code.
            </p>
          </div>

          <div>
            <div className="text-xs font-bold text-white mb-2">Step 2: Enter the 6-digit code from your app</div>
            <TwoFactorInput value={code} onChange={setCode} onComplete={confirmEnable} autoFocus />
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setStep('overview'); setCode(''); setError('') }}
              className="px-4 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
              Cancel
            </button>
            <button onClick={() => confirmEnable(code)} disabled={code.length !== 6}
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              Verify & Enable
            </button>
          </div>

          <p className="text-[11px] text-center" style={{ color: 'var(--muted-foreground)' }}>
            Demo: use code <code style={{ color: 'var(--primary)' }}>123456</code>
          </p>
        </div>
      )}

      {step === 'disable' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <ShieldOff className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
            <div>
              <div className="font-bold text-red-400 text-sm">Disable 2FA?</div>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Your account will be less secure. Enter your current 2FA code to confirm.
              </p>
            </div>
          </div>

          <TwoFactorInput value={code} onChange={setCode} onComplete={confirmDisable} autoFocus />

          {error && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setStep('overview'); setCode(''); setError('') }}
              className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
              Cancel
            </button>
            <button onClick={() => confirmDisable(code)} disabled={code.length !== 6}
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: '#ef4444', color: 'white' }}>
              Confirm Disable
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PERSONAL INFO ───────────────────────────────────────────
function PersonalInfoSection() {
  const user = useStore((s) => s.user)!
  const [form, setForm] = useState({
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
  })
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [editing, setEditing] = useState(false)

  const dirty =
    form.full_name !== user.full_name ||
    form.email !== user.email ||
    form.phone !== user.phone

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)

    if (!form.full_name.trim()) {
      setStatus({ type: 'error', message: 'Name is required' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setStatus({ type: 'error', message: 'Invalid email address' })
      return
    }
    if (!/^\+?\d{9,15}$/.test(form.phone.replace(/\s/g, ''))) {
      setStatus({ type: 'error', message: 'Invalid phone number' })
      return
    }

    store.updateProfile({
      full_name: form.full_name.trim(),
      email: form.email.toLowerCase().trim(),
      phone: form.phone.trim(),
    })
    setEditing(false)
    setStatus({ type: 'success', message: 'Profile updated successfully' })
    setTimeout(() => setStatus(null), 3000)
  }

  function cancel() {
    setForm({ full_name: user.full_name, email: user.email, phone: user.phone })
    setEditing(false)
    setStatus(null)
  }

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            Personal Information
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Update your profile details
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)', border: '1px solid rgba(247,147,26,0.3)' }}>
            Edit
          </button>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field icon={UserIcon} label="Full Name" value={form.full_name}
          onChange={(v) => setForm({ ...form, full_name: v })}
          disabled={!editing} placeholder="John Doe" />

        <Field icon={Mail} label="Email Address" value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          disabled={!editing} placeholder="you@example.com" type="email" />

        <Field icon={Phone} label="Phone Number" value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
          disabled={!editing} placeholder="+254712345678" type="tel"
          helper="Used for M-Pesa deposits and withdrawals" />

        {status && (
          <div className="p-3 rounded-xl text-sm flex items-center gap-2"
            style={{
              background: status.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
              border: '1px solid ' + (status.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'),
              color: status.type === 'success' ? '#4ade80' : '#ef4444',
            }}>
            {status.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {status.message}
          </div>
        )}

        {editing && (
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={!dirty}
              className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 glow-gold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              <Save className="w-4 h-4" /> Save Changes
            </button>
            <button type="button" onClick={cancel}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

// ─── SECURITY ────────────────────────────────────────────────
function SecuritySection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (!current) {
      setStatus({ type: 'error', message: 'Enter your current password' })
      return
    }
    if (next !== confirm) {
      setStatus({ type: 'error', message: 'New passwords do not match' })
      return
    }
    const { score, label } = getPasswordStrength(next)
    if (score < 3) {
      setStatus({ type: 'error', message: `Password is "${label}". Please choose a stronger one.` })
      return
    }
    const res = store.changePassword(current, next)
    if (!res.ok) {
      setStatus({ type: 'error', message: res.error || 'Could not update password' })
      return
    }
    setStatus({ type: 'success', message: 'Password updated successfully' })
    setCurrent(''); setNext(''); setConfirm('')
    setTimeout(() => setStatus(null), 3000)
  }

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      <div className="mb-5">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Lock className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          Security
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          Change your password to keep your account secure
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field icon={Lock} label="Current Password" value={current}
          onChange={setCurrent} type="password" placeholder="••••••••" />

        <Field icon={Lock} label="New Password" value={next}
          onChange={setNext} type="password" placeholder="At least 8 characters"
          helper="Use letters, numbers, and symbols for strength" />

        {next && (
          <div className="-mt-2">
            <PasswordStrength password={next} />
          </div>
        )}

        <Field icon={Lock} label="Confirm New Password" value={confirm}
          onChange={setConfirm} type="password" placeholder="Repeat new password" />

        {status && (
          <div className="p-3 rounded-xl text-sm flex items-center gap-2"
            style={{
              background: status.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
              border: '1px solid ' + (status.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'),
              color: status.type === 'success' ? '#4ade80' : '#ef4444',
            }}>
            {status.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {status.message}
          </div>
        )}

        <button type="submit"
          className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          style={{ background: 'rgba(247,147,26,0.15)', color: 'var(--primary)', border: '1px solid rgba(247,147,26,0.3)' }}>
          <Lock className="w-4 h-4" /> Update Password
        </button>
      </form>
    </div>
  )
}

// ─── REFERRAL CODE ───────────────────────────────────────────
function ReferralSection() {
  const user = useStore((s) => s.user)!
  const [copied, setCopied] = useState(false)
  const link = `https://cointap.trade/register?ref=${user.referral_code}`

  function copy() {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      <div className="mb-5">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          Your Referral Code
        </h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
          Share with friends and earn bonus on their investments
        </p>
      </div>

      <div className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.2)' }}>
        <div className="font-mono text-2xl font-bold text-gradient-gold">{user.referral_code}</div>
        <button onClick={copy}
          className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
          style={{ background: copied ? 'rgba(74,222,128,0.2)' : 'var(--gradient-gold)', color: copied ? '#4ade80' : 'var(--primary-foreground)' }}>
          {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Link</>}
        </button>
      </div>

      <div className="mt-3 text-xs font-mono break-all p-3 rounded-lg"
        style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--muted-foreground)' }}>
        {link}
      </div>
    </div>
  )
}

// ─── FIELD COMPONENT ─────────────────────────────────────────
function Field({
  icon: Icon, label, value, onChange, disabled, placeholder, type = 'text', helper,
}: {
  icon: any; label: string; value: string; onChange: (v: string) => void
  disabled?: boolean; placeholder?: string; type?: string; helper?: string
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider font-semibold block mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--muted-foreground)' }} />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          disabled={disabled} placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            background: disabled ? 'rgba(0,0,0,0.2)' : 'rgba(30,37,53,0.8)',
            border: '1px solid ' + (disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)'),
          }} />
      </div>
      {helper && (
        <div className="text-[10px] mt-1.5" style={{ color: 'var(--muted-foreground)' }}>{helper}</div>
      )}
    </div>
  )
}
