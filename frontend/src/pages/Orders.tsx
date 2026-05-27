import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Activity } from 'lucide-react'
import { formatKsh, useStore } from '@/lib/cointap-store'
import { Countdown } from '@/components/cointap/Countdown'

export function Orders() {
  const orders = useStore((s) => s.orders)
  const [tab, setTab] = useState<'active' | 'completed'>('active')
  const list = orders.filter((o) => tab === 'active' ? o.status === 'active' : o.status === 'settled')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Investments</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>Live countdowns and history</p>
      </div>

      <div className="flex gap-1 p-1 glass rounded-xl w-fit">
        {[
          { k: 'active', l: 'Active', I: Activity },
          { k: 'completed', l: 'Completed', I: CheckCircle2 },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className="px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition font-medium"
            style={tab === t.k
              ? { background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }
              : { color: 'var(--muted-foreground)' }}>
            <t.I className="w-4 h-4" /> {t.l}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
            No {tab} orders yet
          </div>
          {tab === 'active' && (
            <Link to="/plans"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              Browse Plans
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((o) => {
            const total = o.matures_at - o.starts_at
            const elapsed = Math.min(total, Date.now() - o.starts_at)
            const pct = Math.min(100, (elapsed / total) * 100)
            const profit = o.expected_return - o.amount_invested

            return (
              <div key={o.id} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{o.plan_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold"
                        style={o.status === 'active'
                          ? { background: 'rgba(247,147,26,0.15)', color: 'var(--primary)' }
                          : { background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                        {o.status}
                      </span>
                    </div>
                    <div className="text-xs font-mono mt-1" style={{ color: 'var(--muted-foreground)' }}>#{o.id}</div>
                  </div>
                  {o.status === 'active' ? (
                    <Countdown target={o.matures_at} />
                  ) : (
                    <div className="text-right">
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Profit</div>
                      <div className="text-green-400 font-mono font-semibold">+{formatKsh(profit)}</div>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div style={{ color: 'var(--muted-foreground)' }}>Invested</div>
                    <div className="font-mono font-semibold mt-1 text-white">{formatKsh(o.amount_invested)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted-foreground)' }}>Rate</div>
                    <div className="font-mono font-semibold mt-1 text-white">{o.profit_percent}%</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted-foreground)' }}>Return</div>
                    <div className="font-mono font-semibold mt-1 text-green-400">{formatKsh(o.expected_return)}</div>
                  </div>
                </div>
                {o.status === 'active' && (
                  <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--gradient-gold)' }} />
                  </div>
                )}
                {o.status === 'settled' && o.settled_at && (
                  <div className="mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    Settled {new Date(o.settled_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
