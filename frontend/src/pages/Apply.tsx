/**
 * /apply — Public job application form.
 *
 * Goals:
 *  - Mobile-first, optimized for campus students on slow connections (3G).
 *  - Single SPA page — no reload to submit (uses fetch with progress).
 *  - Draft persistence to localStorage on every keystroke so a dropped
 *    connection or accidental refresh doesn't lose answers.
 *  - Honeypot field for bot defense (no CAPTCHA friction).
 *  - Optional CV upload up to 2MB with progress bar.
 *  - When admin closes hiring, /apply shows a friendly "closed" state.
 *
 * Branding: full CoinTap dark navy + orange gold theme, very on-brand.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase, Upload, X, CheckCircle, MapPin, Phone, Mail,
  GraduationCap, Building2, Clock, Zap, Heart, Loader2, AlertCircle,
} from 'lucide-react'
import { Logo } from '@/components/cointap/Logo'

const DRAFT_KEY = 'cointap_apply_draft_v1'
const STATUS_ENDPOINT = '/api/careers/status'
const APPLY_ENDPOINT = '/api/careers/apply'
const CV_MAX_BYTES = 2 * 1024 * 1024

const KENYA_COUNTIES = [
  'Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Machakos','Kakamega',
  'Kisii','Kitale','Garissa','Embu','Meru','Nyeri','Kericho','Bungoma','Bomet',
  'Busia','Vihiga','Siaya','Migori','Homa Bay','Narok','Kajiado','Kiambu',
  'Murang\'a','Nyandarua','Laikipia','Samburu','Trans Nzoia','Uasin Gishu',
  'Elgeyo-Marakwet','Nandi','Baringo','West Pokot','Turkana','Marsabit',
  'Isiolo','Mandera','Wajir','Tana River','Lamu','Taita-Taveta','Kilifi',
  'Kwale','Makueni','Kitui','Other',
]

type FormState = {
  full_name: string
  whatsapp: string
  email: string
  county: string
  school: string
  course: string
  year_of_study: string
  available_remote: string
  has_experience: string
  why_interested: string
  pitch_cointap: string
  website: string   // honeypot — never shown
}

const EMPTY: FormState = {
  full_name: '', whatsapp: '', email: '', county: '',
  school: '', course: '', year_of_study: '',
  available_remote: '', has_experience: '',
  why_interested: '', pitch_cointap: '',
  website: '',
}

export function Apply() {
  // Status (open / closed)
  const [statusLoading, setStatusLoading] = useState(true)
  const [open, setOpen] = useState(true)
  const [statusErr, setStatusErr] = useState<string | null>(null)

  // Form
  const [f, setF] = useState<FormState>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) return { ...EMPTY, ...JSON.parse(raw) }
    } catch {}
    return EMPTY
  })
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvError, setCvError] = useState('')

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)
  const [submitErr, setSubmitErr] = useState('')
  const [done, setDone] = useState(false)

  // Capture how the applicant arrived (for analytics)
  const referrerRef = useRef<string>('')
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref') || ''
    referrerRef.current = ref || document.referrer || 'direct'
  }, [])

  // Persist drafts continuously (debounced lightly)
  useEffect(() => {
    if (done) return
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...f, website: '' })) } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [f, done])

  // Initial: check if applications are open
  useEffect(() => {
    let cancelled = false
    fetch(STATUS_ENDPOINT)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok === false) {
          setStatusErr(data.error || 'Could not load application status.')
        } else {
          setOpen(!!data.open)
        }
      })
      .catch(() => {
        if (!cancelled) setStatusErr('Could not reach server. Check your connection and try again.')
      })
      .finally(() => { if (!cancelled) setStatusLoading(false) })
    return () => { cancelled = true }
  }, [])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }))
    setSubmitErr('')
  }

  function onCvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setCvError('')
    if (!file) { setCvFile(null); return }
    if (file.size > CV_MAX_BYTES) {
      setCvError('CV must be under 2MB.')
      e.target.value = ''
      return
    }
    const ext = file.name.toLowerCase().split('.').pop()
    if (!['pdf', 'doc', 'docx'].includes(ext || '')) {
      setCvError('Use a PDF, DOC, or DOCX file.')
      e.target.value = ''
      return
    }
    setCvFile(file)
  }

  function validate(): string | null {
    if (f.full_name.trim().length < 3) return 'Please enter your full name.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return 'Please enter a valid email.'
    const digits = f.whatsapp.replace(/\D/g, '')
    if (digits.length < 9) return 'Please enter a valid WhatsApp number.'
    if (!f.county) return 'Please pick your county or town.'
    if (f.school.trim().length < 2) return 'Please tell us your campus.'
    if (f.course.trim().length < 2) return 'Please tell us your course.'
    if (!f.year_of_study) return 'Please pick your year of study.'
    if (!f.available_remote) return 'Please answer the remote-work question.'
    if (!f.has_experience) return 'Please answer the experience question.'
    if (f.why_interested.trim().length < 10) return 'Please share a bit more in "Why interested".'
    if (f.pitch_cointap.trim().length < 10) return 'Please share a brief pitch for CoinTap.'
    return null
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitErr('')
    const v = validate()
    if (v) { setSubmitErr(v); return }

    setSubmitting(true)
    setSubmitProgress(0)

    try {
      // Use XMLHttpRequest so we get upload progress events for CV files.
      // fetch() doesn't expose upload progress yet.
      const formData = new FormData()
      Object.entries(f).forEach(([k, v]) => formData.append(k, v))
      formData.append('referrer', referrerRef.current)
      if (cvFile) formData.append('cv', cvFile)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', APPLY_ENDPOINT)
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          setSubmitProgress(Math.round((ev.loaded / ev.total) * 100))
        }
      }
      const result = await new Promise<{ ok: boolean; error?: string }>((resolve, reject) => {
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText || '{}')
            if (xhr.status >= 200 && xhr.status < 300 && json.ok) resolve(json)
            else resolve({ ok: false, error: json.error || `Server returned ${xhr.status}` })
          } catch { reject(new Error('Bad response from server')) }
        }
        xhr.onerror = () => reject(new Error('Network error — please check your connection.'))
        xhr.ontimeout = () => reject(new Error('Request timed out — try again on a stronger connection.'))
        xhr.timeout = 60000
        xhr.send(formData)
      })

      if (!result.ok) {
        setSubmitErr(result.error || 'Could not submit. Please try again.')
        setSubmitting(false)
        setSubmitProgress(0)
        return
      }

      // Success! Clear draft, show thank-you screen.
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      setDone(true)
    } catch (err: any) {
      setSubmitErr(err?.message || 'Submission failed. Please try again.')
      setSubmitting(false)
      setSubmitProgress(0)
    }
  }

  // ───────── Render states ─────────

  if (statusLoading) {
    return <ScreenWrap><div className="flex items-center gap-3 text-white/70">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div></ScreenWrap>
  }

  if (statusErr) {
    return <ScreenWrap><div className="glass rounded-2xl p-6 max-w-md w-full text-center">
      <AlertCircle className="w-10 h-10 mx-auto text-red-400" />
      <h2 className="text-xl font-bold text-white mt-3">Couldn't load</h2>
      <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>{statusErr}</p>
      <button onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 rounded-lg font-semibold"
        style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
        Try Again
      </button>
    </div></ScreenWrap>
  }

  if (!open) {
    return <ScreenWrap><div className="glass rounded-2xl p-6 max-w-md w-full text-center">
      <Briefcase className="w-10 h-10 mx-auto" style={{ color: 'var(--primary)' }} />
      <h2 className="text-xl font-bold text-white mt-3">Applications are closed</h2>
      <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
        We've received the applications we need for now. Follow CoinTap for updates on future openings.
      </p>
      <Link to="/" className="inline-block mt-4 px-4 py-2 rounded-lg font-semibold"
        style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
        ← Back to CoinTap
      </Link>
    </div></ScreenWrap>
  }

  if (done) {
    return <ScreenWrap>
      <div className="glass rounded-2xl p-6 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
          style={{ background: 'rgba(74,222,128,0.15)' }}>
          <CheckCircle className="w-9 h-9 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mt-4">Application Received! 🎉</h2>
        <p className="text-sm mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Thank you for applying for the <strong>CoinTap Sales Manager</strong> role.
        </p>
        <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
          Shortlisted applicants will be contacted via <strong className="text-white">WhatsApp or email</strong> within
          a few days. Keep an eye on your phone.
        </p>
        <div className="mt-5 p-3 rounded-xl text-left"
          style={{ background: 'rgba(247,147,26,0.08)', border: '1px solid rgba(247,147,26,0.2)' }}>
          <div className="text-[11px] uppercase tracking-wider text-white/70 font-bold">While you wait…</div>
          <p className="text-xs mt-1.5 leading-relaxed text-white/80">
            Explore the platform you'll be promoting. <Link to="/" className="underline" style={{ color: 'var(--primary)' }}>cointap.online</Link>
          </p>
        </div>
        <Link to="/" className="inline-block mt-4 px-4 py-2 rounded-lg font-semibold text-sm"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          Visit CoinTap →
        </Link>
        <div className="text-[11px] mt-5" style={{ color: 'var(--muted-foreground)' }}>— CoinTap Team</div>
      </div>
    </ScreenWrap>
  }

  // ───────── Main form ─────────

  return (
    <div className="min-h-screen pb-12" style={{ background: '#050812' }}>
      {/* Hero */}
      <div className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a0e1a 0%, #141821 100%)',
          borderBottom: '1px solid rgba(247,147,26,0.2)',
        }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-5">
            <Logo />
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3"
            style={{ background: 'rgba(247,147,26,0.15)', color: 'var(--primary)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            We're Hiring
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            CoinTap Sales Manager <span className="text-gradient-gold">Application</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Apply in 1 minute. No long CV needed to start. Open to campus students pursuing a Bachelor's degree in any field.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <Badge icon={<Zap className="w-3 h-3" />} label="Remote work" />
            <Badge icon={<Clock className="w-3 h-3" />} label="Flexible hours" />
            <Badge icon={<Heart className="w-3 h-3" />} label="Training provided" />
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="max-w-2xl mx-auto px-4 sm:px-6 mt-6 space-y-6">

        {/* Honeypot — invisible to humans, irresistible to dumb bots */}
        <div style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, overflow: 'hidden' }}
          aria-hidden="true">
          <label>Website
            <input type="text" tabIndex={-1} autoComplete="off"
              value={f.website} onChange={(e) => update('website', e.target.value)} />
          </label>
        </div>

        {/* Section 1: Personal */}
        <Section number="1" title="About You">
          <Field label="Full Name" required>
            <input type="text" required value={f.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              autoComplete="name"
              placeholder="e.g. Mary Achieng"
              className={inputClass} style={inputStyle} />
          </Field>
          <Field label="WhatsApp Number" required icon={<Phone className="w-3.5 h-3.5" />}>
            <input type="tel" required value={f.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
              autoComplete="tel"
              placeholder="e.g. 0712 345 678"
              className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Email Address" required icon={<Mail className="w-3.5 h-3.5" />}>
            <input type="email" required value={f.email}
              onChange={(e) => update('email', e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass} style={inputStyle} />
          </Field>
          <Field label="County / Town" required icon={<MapPin className="w-3.5 h-3.5" />}>
            <select required value={f.county}
              onChange={(e) => update('county', e.target.value)}
              className={inputClass} style={inputStyle}>
              <option value="">Choose your county</option>
              {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </Section>

        {/* Section 2: Education */}
        <Section number="2" title="Education">
          <Field label="Campus / University / College" required icon={<Building2 className="w-3.5 h-3.5" />}>
            <input type="text" required value={f.school}
              onChange={(e) => update('school', e.target.value)}
              placeholder="e.g. University of Nairobi"
              className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Course Pursuing" required icon={<GraduationCap className="w-3.5 h-3.5" />}>
            <input type="text" required value={f.course}
              onChange={(e) => update('course', e.target.value)}
              placeholder="e.g. BCom Marketing"
              className={inputClass} style={inputStyle} />
          </Field>
          <Field label="Year of Study" required>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                ['year_1', 'Year 1'], ['year_2', 'Year 2'], ['year_3', 'Year 3'],
                ['year_4', 'Year 4'], ['other', 'Other'],
              ].map(([val, label]) => (
                <PillRadio key={val} name="year" value={val} current={f.year_of_study}
                  label={label} onChange={(v) => update('year_of_study', v)} />
              ))}
            </div>
          </Field>
        </Section>

        {/* Section 3: Role Interest */}
        <Section number="3" title="Role Interest">
          <Field label="Are you available for remote work?" required>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure'],
              ].map(([val, label]) => (
                <PillRadio key={val} name="remote" value={val} current={f.available_remote}
                  label={label} onChange={(v) => update('available_remote', v)} />
              ))}
            </div>
          </Field>
          <Field label="Any sales, marketing, or lead generation experience?" required>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['yes', 'Yes'], ['no', 'No'], ['a_little', 'A little'],
              ].map(([val, label]) => (
                <PillRadio key={val} name="exp" value={val} current={f.has_experience}
                  label={label} onChange={(v) => update('has_experience', v)} />
              ))}
            </div>
          </Field>
          <Field label="Why this role?" required hint="A few sentences is enough.">
            <textarea required rows={3} value={f.why_interested}
              onChange={(e) => update('why_interested', e.target.value)}
              maxLength={500}
              placeholder="Tell us what excites you about being a CoinTap Sales Manager…"
              className={inputClass} style={inputStyle} />
            <div className="text-[10px] text-right mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {f.why_interested.length}/500
            </div>
          </Field>
          <Field label="How would you pitch CoinTap to a friend?" required hint="One or two sentences.">
            <textarea required rows={3} value={f.pitch_cointap}
              onChange={(e) => update('pitch_cointap', e.target.value)}
              maxLength={500}
              placeholder="Imagine your friend asks 'why should I join CoinTap?' — what do you say?"
              className={inputClass} style={inputStyle} />
            <div className="text-[10px] text-right mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {f.pitch_cointap.length}/500
            </div>
          </Field>
        </Section>

        {/* Section 4: Optional CV */}
        <Section number="4" title="CV (Optional)">
          <Field label="Upload CV or Profile" hint="PDF, DOC, or DOCX up to 2MB. You can still apply without one.">
            {!cvFile ? (
              <label className="flex flex-col items-center gap-2 py-6 rounded-xl cursor-pointer transition-all hover:opacity-80"
                style={{
                  background: 'rgba(247,147,26,0.05)',
                  border: '2px dashed rgba(247,147,26,0.3)',
                }}>
                <Upload className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                <span className="text-sm text-white">Tap to choose file</span>
                <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                  PDF · DOC · DOCX (max 2MB)
                </span>
                <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden" onChange={onCvChange} />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)' }}>
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{cvFile.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                    {(cvFile.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <button type="button" onClick={() => setCvFile(null)} aria-label="Remove file"
                  className="p-1.5 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {cvError && (
              <div className="mt-2 text-xs flex items-center gap-1.5 text-red-400">
                <AlertCircle className="w-3.5 h-3.5" /> {cvError}
              </div>
            )}
          </Field>
        </Section>

        {/* Submit */}
        {submitErr && (
          <div className="p-3 rounded-xl flex items-start gap-2"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-400">{submitErr}</span>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full py-4 rounded-xl font-bold text-base disabled:opacity-50 transition-all relative overflow-hidden"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          {submitting && submitProgress > 0 && submitProgress < 100 && (
            <div className="absolute inset-y-0 left-0 bg-white/20 transition-all"
              style={{ width: `${submitProgress}%` }} />
          )}
          <span className="relative flex items-center justify-center gap-2">
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {submitProgress > 0 && submitProgress < 100 ? `Sending… ${submitProgress}%` : 'Sending…'}
              </>
            ) : (
              <>Submit Application →</>
            )}
          </span>
        </button>

        <p className="text-[10px] text-center" style={{ color: 'var(--muted-foreground)' }}>
          Your information is used only for this application. We'll never share it.
        </p>
      </form>
    </div>
  )
}

// ───────── Sub-components ─────────

function ScreenWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#050812' }}>
      {children}
    </div>
  )
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 sm:p-5 space-y-4"
      style={{
        background: '#101522',
        border: '1px solid rgba(247,147,26,0.18)',
      }}>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          {number}
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, required, hint, icon, children }: {
  label: string; required?: boolean; hint?: string;
  icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5"
        style={{ color: 'rgba(255,255,255,0.85)' }}>
        {icon && <span style={{ color: 'var(--primary)' }}>{icon}</span>}
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && (
        <div className="text-[10px] mt-1" style={{ color: 'var(--muted-foreground)' }}>{hint}</div>
      )}
    </div>
  )
}

function PillRadio({ name, value, current, label, onChange }: {
  name: string; value: string; current: string; label: string;
  onChange: (v: string) => void
}) {
  const active = current === value
  return (
    <button type="button" name={name} onClick={() => onChange(value)}
      className="px-3 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
      style={active ? {
        background: 'var(--gradient-gold)',
        color: 'var(--primary-foreground)',
        border: '1px solid transparent',
      } : {
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
      {label}
    </button>
  )
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full"
      style={{ background: 'rgba(247,147,26,0.1)', color: 'var(--primary)', border: '1px solid rgba(247,147,26,0.2)' }}>
      {icon}
      {label}
    </span>
  )
}

const inputClass = "w-full px-3.5 py-3 rounded-xl text-sm text-white focus:outline-none transition-colors"
  + " placeholder:text-white/30"
const inputStyle: React.CSSProperties = {
  background: '#0a0e1a',
  border: '1px solid rgba(255,255,255,0.08)',
}
