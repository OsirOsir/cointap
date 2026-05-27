export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center rounded-full animate-pulse-glow flex-shrink-0"
        style={{ width: size, height: size, background: 'var(--gradient-gold)' }}
      >
        <div className="absolute inset-[3px] rounded-full flex items-center justify-center" style={{ background: 'var(--background)' }}>
          <span className="font-display font-bold text-gradient-gold" style={{ fontSize: size * 0.38 }}>
            CT
          </span>
        </div>
      </div>
      {withText && (
        <div className="leading-none">
          <div className="font-display font-bold text-lg tracking-tight text-white">CoinTap</div>
          <div className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--muted-foreground)' }}>cointap.trade</div>
        </div>
      )}
    </div>
  )
}
