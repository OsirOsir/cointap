import { useEffect, useState } from 'react'
import { Copy, Users, Gift, Trophy, Sparkles } from 'lucide-react'
import { formatKsh, useStore } from '@/lib/cointap-store'
import { http } from '@/lib/api'
import { UsdtBadge } from '@/lib/usdt'
import { shareOrCopy } from '@/lib/share'

type Referral = {
  id: number | null
  referred_user_id: number
  referred_name?: string
  referred_email?: string
  bonus_amount: number
  status: string
  has_invested?: boolean
  created_at: string
}

type ApiResponse = {
  ok: boolean
  referrals: Referral[]
  referral_code: string
  total_referrals: number
  credited_referrals: number
  pending_referrals: number
  total_earned: number
  milestone: {
    threshold: number
    amount: number
    achieved: boolean
    achieved_at: string | null
    progress: number
    remaining: number
  }
}

export function Referrals() {
  const user = useStore((s) => s.user)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await http.get<ApiResponse>('/referrals/')
        if (!cancelled) setData(res)
      } catch { /* keep last value */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    const t = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  const link = `https://cointap.online/register?ref=${user?.referral_code || ''}`

  async function copy() {
    const ok = await shareOrCopy({
      text: link,
      title: 'Join me on CoinTap',
      shareText: `Sign up with my referral code: ${user?.referral_code}\n${link}`,
    })
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const credited = data?.credited_referrals ?? 0
  const total = data?.total_referrals ?? 0
  const earnings = data?.total_earned ?? 0
  const milestone = data?.milestone
  const milestoneEnabled = !!milestone && milestone.threshold > 0 && milestone.amount > 0
  const milestonePct = milestoneEnabled
    ? Math.min(100, (milestone!.progress / milestone!.threshold) * 100)
    : 0

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

      {/* Milestone progress */}
      {milestoneEnabled && (
        <div className="glass rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl"
            style={{ background: milestone!.achieved ? 'rgba(74,222,128,0.2)' : 'rgba(247,147,26,0.15)' }} />

          <div className="relative">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: milestone!.achieved ? 'rgba(74,222,128,0.15)' : 'rgba(247,147,26,0.12)',
                    color: milestone!.achieved ? '#4ade80' : 'var(--primary)',
                  }}>
                  {milestone!.achieved ? <Sparkles className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-bold text-white">Milestone Bonus</div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {milestone!.achieved
                      ? `Awarded ${milestone!.achieved_at ? new Date(milestone!.achieved_at).toLocaleDateString() : ''}`
                      : `Get ${formatKsh(milestone!.amount)} for ${milestone!.threshold} successful referrals`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gradient-gold font-mono">
                  {formatKsh(milestone!.amount)}
                </div>
                <UsdtBadge ksh={milestone!.amount} size="xs" variant="muted" />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--muted-foreground)' }}>
                  {milestone!.achieved ? 'Completed!' : `${milestone!.progress} of ${milestone!.threshold} credited referrals`}
                </span>
                <span className="font-mono font-bold text-white">{Math.round(milestonePct)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: milestonePct + '%',
                    background: milestone!.achieved
                      ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                      : 'linear-gradient(90deg, #fbbf24, #f7931a)',
                  }} />
              </div>
            </div>

            {!milestone!.achieved && milestone!.remaining > 0 && (
              <div className="mt-3 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
                You're <span className="text-white font-bold">{milestone!.remaining}</span> referral{milestone!.remaining !== 1 ? 's' : ''} away from your bonus 🎁
              </div>
            )}
            {milestone!.achieved && (
              <div className="mt-3 text-xs text-center text-green-400 font-semibold">
                🎉 You've earned the milestone bonus!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-4">
          <Users className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <div className="text-xs uppercase tracking-wider mt-3" style={{ color: 'var(--muted-foreground)' }}>Total Referrals</div>
          <div className="text-2xl font-bold font-mono mt-1 text-white">{total}</div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {credited} active · {total - credited} pending
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <Gift className="w-5 h-5 text-green-400" />
          <div className="text-xs uppercase tracking-wider mt-3" style={{ color: 'var(--muted-foreground)' }}>Earnings</div>
          <div className="text-2xl font-bold text-green-400 font-mono mt-1">{formatKsh(earnings)}</div>
          <UsdtBadge ksh={earnings} size="xs" variant="green" />
        </div>
      </div>

      {/* Referral history */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold mb-3 text-white">Referral History</h3>
        {loading && total === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Loading…
          </div>
        ) : !data?.referrals || data.referrals.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            No referrals yet — share your link to start earning
          </div>
        ) : (
          <div className="space-y-2">
            {data.referrals.map((r, idx) => {
              const invested = r.has_invested !== false && r.status === 'credited'
              const isSignupOnly = r.has_invested === false || r.status === 'signed_up'
              return (
                <div key={r.id ?? `signup-${r.referred_user_id}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {r.referred_name || `User #${r.referred_user_id}`}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    {invested ? (
                      <>
                        <div className="text-sm font-mono text-green-400">+{formatKsh(r.bonus_amount)}</div>
                        <div className="text-[10px] uppercase font-bold text-green-400">
                          credited
                        </div>
                      </>
                    ) : isSignupOnly ? (
                      <div className="text-[10px] uppercase font-bold tracking-wider"
                        style={{ color: 'var(--muted-foreground)' }}>
                        Signed up · awaiting first invest
                      </div>
                    ) : (
                      <div className="text-[10px] uppercase font-bold tracking-wider"
                        style={{ color: '#fbbf24' }}>
                        {r.status}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
