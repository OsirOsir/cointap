export function NodeBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute inset-0 node-bg" />
      <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none">
        <defs>
          <radialGradient id="dotGlow">
            <stop offset="0%" stopColor="#f5a623" stopOpacity="1" />
            <stop offset="100%" stopColor="#f5a623" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 18 }).map((_, i) => {
          const x = (i * 73) % 100
          const y = (i * 41) % 100
          return (
            <g key={i}>
              <circle cx={`${x}%`} cy={`${y}%`} r="2" fill="url(#dotGlow)">
                <animate attributeName="opacity" values="0.3;1;0.3" dur={`${3 + (i % 4)}s`} repeatCount="indefinite" />
              </circle>
              {i > 0 && (
                <line
                  x1={`${x}%`} y1={`${y}%`}
                  x2={`${((i - 1) * 73) % 100}%`} y2={`${((i - 1) * 41) % 100}%`}
                  stroke="#f5a623" strokeOpacity="0.08" strokeWidth="1"
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
