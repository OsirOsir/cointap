import { useState, useEffect, useMemo, useRef } from 'react'
import { RefreshCw, Check, Shield } from 'lucide-react'

// ─────────────────────────────────────────────────────────
// MATH CAPTCHA — no external dependency, blocks basic bots
// ─────────────────────────────────────────────────────────
export function Captcha({ onValid, onInvalid }: { onValid: () => void; onInvalid?: () => void }) {
  const [challenge, setChallenge] = useState({ a: 0, b: 0, op: '+' as '+' | '-' | '×' })
  const [answer, setAnswer] = useState('')
  const [solved, setSolved] = useState(false)

  function generate() {
    const ops = ['+', '-', '×'] as const
    const op = ops[Math.floor(Math.random() * ops.length)]
    let a = Math.floor(Math.random() * 10) + 1
    let b = Math.floor(Math.random() * 10) + 1
    if (op === '-' && b > a) [a, b] = [b, a]  // avoid negatives
    if (op === '×') { a = Math.floor(Math.random() * 9) + 2; b = Math.floor(Math.random() * 9) + 2 }
    setChallenge({ a, b, op })
    setAnswer('')
    setSolved(false)
  }

  useEffect(() => { generate() }, [])

  function check(val: string) {
    setAnswer(val)
    const expected =
      challenge.op === '+' ? challenge.a + challenge.b :
      challenge.op === '-' ? challenge.a - challenge.b :
      challenge.a * challenge.b
    if (val.trim() === String(expected)) {
      setSolved(true)
      onValid()
    } else {
      if (solved) {
        setSolved(false)
        onInvalid?.()
      }
    }
  }

  return (
    <div className="rounded-xl p-3" style={{
      background: solved ? 'rgba(74,222,128,0.08)' : 'rgba(247,147,26,0.05)',
      border: '1px solid ' + (solved ? 'rgba(74,222,128,0.3)' : 'rgba(247,147,26,0.15)'),
    }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
          <Shield className="w-3 h-3" />
          <span className="font-semibold uppercase tracking-wider">Bot check</span>
        </div>
        <button type="button" onClick={generate}
          className="p-1 rounded hover:opacity-70" title="New challenge">
          <RefreshCw className="w-3 h-3" style={{ color: 'var(--muted-foreground)' }} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="px-3 py-2 rounded-lg font-mono font-bold text-base text-white"
          style={{
            background: 'rgba(0,0,0,0.4)',
            letterSpacing: '0.1em',
            textDecoration: 'line-through wavy rgba(247,147,26,0.4) 1px',
            userSelect: 'none',
          }}>
          {challenge.a} {challenge.op} {challenge.b} = ?
        </div>
        <input
          type="text" inputMode="numeric" pattern="[0-9-]*"
          value={answer} onChange={(e) => check(e.target.value)}
          placeholder="?"
          className="flex-1 px-3 py-2 rounded-lg text-white font-mono text-center font-bold"
          style={{
            background: 'rgba(30,37,53,0.8)',
            border: '1px solid ' + (solved ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'),
          }} />
        {solved && (
          <div className="flex items-center gap-1 text-xs font-bold text-green-400">
            <Check className="w-3.5 h-3.5" /> OK
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// PASSWORD STRENGTH METER
// ─────────────────────────────────────────────────────────
export function getPasswordStrength(pw: string): {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
  checks: { text: string; passed: boolean }[]
} {
  const checks = [
    { text: 'At least 8 characters', passed: pw.length >= 8 },
    { text: 'Contains uppercase letter (A-Z)', passed: /[A-Z]/.test(pw) },
    { text: 'Contains lowercase letter (a-z)', passed: /[a-z]/.test(pw) },
    { text: 'Contains a number (0-9)', passed: /\d/.test(pw) },
    { text: 'Contains special character (!@#$...)', passed: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(pw) },
  ]
  const score = checks.filter((c) => c.passed).length as 0 | 1 | 2 | 3 | 4 | 5

  let cappedScore: 0 | 1 | 2 | 3 | 4 = 0
  let label = 'Too weak'
  let color = '#ef4444'

  if (score === 0 || pw.length === 0) {
    cappedScore = 0; label = pw.length === 0 ? 'Enter a password' : 'Too weak'; color = '#ef4444'
  } else if (score <= 2) {
    cappedScore = 1; label = 'Weak'; color = '#ef4444'
  } else if (score === 3) {
    cappedScore = 2; label = 'Fair'; color = '#fbbf24'
  } else if (score === 4) {
    cappedScore = 3; label = 'Strong'; color = '#84cc16'
  } else {
    cappedScore = 4; label = 'Very strong'; color = '#4ade80'
  }

  return { score: cappedScore, label, color, checks }
}

export function PasswordStrength({ password, showChecklist = true }: { password: string; showChecklist?: boolean }) {
  const { score, label, color, checks } = useMemo(() => getPasswordStrength(password), [password])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
              style={{ background: i < score ? color : 'rgba(255,255,255,0.08)' }} />
          ))}
        </div>
        <span className="text-xs font-bold" style={{ color, minWidth: '80px', textAlign: 'right' }}>
          {label}
        </span>
      </div>

      {showChecklist && password.length > 0 && (
        <ul className="space-y-1 text-[11px]">
          {checks.map((c, i) => (
            <li key={i} className="flex items-center gap-1.5 transition-colors"
              style={{ color: c.passed ? '#4ade80' : 'rgba(136,146,164,0.6)' }}>
              <span className="inline-flex items-center justify-center w-3 h-3 rounded-full"
                style={{ background: c.passed ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.05)' }}>
                {c.passed && <Check className="w-2 h-2" />}
              </span>
              {c.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SIX-DIGIT 2FA INPUT (separated boxes, auto-advance)
// ─────────────────────────────────────────────────────────
export function TwoFactorInput({ value, onChange, onComplete, autoFocus }: {
  value: string
  onChange: (v: string) => void
  onComplete?: (v: string) => void
  autoFocus?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function setDigit(i: number, d: string) {
    const cleaned = d.replace(/\D/g, '').slice(-1)
    const arr = value.padEnd(6, ' ').split('')
    arr[i] = cleaned || ' '
    const next = arr.join('').replace(/\s+$/, '')
    onChange(next)

    if (cleaned && i < 5) refs.current[i + 1]?.focus()
    if (next.replace(/\s/g, '').length === 6) onComplete?.(next.replace(/\s/g, ''))
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    if (pasted.length === 6) onComplete?.(pasted)
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={onPaste}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text" inputMode="numeric" pattern="[0-9]"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={value[i] || ''}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl text-white"
          style={{
            background: 'rgba(30,37,53,0.8)',
            border: '1px solid ' + (value[i] ? 'rgba(247,147,26,0.4)' : 'rgba(255,255,255,0.1)'),
            transition: 'all 0.2s',
          }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// EMAIL VERIFICATION BANNER (shown at top of pages)
// ─────────────────────────────────────────────────────────
export function EmailVerificationBanner({ onVerify }: { onVerify: () => void }) {
  return (
    <div className="rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap animate-slide-up"
      style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}>
          <Shield className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-white text-sm">Verify your email</div>
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Some features (like withdrawals) require email verification
          </div>
        </div>
      </div>
      <button onClick={onVerify}
        className="px-4 py-2 rounded-lg text-xs font-bold flex-shrink-0"
        style={{ background: '#fbbf24', color: '#0a0e1a' }}>
        Verify Now
      </button>
    </div>
  )
}
