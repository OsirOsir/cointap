/**
 * ReferralBadge — visual social-proof badge based on referral activity.
 *
 * Three render sizes:
 *  - "sm"  → tiny pill, used in admin user lists, inline mentions
 *  - "md"  → medium card, used on the Refer page next to stats
 *  - "lg"  → hero badge with progress bar, used on the Profile page
 *
 * Tiers (matches backend/app/models/referral_badge.py):
 *  Bronze 1 · Silver 5 · Gold 15 · Diamond 50 · Legend 100
 */
import { Award, TrendingUp } from 'lucide-react'

export type BadgeData = {
  signup_count: number
  invested_count: number
  tier: { key: string; label: string; color: string; threshold: number } | null
  next_tier: { key: string; label: string; threshold: number; remaining: number } | null
}

const TIER_GRADIENTS: Record<string, string> = {
  bronze:  'linear-gradient(135deg, #cd7f32 0%, #8b4513 100%)',
  silver:  'linear-gradient(135deg, #e5e5e5 0%, #8a8a8a 100%)',
  gold:    'linear-gradient(135deg, #ffd700 0%, #b8860b 100%)',
  diamond: 'linear-gradient(135deg, #b9f2ff 0%, #4a90e2 100%)',
  legend:  'linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)',
}

const TIER_EMOJI: Record<string, string> = {
  bronze:  '🥉',
  silver:  '🥈',
  gold:    '🥇',
  diamond: '💎',
  legend:  '👑',
}

export function ReferralBadge({ data, size = 'md' }: { data?: BadgeData | null; size?: 'sm' | 'md' | 'lg' }) {
  if (!data) return null

  // No tier yet — encourage them to start referring
  if (!data.tier) {
    if (size === 'sm') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted-foreground)' }}>
          No tier
        </span>
      )
    }
    return (
      <div className="rounded-2xl p-4 text-center"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
        <Award className="w-8 h-8 mx-auto" style={{ color: 'var(--muted-foreground)' }} />
        <div className="text-xs mt-2 font-semibold text-white">Earn your first badge</div>
        <div className="text-[11px] mt-1" style={{ color: 'var(--muted-foreground)' }}>
          Refer 1 friend to unlock <strong className="text-white">Bronze</strong>
        </div>
        {data.next_tier && (
          <div className="text-[10px] mt-2 font-mono" style={{ color: 'var(--primary)' }}>
            {data.signup_count}/{data.next_tier.threshold} signups
          </div>
        )}
      </div>
    )
  }

  const tier = data.tier
  const gradient = TIER_GRADIENTS[tier.key] || 'var(--gradient-gold)'
  const emoji = TIER_EMOJI[tier.key] || '🏅'

  // SMALL — inline pill (for admin tables)
  if (size === 'sm') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
        style={{ background: gradient, color: 'white' }}
        title={`${tier.label} tier — ${data.signup_count} signups, ${data.invested_count} invested`}>
        <span>{emoji}</span>
        <span>{data.signup_count}</span>
      </span>
    )
  }

  // MEDIUM — card with badge + counts side by side
  if (size === 'md') {
    return (
      <div className="rounded-2xl p-3 flex items-center gap-3"
        style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: gradient, boxShadow: `0 4px 14px ${tier.color}50` }}>
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white">{tier.label} Tier</div>
          <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
            {data.signup_count} signups · {data.invested_count} invested
          </div>
        </div>
        {data.next_tier && (
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--muted-foreground)' }}>
              Next
            </div>
            <div className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
              {data.next_tier.remaining} to {data.next_tier.label}
            </div>
          </div>
        )}
      </div>
    )
  }

  // LARGE — full hero card with progress bar
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.3)',
        border: `1px solid ${tier.color}40`,
      }}>
      {/* Subtle background glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: gradient }} />

      <div className="relative flex items-center gap-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl flex-shrink-0"
          style={{ background: gradient, boxShadow: `0 6px 20px ${tier.color}50` }}>
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider font-bold"
            style={{ color: tier.color }}>
            {tier.label} Tier
          </div>
          <div className="text-2xl font-bold text-white mt-0.5">{data.signup_count} Referrals</div>
          <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            <TrendingUp className="w-3 h-3 text-green-400" />
            {data.invested_count} have invested
          </div>
        </div>
      </div>

      {data.next_tier && (
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span style={{ color: 'var(--muted-foreground)' }}>
              Next: <strong className="text-white">{data.next_tier.label}</strong>
            </span>
            <span className="font-mono" style={{ color: 'var(--primary)' }}>
              {data.signup_count}/{data.next_tier.threshold}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (data.signup_count / data.next_tier.threshold) * 100)}%`,
                background: 'var(--gradient-gold)',
              }} />
          </div>
          <div className="text-[10px] mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
            <strong className="text-white">{data.next_tier.remaining}</strong> more to unlock {data.next_tier.label}
          </div>
        </div>
      )}

      {!data.next_tier && (
        <div className="relative mt-4 p-2 rounded-lg text-center"
          style={{
            background: 'rgba(168,85,247,0.1)',
            border: '1px solid rgba(168,85,247,0.3)',
            color: '#a855f7',
          }}>
          <div className="text-[10px] uppercase tracking-wider font-bold">Top tier achieved 👑</div>
          <div className="text-[11px] mt-0.5">You're a CoinTap Legend</div>
        </div>
      )}
    </div>
  )
}
