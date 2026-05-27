import { Copy, Users, Gift } from 'lucide-react'
import { formatKsh, useStore } from '@/lib/cointap-store'
import { useState } from 'react'

export function Referrals() {
  const user = useStore((s) => s.user)
  const earnings = useStore((s) => s.referral_earnings)
  const count = useStore((s) => s.referrals_count)
  const referrals = useStore((s) => s.referrals)
  const [copied, setCopied] = useState(false)
  const link = `https://cointap.trade/register?ref=${user?.referral_code || ''}`

  function copy() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Refer & Earn</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Earn bonuses on every referral's first purchase
        </p>
      </div>

      {/* Referral code card */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <Gift className="absolute top-4 right-4 w-20 h-20" style={{ color: 'rgba(247,147,26,0.08)' }} />
        <div className="relative">
          <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Your referral code</div>
          <div className="text-3xl font-bold text-gradient-gold font-mono mt-1">{user?.referral_code}</div>
          <div className="mt-4 flex gap-2">
            <input readOnly value={link}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-mono text-white"
              style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <button onClick={copy}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
              style={{ background: copied ? 'rgba(74,222,128,0.2)' : 'var(--gradient-gold)', color: copied ? '#4ade80' : 'var(--primary-foreground)' }}>
              <Copy className="w-4 h-4" />{copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: 'rgba(247,147,26,0.06)', border: '1px solid rgba(247,147,26,0.12)', color: 'var(--muted-foreground)' }}>
            Share your link. When your referee makes their first share purchase, you earn a referral bonus automatically credited to your wallet.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4">
          <Users className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <div className="text-xs uppercase tracking-wider mt-3" style={{ color: 'var(--muted-foreground)' }}>Total Referrals</div>
          <div className="text-2xl font-bold font-mono mt-1 text-white">{count}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <Gift className="w-5 h-5 text-green-400" />
          <div className="text-xs uppercase tracking-wider mt-3" style={{ color: 'var(--muted-foreground)' }}>Earnings</div>
          <div className="text-2xl font-bold text-green-400 font-mono mt-1">{formatKsh(earnings)}</div>
        </div>
      </div>

      {/* Referral history */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold mb-3 text-white">Referral History</h3>
        {referrals.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            No referrals yet — share your link to start earning
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div className="text-sm font-medium text-white">{r.referred_name}</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-green-400">+{formatKsh(r.bonus_amount)}</div>
                  <div className="text-[10px] uppercase"
                    style={{ color: r.status === 'credited' ? '#4ade80' : 'var(--warning)' }}>
                    {r.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
