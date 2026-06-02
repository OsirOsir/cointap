/**
 * Live chat widget — floating bubble + expandable window.
 *
 * Behaviors:
 *  - Closed: gold bubble bottom-right with optional unread badge
 *  - Open:   chat window with message history + send box
 *  - Polls /api/chat/messages every 3s when open, every 30s when closed
 *  - Pauses polling when tab is hidden (browser visibility API)
 *  - For logged-in users: auto-starts conversation on mount
 *  - For anonymous: starts a conversation lazily on first message
 *  - Soft prompt for contact info after 3 user messages (hybrid onboarding)
 *  - State (open/closed) persisted in localStorage
 *  - Mobile-friendly: bottom drawer on small screens
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageCircle, X, Send, Minus } from 'lucide-react'
import { chatApi } from '@/lib/api'
import { useStore } from '@/lib/cointap-store'

type Sender = 'user' | 'admin' | 'system'

type Msg = {
  id: number
  conversation_id: number
  sender: Sender
  body: string
  created_at: string
}

type Conv = {
  id: number
  status: 'open' | 'closed'
  is_guest: boolean
  unread_user: number
  unread_admin: number
  visitor_name?: string | null
  visitor_email?: string | null
}

const OPEN_KEY = 'cointap_chat_open'
const CONTACT_DISMISSED_KEY = 'cointap_chat_contact_dismissed'

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export function ChatWidget() {
  const user = useStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [open, setOpen] = useState<boolean>(() => localStorage.getItem(OPEN_KEY) === '1')
  const [conv, setConv] = useState<Conv | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showContactPrompt, setShowContactPrompt] = useState(false)
  const [contact, setContact] = useState({ name: '', email: '' })

  const lastTsRef = useRef<string>('')   // for incremental polling
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Don't show widget for admins (they reply via admin panel)
  if (isAdmin) return null

  // Persist open state
  useEffect(() => {
    localStorage.setItem(OPEN_KEY, open ? '1' : '0')
  }, [open])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Mark admin messages as read whenever the window is open and there's unread
  useEffect(() => {
    if (open && conv && conv.unread_user > 0) {
      chatApi.markRead().catch(() => { /* silent */ })
    }
  }, [open, conv?.id, conv?.unread_user])

  // ─── Polling ────────────────────────────────────────────────
  const poll = useCallback(async () => {
    try {
      const data = await chatApi.messages(lastTsRef.current || undefined)
      if (data?.conversation) {
        setConv(data.conversation)
      }
      if (data?.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages((prev) => {
          // Avoid duplicates by id
          const existing = new Set(prev.map((m) => m.id))
          const incoming = data.messages.filter((m: Msg) => !existing.has(m.id))
          if (incoming.length === 0) return prev
          const merged = [...prev, ...incoming]
          // Track latest timestamp for next poll
          const latest = merged.reduce((a, b) => (a.created_at > b.created_at ? a : b))
          lastTsRef.current = latest.created_at
          return merged
        })
      }
    } catch {
      // network blip — keep polling
    }
  }, [])

  // Initial start + recurring poll
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      // If we have either a JWT (user) or a visitor token, resume immediately.
      // Otherwise, anonymous visitor: we only start the conversation on first send.
      const hasToken = !!chatApi.getVisitorToken()
      const isLoggedIn = !!user

      if (isLoggedIn || hasToken) {
        try {
          const data = await chatApi.start({})
          if (cancelled) return
          if (data?.conversation) {
            setConv(data.conversation)
            setMessages(data.conversation.messages || [])
            if (data.conversation.messages?.length) {
              const last = data.conversation.messages[data.conversation.messages.length - 1]
              lastTsRef.current = last.created_at
            }
          }
        } catch {
          // ignore — will retry on poll
        }
      }
    }

    bootstrap()

    // Polling intervals — fast when open, slow when closed
    let interval: number | undefined
    function startPolling() {
      stopPolling()
      const ms = open ? 3000 : 30000
      interval = window.setInterval(() => {
        if (document.visibilityState === 'visible') poll()
      }, ms)
    }
    function stopPolling() {
      if (interval) clearInterval(interval)
    }
    startPolling()

    // Re-poll immediately when tab becomes visible
    const visHandler = () => { if (document.visibilityState === 'visible') poll() }
    document.addEventListener('visibilitychange', visHandler)

    return () => {
      cancelled = true
      stopPolling()
      document.removeEventListener('visibilitychange', visHandler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.email])

  // After 3 user messages, show soft contact prompt to anonymous visitors
  useEffect(() => {
    if (!conv?.is_guest) return
    if (localStorage.getItem(CONTACT_DISMISSED_KEY) === '1') return
    if (conv.visitor_email) return   // already gave info
    const userMsgCount = messages.filter((m) => m.sender === 'user').length
    if (userMsgCount >= 3) {
      setShowContactPrompt(true)
    }
  }, [messages, conv])

  // ─── Send a message ─────────────────────────────────────────
  async function send() {
    const text = draft.trim()
    if (!text || sending) return
    setError('')

    // If no conversation yet (anonymous, first message), start it
    if (!conv) {
      try {
        const data = await chatApi.start({})
        if (data?.conversation) {
          setConv(data.conversation)
          setMessages(data.conversation.messages || [])
        }
      } catch (e: any) {
        setError(e?.message || 'Could not start chat')
        return
      }
    }

    // Optimistic local message (will be reconciled with server id on next poll)
    const tempId = -Date.now()
    const optimistic: Msg = {
      id: tempId,
      conversation_id: conv?.id ?? 0,
      sender: 'user',
      body: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setDraft('')
    setSending(true)

    try {
      const res = await chatApi.send(text)
      if (res?.message) {
        // Replace optimistic with real
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempId)
          // Avoid duplicate if poll already grabbed it
          if (filtered.some((m) => m.id === res.message.id)) return filtered
          return [...filtered, res.message]
        })
        lastTsRef.current = res.message.created_at
      }
    } catch (e: any) {
      // Rollback optimistic
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setError(e?.message || 'Could not send message')
      setDraft(text)   // restore so user can retry
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // ─── Submit contact info from soft prompt ───────────────────
  async function submitContact() {
    if (!contact.name && !contact.email) {
      // Nothing to send — just dismiss
      setShowContactPrompt(false)
      localStorage.setItem(CONTACT_DISMISSED_KEY, '1')
      return
    }
    try {
      // Resubmit /start with name/email — backend will reuse existing conversation
      await chatApi.start({ name: contact.name, email: contact.email })
      setShowContactPrompt(false)
      localStorage.setItem(CONTACT_DISMISSED_KEY, '1')
    } catch (e: any) {
      setError(e?.message || 'Could not save info')
    }
  }

  // ─── Visible elements ───────────────────────────────────────
  const unread = conv?.unread_user ?? 0

  // CLOSED — floating bubble
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open support chat"
        className="fixed z-40 right-4 bottom-4 sm:right-5 sm:bottom-5 w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 glow-gold"
        style={{
          background: 'var(--gradient-gold)',
          color: 'var(--primary-foreground)',
          boxShadow: '0 10px 30px -10px rgba(247,147,26,0.6)',
        }}>
        <MessageCircle className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
            style={{ background: '#ef4444', boxShadow: '0 0 0 2px var(--background, #0a0e1a)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    )
  }

  // OPEN — chat window
  return (
    <div
      className="fixed z-50 right-0 bottom-0 sm:right-5 sm:bottom-5 w-full sm:w-[380px] h-[100dvh] sm:h-[560px] sm:max-h-[80vh] flex flex-col rounded-none sm:rounded-2xl overflow-hidden animate-slide-up"
      style={{
        background: 'linear-gradient(160deg, #141821 0%, #0a0e1a 100%)',
        border: '1px solid rgba(247,147,26,0.18)',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.7)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="dialog"
      aria-label="Support chat">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--gradient-gold)' }}>
            <MessageCircle className="w-4 h-4" style={{ color: 'var(--primary-foreground)' }} />
          </div>
          <div>
            <div className="text-sm font-bold text-white">CoinTap Support</div>
            <div className="text-[10px] flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              We're online
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setOpen(false)} aria-label="Minimize"
            className="p-2 rounded-lg hover:opacity-80 active:scale-95 transition-transform"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ background: 'rgba(0,0,0,0.15)' }}>
        {messages.length === 0 && (
          <div className="text-center text-xs py-8" style={{ color: 'var(--muted-foreground)' }}>
            Send us a message — we typically reply in a few minutes.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Soft contact prompt (anonymous users after 3 messages) */}
      {showContactPrompt && (
        <div className="px-4 py-3 space-y-2 animate-slide-up"
          style={{ background: 'rgba(247,147,26,0.06)', borderTop: '1px solid rgba(247,147,26,0.18)' }}>
          <div className="text-xs font-semibold text-white">Mind sharing your name & email?</div>
          <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
            So we can follow up if we get disconnected.
          </div>
          <input type="text" placeholder="Your name (optional)"
            value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-xs text-white"
            style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <input type="email" placeholder="your@email.com (optional)"
            value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-xs text-white"
            style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <div className="flex gap-2">
            <button onClick={submitContact}
              className="flex-1 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
              Save
            </button>
            <button onClick={() => { setShowContactPrompt(false); localStorage.setItem(CONTACT_DISMISSED_KEY, '1') }}
              className="px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)' }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="px-4 py-2 text-[11px] flex items-center justify-between"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-2"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Send box */}
      <div className="p-3 flex items-end gap-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={conv?.status === 'closed' ? 'This conversation is closed' : 'Type a message…'}
          disabled={conv?.status === 'closed'}
          rows={1}
          maxLength={2000}
          className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white resize-none max-h-24 disabled:opacity-50"
          style={{ background: 'rgba(30,37,53,0.8)', border: '1px solid rgba(255,255,255,0.08)' }} />
        <button onClick={send}
          disabled={!draft.trim() || sending || conv?.status === 'closed'}
          aria-label="Send"
          className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-transform active:scale-95"
          style={{ background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.sender === 'user'
  const isSystem = msg.sender === 'system'

  if (isSystem) {
    return (
      <div className="text-center text-[11px] italic px-4"
        style={{ color: 'var(--muted-foreground)' }}>
        {msg.body}
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%] flex flex-col gap-0.5">
        <div className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${isUser ? 'rounded-br-md' : 'rounded-bl-md'}`}
          style={isUser
            ? { background: 'var(--gradient-gold)', color: 'var(--primary-foreground)' }
            : { background: 'rgba(30,37,53,0.9)', color: 'white', border: '1px solid rgba(255,255,255,0.05)' }
          }>
          {msg.body}
        </div>
        <div className={`text-[10px] px-1 ${isUser ? 'text-right' : 'text-left'}`}
          style={{ color: 'var(--muted-foreground)' }}>
          {formatTime(msg.created_at)}
        </div>
      </div>
    </div>
  )
}
