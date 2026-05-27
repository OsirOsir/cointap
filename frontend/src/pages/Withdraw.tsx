import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'
import { formatKsh, store, useStore } from '@/lib/cointap-store'

export function Withdraw() {
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const wallet = useStore((s) => s.wallet)
  const wds = useStore((s) => s.withdrawals)
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState(user?.phone || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!user) { navigate('/login'); return null }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    const res = store.requestWithdrawal(parseFloat(amount), phone)
    if (!res.ok) { setError(res.error!); return }
    setSuccess('Withdrawal requested — pending admin approval')
    setAmount('')
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm mb-4 hover:text-white transition-colors"
        style={{ color: 'var(--muted-foreground)' }}>
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white">Withdraw to M-Pesa</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Funds will be sent to your M-Pesa after admin approval.
        </p>

        <div className="mt-5 rounded-xl p-4 flex justify-between items-center"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Available Balance</span>
          <span className="text-xl font-bold font-mono text-gradient-gold">{formatKsh(wallet.balance)}</span>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Amount (Ksh)</label>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError('') }}
              min={200} placeholder="Min Ksh 200"
              className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono text-lg"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>M-Pesa Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-xl text-white"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          {error && (
            <div className="p-3 rounded-xl text-sm text-red-400"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl text-sm text-green-400"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
              {success}
            </div>
          )}
          <button className="w-full py-3.5 rounded-xl font-semibold glow-gold hover:opacity-90"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            Request Withdrawal
          </button>
        </form>

        <div className="mt-4 flex items-start gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
          All withdrawals are reviewed before payout via M-Pesa Daraja B2C.
        </div>
      </div>

      {/* Withdrawal history */}
      <div className="glass rounded-2xl p-5 mt-5">
        <h3 className="font-semibold mb-3 text-white">Recent Withdrawals</h3>
        {wds.length === 0 ? (
          <div className="text-sm text-center py-6" style={{ color: 'var(--muted-foreground)' }}>No withdrawals yet</div>
        ) : (
          <div className="space-y-2">
            {wds.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div className="font-mono text-sm text-white">{formatKsh(w.amount)}</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{w.phone}</div>
                  {w.mpesa_reference && (
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      Ref: {w.mpesa_reference}
                    </div>
                  )}
                </div>
                <span className="text-[10px] px-2 py-1 rounded uppercase font-bold"
                  style={
                    w.status === 'paid' ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' } :
                    w.status === 'rejected' ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } :
                    w.status === 'processing' ? { background: 'rgba(247,147,26,0.15)', color: 'var(--primary)' } :
                    { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }
                  }>{w.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
