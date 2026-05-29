// CoinTap Logo — premium squircle icon with stacked coins.
// Used in headers, auth shells, and the favicon (favicon.svg uses the same paths).

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
      style={{ display: 'block' }}
      aria-label="CoinTap logo"
    >
      <defs>
        {/* Orange gradient — light top-left to deep bottom-right */}
        <linearGradient id="ctTile" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="45%" stopColor="#f7931a" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>

        {/* Glossy highlight overlay */}
        <linearGradient id="ctGloss" x1="0%" y1="0%" x2="0%" y2="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Coin face gradient (dark) */}
        <radialGradient id="ctCoin" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#2a3142" />
          <stop offset="100%" stopColor="#0a0e1a" />
        </radialGradient>

        {/* Soft inner glow */}
        <filter id="ctGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Squircle tile background */}
      <rect x="4" y="4" width="92" height="92" rx="24" ry="24" fill="url(#ctTile)" />

      {/* Glossy top highlight */}
      <rect x="4" y="4" width="92" height="92" rx="24" ry="24" fill="url(#ctGloss)" />

      {/* Subtle inner border */}
      <rect x="4.5" y="4.5" width="91" height="91" rx="23.5" ry="23.5"
        fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

      {/* === STACKED COINS === */}
      {/* Bottom coin (left, behind) */}
      <g filter="url(#ctGlow)">
        <circle cx="38" cy="58" r="20" fill="url(#ctCoin)" />
        <circle cx="38" cy="58" r="20" fill="none" stroke="rgba(247,147,26,0.4)" strokeWidth="1.5" />
        {/* Inner ring */}
        <circle cx="38" cy="58" r="15" fill="none" stroke="rgba(247,147,26,0.25)" strokeWidth="0.8" strokeDasharray="2 2" />
      </g>

      {/* Top coin (right, in front) with "1" */}
      <g filter="url(#ctGlow)">
        <circle cx="62" cy="42" r="22" fill="url(#ctCoin)" />
        <circle cx="62" cy="42" r="22" fill="none" stroke="rgba(255,200,80,0.7)" strokeWidth="1.8" />
        {/* Inner highlight */}
        <circle cx="62" cy="42" r="17" fill="none" stroke="rgba(247,147,26,0.35)" strokeWidth="0.8" />
        {/* "1" numeral */}
        <text
          x="62" y="50"
          textAnchor="middle"
          fontFamily="'Space Grotesk', system-ui, sans-serif"
          fontSize="22"
          fontWeight="700"
          fill="#fbbf24"
        >
          1
        </text>
      </g>
    </svg>
  )
}

export function Logo({ size = 40, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {withText && (
        <div className="leading-none">
          <div className="font-display font-bold text-xl tracking-tight text-white">CoinTap</div>
          <div className="text-[10px] tracking-widest uppercase mt-0.5"
            style={{ color: 'var(--muted-foreground)' }}>
            cointap.online
          </div>
        </div>
      )}
    </div>
  )
}
