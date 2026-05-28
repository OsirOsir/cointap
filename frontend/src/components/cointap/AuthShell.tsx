import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { NodeBackground } from './NodeBackground'
import { Shield, Wallet, Clock, TrendingUp, ArrowLeft } from 'lucide-react'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden">
      <NodeBackground />

      {/* Back to home button — top-left, always visible */}
      <Link to="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold glass hover:scale-105 active:scale-95 transition-all"
        style={{ color: 'var(--foreground)' }}>
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Back to Home</span>
        <span className="sm:hidden">Home</span>
      </Link>

      {/* Form side */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 pt-20 sm:pt-24">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6 lg:hidden">
            <Link to="/"><Logo /></Link>
          </div>
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="hidden lg:flex justify-start mb-6">
              <Link to="/"><Logo /></Link>
            </div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-sm mt-1.5" style={{ color: 'var(--muted-foreground)' }}>{subtitle}</p>
            <div className="mt-6">{children}</div>
            {footer && (
              <div className="mt-5 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
                {footer}
              </div>
            )}
          </div>
          <div className="mt-4 text-center text-[11px] tracking-wider uppercase" style={{ color: 'var(--muted-foreground)' }}>
            Secure wallet · M-Pesa enabled · Encrypted access
          </div>
        </div>
      </div>

      {/* Visual side */}
      <div className="relative hidden lg:flex flex-1 items-center justify-center p-10"
        style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-md w-full space-y-4">
          <div className="glass rounded-2xl p-6 relative overflow-hidden">
            <NodeBackground />
            <div className="relative">
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Wallet Balance</div>
              <div className="text-3xl font-bold text-gradient-gold font-mono mt-1">Ksh 48,230</div>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="px-2 py-1 rounded" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>+12.4%</span>
                <span style={{ color: 'var(--muted-foreground)' }}>last 30 days</span>
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Active Investment</div>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(247,147,26,0.15)', color: 'var(--primary)' }}>GROWTH</span>
            </div>
            <div className="text-xl font-bold text-white font-mono">Ksh 10,000 → <span className="text-green-400">16,500</span></div>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div className="h-full rounded-full" style={{ width: '65%', background: 'var(--gradient-gold)' }} />
            </div>
            <div className="mt-2 font-mono text-xs" style={{ color: 'var(--primary)' }}>03 : 12 : 44 : 21</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { i: Shield, l: 'Secure' },
              { i: Wallet, l: 'M-Pesa' },
              { i: Clock, l: 'Live' },
            ].map((b, i) => (
              <div key={i} className="glass rounded-xl p-3 text-center">
                <b.i className="w-4 h-4 mx-auto" style={{ color: 'var(--primary)' }} />
                <div className="text-[10px] mt-1 tracking-wider uppercase" style={{ color: 'var(--muted-foreground)' }}>{b.l}</div>
              </div>
            ))}
          </div>
          <div className="text-sm text-center pt-2 flex items-center justify-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
            <TrendingUp className="w-4 h-4 text-green-400" />
            Your investment dashboard starts here.
          </div>
        </div>
      </div>
    </div>
  )
}

export function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block mb-3">
      <span className="text-xs tracking-wider uppercase" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <input
        {...props}
        className="mt-1.5 w-full px-4 py-3 rounded-xl text-white placeholder-opacity-60"
        style={{
          background: 'rgba(30,37,53,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: '0.9rem',
        }}
      />
    </label>
  )
}
