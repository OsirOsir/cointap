/**
 * QrGenerator — admin-only modal that draws a QR code on a canvas using
 * the `qrcode` library, supports a few brand presets + size variants, can
 * optionally overlay the CoinTap logo, and downloads as PNG.
 *
 * Why client-side?
 *  - QR generation is deterministic and lightweight (~25KB gzipped lib)
 *  - No server round-trip; user can tweak settings and see results instantly
 *  - Works offline (handy if VPS is slow)
 *
 * About logo overlay:
 *  QR codes have built-in error correction. Using level 'H' (~30% recovery)
 *  lets us safely overlay a small centered logo without breaking scannability,
 *  as long as the logo stays under ~22% of the QR area.
 */
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { X, Download, Copy, Check, ExternalLink, Palette } from 'lucide-react'

type Preset = {
  key: string
  label: string
  dark: string   // module colour
  light: string  // background colour
}

const PRESETS: Preset[] = [
  { key: 'gold-white',  label: 'Gold on White', dark: '#F7931A', light: '#FFFFFF' },
  { key: 'black-white', label: 'Classic',       dark: '#000000', light: '#FFFFFF' },
  { key: 'navy-white',  label: 'Navy on White', dark: '#0A0E1A', light: '#FFFFFF' },
  { key: 'gold-navy',   label: 'Gold on Navy',  dark: '#F7931A', light: '#0A0E1A' },
]

const SIZES: { key: string; label: string; px: number; hint: string }[] = [
  { key: 'sm', label: 'Small',  px: 300,  hint: 'Web / chat' },
  { key: 'md', label: 'Medium', px: 600,  hint: 'Social media' },
  { key: 'lg', label: 'Large',  px: 1200, hint: 'Flyer / print' },
]

const QUICK_URLS = [
  { label: 'Apply for Jobs',   url: 'https://cointap.online/apply' },
  { label: 'Homepage',         url: 'https://cointap.online' },
  { label: 'Register',         url: 'https://cointap.online/register' },
  { label: 'Login',            url: 'https://cointap.online/login' },
]

export function QrGenerator({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('https://cointap.online/apply')
  const [preset, setPreset] = useState<Preset>(PRESETS[0])
  const [size, setSize] = useState(SIZES[1])    // default Medium
  const [includeLogo, setIncludeLogo] = useState(true)
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Whenever any setting changes, redraw the QR
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const canvasEl: HTMLCanvasElement = canvas
    let cancelled = false

    async function draw() {
      try {
        await QRCode.toCanvas(canvasEl, url || ' ', {
          errorCorrectionLevel: 'H',     // 'H' = highest, supports logo overlay
          margin: 2,
          width: size.px,
          color: { dark: preset.dark, light: preset.light },
        })
        if (cancelled) return
        if (includeLogo) overlayLogo(canvasEl, preset)
      } catch (e) {
        // QR can fail if URL is too long — show feedback in console
        console.error('QR generation failed:', e)
      }
    }
    draw()
    return () => { cancelled = true }
  }, [url, preset, size, includeLogo])

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      const safeUrl = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_').toLowerCase()
      link.download = `cointap_qr_${safeUrl}_${size.px}px.png`
      link.click()
      URL.revokeObjectURL(link.href)
    })
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* fallback handled below */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, #141821 0%, #0a0e1a 100%)',
          border: '1px solid rgba(247,147,26,0.25)',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,0.8)',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 sticky top-0 z-10"
          style={{
            background: 'linear-gradient(135deg, #141821 0%, #0a0e1a 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              QR Code Generator
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Branded QR codes for flyers, posters, and social media
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="p-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">

          {/* Quick URL picker */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5 block"
              style={{ color: 'var(--muted-foreground)' }}>Quick Targets</label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_URLS.map((q) => (
                <button key={q.url} onClick={() => setUrl(q.url)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={url === q.url ? {
                    background: 'var(--gradient-gold)',
                    color: 'var(--primary-foreground)',
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* URL input */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5 block"
              style={{ color: 'var(--muted-foreground)' }}>Custom URL</label>
            <div className="flex gap-2">
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://cointap.online/..."
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }} />
              <button onClick={copyUrl}
                aria-label="Copy URL"
                className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: copied ? '#4ade80' : 'rgba(255,255,255,0.8)',
                }}>
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied</>
                        : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
              <a href={url} target="_blank" rel="noopener"
                aria-label="Open URL"
                className="px-3 py-2 rounded-lg flex items-center text-xs font-semibold no-underline"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.8)',
                }}>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* QR preview */}
          <div className="flex flex-col items-center gap-2 py-4 rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="rounded-xl p-3 shadow-2xl"
              style={{ background: preset.light, maxWidth: '300px' }}>
              <canvas ref={canvasRef}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  maxWidth: '276px',
                  imageRendering: 'pixelated',
                }} />
            </div>
            <div className="text-[10px] font-mono" style={{ color: 'var(--muted-foreground)' }}>
              {size.px}×{size.px}px
            </div>
          </div>

          {/* Color presets */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5 block"
              style={{ color: 'var(--muted-foreground)' }}>Color</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button key={p.key} onClick={() => setPreset(p)}
                  className="p-2 rounded-xl text-[11px] font-semibold transition-all"
                  style={preset.key === p.key ? {
                    background: 'rgba(247,147,26,0.15)',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary)',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                  <div className="flex items-center gap-1.5 justify-center mb-1">
                    <span className="w-3 h-3 rounded-full" style={{ background: p.dark }} />
                    <span className="w-3 h-3 rounded-full"
                      style={{ background: p.light, border: '1px solid rgba(255,255,255,0.15)' }} />
                  </div>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5 block"
              style={{ color: 'var(--muted-foreground)' }}>Size</label>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map((s) => (
                <button key={s.key} onClick={() => setSize(s)}
                  className="p-2 rounded-xl text-xs font-semibold transition-all"
                  style={size.key === s.key ? {
                    background: 'rgba(247,147,26,0.15)',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary)',
                  } : {
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                  <div>{s.label}</div>
                  <div className="text-[9px] mt-0.5 opacity-60">{s.hint} · {s.px}px</div>
                </button>
              ))}
            </div>
          </div>

          {/* Logo toggle */}
          <label className="flex items-center justify-between p-3 rounded-xl cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
            <div>
              <div className="text-sm font-semibold text-white">CoinTap logo in center</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                Adds brand recognition. QR remains scannable thanks to error correction.
              </div>
            </div>
            <div className="relative ml-3 flex-shrink-0">
              <input type="checkbox" checked={includeLogo}
                onChange={(e) => setIncludeLogo(e.target.checked)}
                className="sr-only peer" />
              <div className="w-10 h-6 rounded-full transition-colors"
                style={{ background: includeLogo ? 'var(--primary)' : 'rgba(255,255,255,0.15)' }} />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: includeLogo ? 'translateX(16px)' : 'translateX(0)' }} />
            </div>
          </label>

          {/* Test instructions */}
          <div className="text-[11px] p-3 rounded-xl"
            style={{
              background: 'rgba(247,147,26,0.06)',
              border: '1px solid rgba(247,147,26,0.15)',
              color: 'rgba(255,255,255,0.8)',
            }}>
            <span className="font-bold text-white">💡 Tip:</span> Before printing, scan it
            with your phone camera to confirm it opens the right URL. QR codes can fail to
            scan if too small (under 3cm) or if printed with low contrast.
          </div>

          {/* Download */}
          <button onClick={download}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
            <Download className="w-4 h-4" />
            Download PNG
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Logo overlay helper
//
// Draws a centered white rounded square (about 22% of the canvas wide)
// with the CoinTap "1-on-coin" mark inside. The size is calibrated for
// error-correction level 'H' which can recover ~30% data — so even with
// this overlay, the QR scans reliably.
// ────────────────────────────────────────────────────────────────
function overlayLogo(canvas: HTMLCanvasElement, preset: Preset) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  const logoSize = Math.round(W * 0.22)   // ~22% of canvas — safe for level 'H'
  const cx = W / 2
  const cy = H / 2
  const r = logoSize / 2

  // White rounded square backdrop so the logo is visible regardless of QR colour
  const pad = Math.round(logoSize * 0.08)
  ctx.fillStyle = preset.light
  roundedRect(ctx, cx - r - pad, cy - r - pad, logoSize + pad * 2, logoSize + pad * 2,
              Math.round(logoSize * 0.18))
  ctx.fill()

  // Gold circle (the "coin") with a "1" — mirrors the brand mark
  const coinR = r * 0.95
  // Outer gold ring
  ctx.beginPath()
  ctx.arc(cx, cy, coinR, 0, Math.PI * 2)
  const grad = ctx.createLinearGradient(cx - coinR, cy - coinR, cx + coinR, cy + coinR)
  grad.addColorStop(0, '#fbbf24')
  grad.addColorStop(0.5, '#f7931a')
  grad.addColorStop(1, '#c2410c')
  ctx.fillStyle = grad
  ctx.fill()

  // Inner dark disc
  ctx.beginPath()
  ctx.arc(cx, cy, coinR * 0.78, 0, Math.PI * 2)
  ctx.fillStyle = '#0a0e1a'
  ctx.fill()

  // The "1"
  ctx.fillStyle = '#fbbf24'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(coinR * 1.1)}px "Space Grotesk", system-ui, sans-serif`
  ctx.fillText('1', cx, cy + coinR * 0.06)
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number,
                     w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
