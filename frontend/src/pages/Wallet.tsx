import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react'
import { formatKsh, store, useStore, type WalletTx } from '@/lib/cointap-store'
import { UsdtBadge } from '@/lib/usdt'

const typeLabel: Record<WalletTx['type'], string> = {
  deposit: 'Deposit',
  share_purchase: 'Share Purchase',
  maturity_return: 'Maturity Return',
  referral_bonus: 'Referral Bonus',
  withdrawal: 'Withdrawal',
  withdrawal_reversal: 'Withdrawal Reversal',
  admin_adjustment: 'Admin Adjustment',
}

export function Wallet() {
  const wallet = useStore((s) => s.wallet)
  const txs = useStore((s) => s.transactions)
  const user = useStore((s) => s.user)
  const [showDeposit, setShowDeposit] = useState(false)
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState(user?.phone || '')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  async function deposit(e: React.FormEvent) {
    e.preventDefault()
    const a = parseFloat(amount)
    if (!a || a < 10) { setToast('Minimum deposit is Ksh 10'); return }
    if (!phone) { setToast('Enter your M-Pesa phone number'); return }
    setLoading(true)
    const res = await store.apiInitiateDeposit(a, phone)
    setLoading(false)
    if (!res.ok) {
      setToast(res.error || 'Deposit failed')
      setTimeout(() => setToast(''), 4000)
      return
    }
    setToast(res.message || 'M-Pesa prompt sent to your phone. Approve on your handset.')
    setShowDeposit(false)
    setAmount('')
    // Refresh wallet shortly after (callback credits asynchronously)
    setTimeout(() => store.apiLoadWallet(), 8000)
    setTimeout(() => setToast(''), 6000)
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white"
          style={{ background: 'rgba(247,147,26,0.9)', backdropFilter: 'blur(8px)' }}>
          {toast}
        </div>
      )}

      {/* Balance card */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Wallet Balance</div>
        <div className="text-4xl sm:text-5xl font-bold text-gradient-gold font-mono mt-1">{formatKsh(wallet.balance)}</div>
        <div className="mt-1.5">
          <UsdtBadge ksh={wallet.balance} size="sm" variant="gold" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Deposited</div>
            <div className="font-mono font-semibold text-sm mt-1 text-white">{formatKsh(wallet.total_deposited)}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Withdrawn</div>
            <div className="font-mono font-semibold text-sm mt-1 text-white">{formatKsh(wallet.total_withdrawn)}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Earned</div>
            <div className="font-mono font-semibold text-sm mt-1 text-green-400">{formatKsh(wallet.total_earned)}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button onClick={() => setShowDeposit(true)}
            className="py-3 rounded-xl font-semibold glow-gold hover:opacity-90"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            Deposit
          </button>
          <Link to="/withdraw" className="py-3 text-center rounded-xl glass font-semibold text-white hover:opacity-90">
            Withdraw
          </Link>
        </div>
      </div>

      {/* Deposit modal */}
      {showDeposit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => !loading && setShowDeposit(false)}>
          <div className="glass rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Deposit via M-Pesa</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>You'll receive an STK push on your phone.</p>
              </div>
              <button onClick={() => setShowDeposit(false)} className="p-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={deposit} className="space-y-3">
              <div>
                <label className="text-xs tracking-wider uppercase" style={{ color: 'var(--muted-foreground)' }}>Amount (Ksh)</label>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={10}
                  className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono text-lg"
                  style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className="text-xs tracking-wider uppercase" style={{ color: 'var(--muted-foreground)' }}>M-Pesa Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel"
                  className="mt-1 w-full px-4 py-3 rounded-xl text-white"
                  style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <button disabled={loading}
                className="w-full py-3 rounded-xl font-semibold glow-gold hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                {loading ? 'Processing...' : 'Send STK Push'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold mb-4 text-white">Transaction History</h3>
        {txs.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--muted-foreground)' }}>No transactions yet</div>
        ) : (
          <div className="space-y-2">
            {txs.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={t.direction === 'in'
                    ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80' }
                    : { background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  {t.direction === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{typeLabel[t.type]}</div>
                  <div className="text-xs truncate font-mono" style={{ color: 'var(--muted-foreground)' }}>{t.reference}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-semibold font-mono ${t.direction === 'in' ? 'text-green-400' : 'text-white'}`}>
                    {t.direction === 'in' ? '+' : '-'}{formatKsh(t.amount)}
                  </div>
                  <div className="text-[10px] uppercase mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{t.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
