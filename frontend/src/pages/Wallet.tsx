import { useEffect, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, X, Smartphone, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { formatKsh, store, useStore, type WalletTx } from '@/lib/cointap-store'
import { UsdtBadge } from '@/lib/usdt'
import { http } from '@/lib/api'

const typeLabel: Record<WalletTx['type'], string> = {
  deposit: 'Deposit',
  share_purchase: 'Share Purchase',
  maturity_return: 'Maturity Return',
  referral_bonus: 'Referral Bonus',
  withdrawal: 'Withdrawal',
  withdrawal_reversal: 'Withdrawal Reversal',
  admin_adjustment: 'Admin Adjustment',
}

/**
 * STK push flow states:
 *   idle      → user is filling in the form
 *   sending   → API call to /deposit/initiate is in flight
 *   waiting   → STK push sent, polling for confirmation (up to ~90s)
 *   success   → confirmed; wallet credited
 *   failed    → user cancelled, timeout, wrong PIN, etc.
 */
type DepositPhase = 'idle' | 'sending' | 'waiting' | 'success' | 'failed'

// Poll every 3 seconds, up to ~95 seconds total. After that we stop polling
// and tell the user we'll keep checking in the background (the scheduler
// reconciliation job will catch up if needed).
const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 32   // 32 × 3s ≈ 95 s

export function Wallet() {
  const wallet = useStore((s) => s.wallet)
  const txs = useStore((s) => s.transactions)
  const user = useStore((s) => s.user)
  const [showDeposit, setShowDeposit] = useState(false)
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState(user?.phone || '')
  const [toast, setToast] = useState('')

  // STK push state machine
  const [phase, setPhase] = useState<DepositPhase>('idle')
  const [logId, setLogId] = useState<number | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [confirmedAmount, setConfirmedAmount] = useState<number>(0)
  const [confirmedReceipt, setConfirmedReceipt] = useState<string>('')
  const pollAttempts = useRef(0)

  // Polling effect — kicks in when phase becomes 'waiting'
  useEffect(() => {
    if (phase !== 'waiting' || !logId) return
    let cancelled = false
    pollAttempts.current = 0

    async function poll() {
      if (cancelled) return
      pollAttempts.current += 1
      try {
        const res = await http.get<{
          ok: boolean
          status: 'pending' | 'success' | 'failed' | 'expired'
          amount: number
          receipt: string | null
          message: string
        }>(`/wallet/deposit/status/${logId}`)
        if (cancelled) return

        if (res.status === 'success') {
          setConfirmedAmount(res.amount)
          setConfirmedReceipt(res.receipt || '')
          setStatusMessage(res.message)
          setPhase('success')
          // Refresh wallet balance + transactions so they show the credit
          store.apiLoadWallet()
          return
        }
        if (res.status === 'failed' || res.status === 'expired') {
          setStatusMessage(res.message)
          setPhase('failed')
          return
        }
        // still pending — keep polling unless we've exhausted attempts
        if (pollAttempts.current >= POLL_MAX_ATTEMPTS) {
          setStatusMessage(
            "We haven't heard from M-Pesa yet. Your wallet will update automatically if the payment goes through.",
          )
          setPhase('failed')
          return
        }
        setTimeout(poll, POLL_INTERVAL_MS)
      } catch {
        // Treat network errors during polling as recoverable; just retry
        if (!cancelled && pollAttempts.current < POLL_MAX_ATTEMPTS) {
          setTimeout(poll, POLL_INTERVAL_MS)
        }
      }
    }
    // Wait a beat before first poll — STK push usually takes 2-3s to ring the phone
    const timer = setTimeout(poll, 2000)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [phase, logId])

  async function deposit(e: React.FormEvent) {
    e.preventDefault()
    const a = parseFloat(amount)
    if (!a || a < 10) { setToast('Minimum deposit is Ksh 10'); return }
    if (!phone.trim()) { setToast('Enter your M-Pesa phone number'); return }

    setPhase('sending')
    const res = await store.apiInitiateDeposit(a, phone.trim())

    if (!res.ok) {
      setStatusMessage(res.error || 'Could not start deposit. Please try again.')
      setPhase('failed')
      return
    }

    // res.log_id should be on the response now from the updated backend
    const id = (res as any).log_id || (res as any).checkout_request_id
    if (typeof id === 'number') {
      setLogId(id)
    }
    setStatusMessage('Check your phone — enter your M-Pesa PIN to complete the deposit.')
    setPhase('waiting')
  }

  function resetDeposit() {
    setPhase('idle')
    setLogId(null)
    setStatusMessage('')
    setConfirmedAmount(0)
    setConfirmedReceipt('')
    setAmount('')
    pollAttempts.current = 0
  }

  function closeModal() {
    // Don't allow closing while we're actively talking to M-Pesa
    if (phase === 'sending') return
    setShowDeposit(false)
    // If they reopen later, start fresh
    setTimeout(resetDeposit, 200)
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

        {/* Withdrawable vs locked breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3"
            style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}>
            <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#4ade80' }}>
              Withdrawable
            </div>
            <div className="font-mono font-bold text-base mt-1 text-green-400">{formatKsh(wallet.withdrawable_balance)}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>From matured plans</div>
          </div>
          <div className="rounded-xl p-3"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
            <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#fbbf24' }}>
              Investable
            </div>
            <div className="font-mono font-bold text-base mt-1" style={{ color: '#fbbf24' }}>
              {formatKsh(wallet.balance - wallet.withdrawable_balance)}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>From deposits + bonuses</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => { resetDeposit(); setShowDeposit(true) }}
            className="py-3 rounded-xl font-semibold glow-gold hover:opacity-90"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            Deposit
          </button>
          <a href="/withdraw"
            className="py-3 rounded-xl font-semibold text-center"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.08)' }}>
            Withdraw
          </a>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Deposited</div>
            <div className="font-mono font-semibold text-sm mt-1 text-white">{formatKsh(wallet.total_deposited)}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Withdrawn</div>
            <div className="font-mono font-semibold text-sm mt-1 text-white">{formatKsh(wallet.total_withdrawn)}</div>
          </div>
        </div>
      </div>

      {/* Deposit modal */}
      {showDeposit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={closeModal}>
          <div className="glass rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>

            {/* ── PHASE: idle / sending — the form ────────────────── */}
            {(phase === 'idle' || phase === 'sending') && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Deposit via M-Pesa</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      You'll receive an STK push on your phone.
                    </p>
                  </div>
                  <button onClick={closeModal} disabled={phase === 'sending'}
                    className="p-1.5 rounded-lg disabled:opacity-30"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={deposit} className="space-y-3">
                  <div>
                    <label className="text-xs tracking-wider uppercase" style={{ color: 'var(--muted-foreground)' }}>Amount (Ksh)</label>
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min={10} max={150000}
                      placeholder="e.g. 500"
                      disabled={phase === 'sending'}
                      className="mt-1 w-full px-4 py-3 rounded-xl text-white font-mono text-lg disabled:opacity-50"
                      style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <label className="text-xs tracking-wider uppercase" style={{ color: 'var(--muted-foreground)' }}>M-Pesa Phone</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel"
                      placeholder="07XX XXX XXX"
                      disabled={phase === 'sending'}
                      className="mt-1 w-full px-4 py-3 rounded-xl text-white disabled:opacity-50"
                      style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <button disabled={phase === 'sending'}
                    className="w-full py-3 rounded-xl font-semibold glow-gold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                    {phase === 'sending' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending request…</>
                    ) : (
                      'Send STK Push'
                    )}
                  </button>
                  <p className="text-[11px] text-center mt-2" style={{ color: 'var(--muted-foreground)' }}>
                    Standard M-Pesa fees apply on your end.
                  </p>
                </form>
              </>
            )}

            {/* ── PHASE: waiting for callback ─────────────────────── */}
            {phase === 'waiting' && (
              <div className="text-center py-2">
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center relative"
                    style={{ background: 'rgba(247,147,26,0.1)', border: '2px solid rgba(247,147,26,0.3)' }}>
                    <Smartphone className="w-9 h-9" style={{ color: 'var(--primary)' }} />
                    {/* Animated pulse ring */}
                    <span className="absolute inset-0 rounded-full animate-ping"
                      style={{ border: '2px solid rgba(247,147,26,0.5)' }} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Check your phone</h3>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {statusMessage || 'Enter your M-Pesa PIN to confirm the deposit.'}
                </p>
                <div className="mt-6 inline-flex items-center gap-2 text-xs"
                  style={{ color: 'var(--muted-foreground)' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Waiting for confirmation…
                </div>
                <div className="mt-6 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                  This usually takes 10–30 seconds. You can close this window — your wallet will update automatically.
                </div>
                <button onClick={closeModal}
                  className="mt-5 text-xs underline" style={{ color: 'var(--muted-foreground)' }}>
                  Close
                </button>
              </div>
            )}

            {/* ── PHASE: success ──────────────────────────────────── */}
            {phase === 'success' && (
              <div className="text-center py-2">
                <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
                  style={{ background: 'rgba(74,222,128,0.15)', border: '2px solid rgba(74,222,128,0.4)' }}>
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Deposit confirmed!</h3>
                <p className="text-3xl font-mono font-bold text-gradient-gold mb-2">
                  +Ksh {confirmedAmount.toLocaleString()}
                </p>
                {confirmedReceipt && (
                  <p className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    Receipt: {confirmedReceipt}
                  </p>
                )}
                <p className="text-sm mt-4" style={{ color: 'var(--muted-foreground)' }}>
                  Your wallet has been credited. You can invest now.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button onClick={closeModal}
                    className="py-2.5 rounded-xl font-semibold"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Close
                  </button>
                  <a href="/plans"
                    className="py-2.5 rounded-xl font-semibold text-center"
                    style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                    Invest now
                  </a>
                </div>
              </div>
            )}

            {/* ── PHASE: failed ───────────────────────────────────── */}
            {phase === 'failed' && (
              <div className="text-center py-2">
                <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)' }}>
                  <AlertTriangle className="w-9 h-9 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Deposit didn't complete</h3>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {statusMessage}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button onClick={closeModal}
                    className="py-2.5 rounded-xl font-semibold"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Close
                  </button>
                  <button onClick={resetDeposit}
                    className="py-2.5 rounded-xl font-semibold glow-gold"
                    style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
                    Try again
                  </button>
                </div>
              </div>
            )}
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
