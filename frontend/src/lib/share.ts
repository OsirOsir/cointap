/**
 * Bulletproof copy-to-clipboard with mobile-aware fallbacks.
 *
 * Order of attempts:
 *   1. navigator.share (best UX on mobile — opens native share sheet)
 *   2. navigator.clipboard.writeText (requires HTTPS / localhost)
 *   3. document.execCommand('copy') via hidden textarea (works on plain HTTP)
 *   4. window.prompt (last-resort manual copy)
 *
 * Returns true if the user did something successful (shared or copied),
 * false otherwise.
 */
export async function shareOrCopy(opts: {
  text: string
  title?: string
  shareText?: string
  preferShare?: boolean
}): Promise<boolean> {
  const { text, title, shareText, preferShare = true } = opts

  const isMobile = typeof navigator !== 'undefined' &&
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  // 1) Native share sheet — only on mobile if requested
  if (preferShare && isMobile && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: shareText || text, url: text })
      return true
    } catch (e: any) {
      // User cancelled — they probably don't want copy either
      if (e?.name === 'AbortError') return false
      // Otherwise fall through to copy
    }
  }

  // 2) Modern Clipboard API (needs secure context)
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof window !== 'undefined' &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through */ }

  // 3) Legacy execCommand — works on HTTP and old browsers
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    ta.setAttribute('readonly', '')
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    if (ok) return true
  } catch { /* fall through */ }

  // 4) Last resort: manual copy prompt
  try {
    window.prompt('Copy this link manually:', text)
    return false
  } catch {
    return false
  }
}