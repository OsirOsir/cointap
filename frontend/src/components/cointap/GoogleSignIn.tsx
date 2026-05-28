import { useState } from 'react'
import { store } from '@/lib/cointap-store'

/**
 * Google Sign-In button.
 *
 * Demo mode: clicking simulates a Google OAuth flow with a fake profile.
 * Production: replace `simulateGoogleSignIn` with Google Identity Services:
 *   1. Add <script src="https://accounts.google.com/gsi/client" async defer></script> to index.html
 *   2. Call google.accounts.id.initialize() with your CLIENT_ID
 *   3. Pass the credential (JWT) to your backend for verification
 *   4. Backend decodes the JWT and returns your session token
 *
 * See: https://developers.google.com/identity/gsi/web/guides/overview
 */
export function GoogleSignInButton({
  label = 'Continue with Google',
  onSuccess,
  onError,
}: {
  label?: string
  onSuccess?: (isNewUser: boolean) => void
  onError?: (error: string) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      // ─── DEMO ─────────────────────────────────────────
      // Simulate Google's popup + auth delay
      await new Promise((r) => setTimeout(r, 900))

      // Build a fake profile from a few plausible Google accounts
      const demoProfiles = [
        { name: 'Philip Osir', email: 'philip.osir@gmail.com' },
        { name: 'Mary Wanjiku', email: 'mary.wanjiku@gmail.com' },
        { name: 'John Kamau', email: 'john.kamau@gmail.com' },
      ]
      const profile = demoProfiles[Math.floor(Math.random() * demoProfiles.length)]

      const res = store.loginWithGoogle(profile)
      if (!res.ok) {
        onError?.(res.error || 'Google sign-in failed')
        return
      }
      onSuccess?.(res.isNewUser)
    } catch (e: any) {
      onError?.(e?.message || 'Could not connect to Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: 'white',
        color: '#1f1f1f',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 2px 8px -2px rgba(0,0,0,0.3)',
      }}
    >
      {loading ? (
        <>
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#1f1f1f" strokeWidth="3" strokeOpacity="0.2" />
            <path d="M12 2 A10 10 0 0 1 22 12" stroke="#1f1f1f" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span>Connecting to Google…</span>
        </>
      ) : (
        <>
          {/* Official Google "G" logo */}
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
          </svg>
          <span>{label}</span>
        </>
      )}
    </button>
  )
}

/**
 * Visual divider with "OR" label — used between OAuth buttons and email/password form.
 */
export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <span className="text-[10px] uppercase tracking-widest font-bold"
        style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}
