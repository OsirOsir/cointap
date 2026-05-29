// Centralized store for CoinTap.
// Real auth/wallet flows call the Flask backend via `api.ts`.
// Mock methods remain for pages not yet migrated.
import { useSyncExternalStore } from 'react'
import {
  authApi, walletApi, plansApi, ordersApi, withdrawalsApi, poolApi,
  normalizeOrder, normalizePlan, normalizeWithdrawal, normalizeWallet,
} from './api'

export type TxType =
  | 'deposit'
  | 'share_purchase'
  | 'maturity_return'
  | 'referral_bonus'
  | 'withdrawal'
  | 'withdrawal_reversal'
  | 'admin_adjustment'

export interface WalletTx {
  id: string
  type: TxType
  direction: 'in' | 'out'
  amount: number
  balance_before: number
  balance_after: number
  status: 'completed' | 'pending' | 'failed'
  reference: string
  description: string
  created_at: number
}

export interface Plan {
  id: string
  name: string
  duration_days: number
  profit_percent: number
  min_amount: number
  max_amount: number
  is_active: boolean
}

export interface Order {
  id: string
  plan_id: string
  plan_name: string
  amount_invested: number
  profit_percent: number
  expected_return: number
  status: 'active' | 'matured' | 'settled' | 'cancelled'
  starts_at: number
  matures_at: number
  settled_at?: number
}

export interface Withdrawal {
  id: string
  amount: number
  phone: string
  status: 'pending' | 'processing' | 'paid' | 'rejected'
  mpesa_reference?: string
  requested_at: number
}

export interface Referral {
  id: string
  referred_name: string
  referred_email: string
  bonus_amount: number
  status: 'pending' | 'credited'
  created_at: number
}

export interface User {
  full_name: string
  email: string
  phone: string
  referral_code: string
  role: 'user' | 'admin'
  email_verified?: boolean
  two_factor_enabled?: boolean
  two_factor_secret?: string  // demo only — would be backend-stored
  last_withdrawal_at?: number
  daily_withdrawal_total?: number
  daily_withdrawal_reset_at?: number
  flagged?: boolean              // suspicious activity flag
  flag_reason?: string
}

export interface LoginAttempt {
  email: string
  success: boolean
  timestamp: number
  ip?: string  // demo — would come from backend
}

export interface SecurityEvent {
  id: string
  type: 'login_failed' | 'login_locked' | 'login_unlocked' | 'password_changed' | '2fa_enabled' | '2fa_disabled' | 'suspicious_withdrawal' | 'rapid_withdrawals' | 'new_device' | 'large_withdrawal' | 'email_verified'
  email: string
  details: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: number
}

export interface AdminUser {
  id: string
  full_name: string
  email: string
  phone: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  wallet_balance: number
  total_deposited: number
  total_earned: number
  total_orders: number
  joined_at: number
  last_login_at: number
}

export interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'critical'
  is_active: boolean
  created_at: number
}

export interface ActivityLog {
  id: string
  action: string
  target: string
  details: string
  admin_email: string
  created_at: number
}

interface State {
  user: User | null
  wallet: { balance: number; total_deposited: number; total_withdrawn: number; total_earned: number }
  transactions: WalletTx[]
  orders: Order[]
  withdrawals: Withdrawal[]
  referrals: Referral[]
  plans: Plan[]
  pool: { public_pool_balance: number; reserve_pool_balance: number; sold_out_floor: number; batch_size: number }
  referral_earnings: number
  referrals_count: number
  settings: {
    min_deposit: number
    max_deposit: number
    min_withdrawal: number
    referral_bonus_percent: number
    sale_open: boolean
    deposits_enabled: boolean
    withdrawals_enabled: boolean
    registrations_enabled: boolean
    maintenance_mode: boolean
  }
  admin_users: AdminUser[]
  announcements: Announcement[]
  activity_logs: ActivityLog[]
  login_attempts: LoginAttempt[]
  security_events: SecurityEvent[]
  lockout_until?: number   // timestamp when lockout ends
}

const KEY = 'cointap-state-v2'

const defaultPlans: Plan[] = [
  { id: 'starter', name: 'Starter Plan', duration_days: 4, profit_percent: 30, min_amount: 500, max_amount: 20000, is_active: true },
  { id: 'growth', name: 'Growth Plan', duration_days: 8, profit_percent: 65, min_amount: 2000, max_amount: 100000, is_active: true },
  { id: 'premium', name: 'Premium Plan', duration_days: 12, profit_percent: 95, min_amount: 10000, max_amount: 500000, is_active: true },
]

const initial: State = {
  user: null,
  wallet: { balance: 0, total_deposited: 0, total_withdrawn: 0, total_earned: 0 },
  transactions: [],
  orders: [],
  withdrawals: [],
  referrals: [],
  plans: defaultPlans,
  pool: { public_pool_balance: 2_450_000, reserve_pool_balance: 8_000_000, sold_out_floor: 50_000, batch_size: 500_000 },
  referral_earnings: 0,
  referrals_count: 0,
  settings: {
    min_deposit: 10,
    max_deposit: 500000,
    min_withdrawal: 200,
    referral_bonus_percent: 3,
    sale_open: true,
    deposits_enabled: true,
    withdrawals_enabled: true,
    registrations_enabled: true,
    maintenance_mode: false,
  },
  admin_users: [],
  announcements: [],
  activity_logs: [],
  login_attempts: [],
  security_events: [],
}

function load(): State {
  if (typeof window === 'undefined') return initial
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial
    return { ...initial, ...JSON.parse(raw) }
  } catch { return initial }
}

let state: State = load()
const listeners = new Set<() => void>()

function save() {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(state))
  listeners.forEach((l) => l())
}

function set(updater: (s: State) => State) { state = updater(state); save() }

const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase()

export const store = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l) },
  get: () => state,

  // ═══════════════════════════════════════════════════════════
  // REAL API AUTH (connects to Flask backend)
  // ═══════════════════════════════════════════════════════════

  /** Register a real user via the backend. */
  async apiRegister(input: { full_name: string; email: string; phone: string; password: string; promo_code?: string }): Promise<{ ok: boolean; error?: string; user?: User }> {
    try {
      const apiUser = await authApi.register(input)
      const user: User = {
        full_name: apiUser.full_name,
        email: apiUser.email,
        phone: apiUser.phone,
        referral_code: apiUser.referral_code,
        role: apiUser.role,
        email_verified: true,
        two_factor_enabled: false,
      }
      set((s) => ({ ...s, user }))
      await store.apiLoadWallet()
      return { ok: true, user }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Registration failed' }
    }
  },

  /** Login a real user via the backend. */
  async apiLogin(email: string, password: string): Promise<{ ok: boolean; error?: string; user?: User }> {
    try {
      const apiUser = await authApi.login(email, password)
      const user: User = {
        full_name: apiUser.full_name,
        email: apiUser.email,
        phone: apiUser.phone,
        referral_code: apiUser.referral_code,
        role: apiUser.role,
        email_verified: true,
        two_factor_enabled: false,
      }
      set((s) => ({ ...s, user }))
      await store.apiLoadWallet()
      return { ok: true, user }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Invalid email or password' }
    }
  },

  /** Restore session on app load (if a valid token exists). */
  async apiRestoreSession(): Promise<boolean> {
    if (!authApi.isAuthenticated()) return false
    try {
      const apiUser = await authApi.me()
      const user: User = {
        full_name: apiUser.full_name,
        email: apiUser.email,
        phone: apiUser.phone,
        referral_code: apiUser.referral_code,
        role: apiUser.role,
        email_verified: true,
        two_factor_enabled: false,
      }
      set((s) => ({ ...s, user }))
      await store.apiLoadWallet()
      return true
    } catch {
      authApi.logout()
      return false
    }
  },

  /** Fetch the current user's wallet from the backend. */
  async apiLoadWallet() {
    try {
      const w = await walletApi.get()
      set((s) => ({ ...s, wallet: normalizeWallet(w) }))
    } catch { /* wallet load failed silently */ }
  },

  /** Load the active plans from the backend. */
  async apiLoadPlans() {
    try {
      const plans = await plansApi.list()
      set((s) => ({ ...s, plans: (plans || []).map(normalizePlan) }))
    } catch { /* ignore */ }
  },

  /** Load the current user's orders from the backend. */
  async apiLoadOrders() {
    try {
      const orders = await ordersApi.list()
      set((s) => ({ ...s, orders: (orders || []).map(normalizeOrder) }))
    } catch { /* ignore */ }
  },

  /** Load the current user's withdrawals from the backend. */
  async apiLoadWithdrawals() {
    try {
      const wds = await withdrawalsApi.list()
      set((s) => ({ ...s, withdrawals: (wds || []).map(normalizeWithdrawal) }))
    } catch { /* ignore */ }
  },

  /** Load the live pool status from the backend. */
  async apiLoadPool() {
    try {
      const data = await poolApi.status()
      const p = data.pool || data
      set((s) => ({
        ...s,
        pool: {
          public_pool_balance: Number(p.public_pool_balance ?? 0),
          reserve_pool_balance: Number(p.reserve_pool_balance ?? 0),
          sold_out_floor: Number(p.sold_out_floor ?? 0),
          batch_size: Number(p.batch_release_amount ?? p.batch_size ?? 0),
        },
      }))
    } catch { /* ignore */ }
  },

  /** Load everything a logged-in user needs in one call. */
  async apiLoadAll() {
    await Promise.all([
      store.apiLoadWallet(),
      store.apiLoadPlans(),
      store.apiLoadOrders(),
      store.apiLoadWithdrawals(),
      store.apiLoadPool(),
    ])
  },

  /** Buy shares via the backend, then refresh wallet + orders + pool. */
  async apiBuyShares(planId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
    try {
      await ordersApi.buy(Number(planId), amount)
      await Promise.all([store.apiLoadWallet(), store.apiLoadOrders(), store.apiLoadPool()])
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Purchase failed' }
    }
  },

  /** Request a withdrawal via the backend, then refresh wallet + withdrawals. */
  async apiRequestWithdrawal(amount: number, phone: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await withdrawalsApi.request(amount, phone)
      await Promise.all([store.apiLoadWallet(), store.apiLoadWithdrawals()])
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Withdrawal request failed' }
    }
  },

  /** Initiate an M-Pesa deposit (STK push) via the backend. */
  async apiInitiateDeposit(amount: number, phone: string): Promise<{ ok: boolean; error?: string; message?: string }> {
    try {
      const res = await walletApi.initiateDeposit(amount, phone)
      return { ok: true, message: res.message || 'M-Pesa prompt sent to your phone' }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Deposit failed' }
    }
  },

  /** Update profile via the backend. */
  async apiUpdateProfile(input: { full_name?: string; phone?: string; password?: string }): Promise<{ ok: boolean; error?: string }> {
    try {
      const apiUser = await authApi.updateProfile(input)
      set((s) => s.user ? {
        ...s,
        user: { ...s.user, full_name: apiUser.full_name, phone: apiUser.phone },
      } : s)
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Update failed' }
    }
  },

  /** Real logout — clears tokens + user. */
  apiLogout() {
    authApi.logout()
    set((s) => ({ ...s, user: null }))
  },

  // ═══════════════════════════════════════════════════════════
  // DEMO / MOCK methods below (kept for pages not yet migrated)
  // ═══════════════════════════════════════════════════════════

  register(input: { full_name: string; email: string; phone: string; promo_code?: string }) {
    const code = 'CT' + Math.random().toString(36).slice(2, 7).toUpperCase()
    set((s) => ({
      ...s,
      user: {
        ...input,
        referral_code: code,
        role: 'user',
        email_verified: false,
        two_factor_enabled: false,
      },
      wallet: { balance: 0, total_deposited: 0, total_withdrawn: 0, total_earned: 0 },
    }))
  },

  // Secure login with attempt tracking and lockout
  login(email: string, isAdmin = false): { ok: boolean; error?: string; locked_until?: number; requires_2fa?: boolean } {
    const now = Date.now()

    // Check lockout
    if (state.lockout_until && now < state.lockout_until) {
      const minutesLeft = Math.ceil((state.lockout_until - now) / 60000)
      return { ok: false, error: `Account locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`, locked_until: state.lockout_until }
    }

    // Count recent failed attempts for this email (within last 15 minutes)
    const fifteenMinsAgo = now - 15 * 60_000
    const recentFails = state.login_attempts.filter(
      (a) => a.email.toLowerCase() === email.toLowerCase() && !a.success && a.timestamp > fifteenMinsAgo
    ).length

    // Demo: simulate that very specific email "blocked@test.com" always fails
    const willFail = email.toLowerCase() === 'blocked@test.com'
    const newAttempt: LoginAttempt = { email, success: !willFail, timestamp: now }

    if (willFail) {
      set((s) => ({ ...s, login_attempts: [newAttempt, ...s.login_attempts].slice(0, 100) }))
      const remaining = 5 - (recentFails + 1)

      if (recentFails + 1 >= 5) {
        // Lock the account
        const lockUntil = now + 15 * 60_000
        set((s) => ({ ...s, lockout_until: lockUntil }))
        logSecurityEvent('login_locked', email, 'Account locked after 5 failed login attempts in 15 minutes', 'critical')
        return { ok: false, error: 'Account locked for 15 minutes due to too many failed attempts.', locked_until: lockUntil }
      }

      logSecurityEvent('login_failed', email, `Failed attempt (${recentFails + 1}/5)`, recentFails >= 2 ? 'warning' : 'info')
      return { ok: false, error: `Invalid credentials. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before lockout.` }
    }

    // Success — clear lockout, record success
    set((s) => ({
      ...s,
      login_attempts: [newAttempt, ...s.login_attempts].slice(0, 100),
      lockout_until: undefined,
      user: s.user || {
        full_name: isAdmin ? 'Admin User' : 'Demo Investor',
        email,
        phone: '+254700000000',
        referral_code: isAdmin ? 'CTADMIN' : 'CTDEMO1',
        role: isAdmin ? 'admin' : 'user',
        email_verified: isAdmin ? true : false,
        two_factor_enabled: isAdmin ? true : false,
      },
    }))

    // If 2FA enabled, signal that
    if (state.user?.two_factor_enabled) {
      return { ok: true, requires_2fa: true }
    }

    return { ok: true }
  },

  verify2FA(code: string): { ok: boolean; error?: string } {
    // Demo: accept "123456" or "000000" as valid TOTP
    if (code === '123456' || code === '000000') {
      return { ok: true }
    }
    logSecurityEvent('login_failed', state.user?.email || 'unknown', 'Invalid 2FA code', 'warning')
    return { ok: false, error: 'Invalid 2FA code. Try 123456 in demo mode.' }
  },

  enable2FA() {
    const secret = Array.from({ length: 16 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]).join('')
    set((s) => s.user ? { ...s, user: { ...s.user, two_factor_enabled: true, two_factor_secret: secret } } : s)
    logSecurityEvent('2fa_enabled', state.user?.email || 'unknown', 'Two-factor authentication enabled', 'info')
  },

  disable2FA() {
    set((s) => s.user ? { ...s, user: { ...s.user, two_factor_enabled: false, two_factor_secret: undefined } } : s)
    logSecurityEvent('2fa_disabled', state.user?.email || 'unknown', 'Two-factor authentication disabled', 'warning')
  },

  verifyEmail() {
    set((s) => s.user ? { ...s, user: { ...s.user, email_verified: true } } : s)
    logSecurityEvent('email_verified', state.user?.email || 'unknown', 'Email address verified', 'info')
  },

  /**
   * Demo Google OAuth — in production this receives the JWT credential from
   * Google Identity Services and decodes it server-side.
   *
   * @param mockProfile Optional override — when not provided we use a demo profile
   */
  loginWithGoogle(mockProfile?: { name: string; email: string; picture?: string }): {
    ok: boolean
    isNewUser: boolean
    error?: string
  } {
    // Simulate decoded Google profile
    const profile = mockProfile || {
      name: 'Demo Google User',
      email: 'demo.google@gmail.com',
      picture: '',
    }

    const isAdmin = profile.email.toLowerCase().includes('admin')
    const code = 'CT' + Math.random().toString(36).slice(2, 7).toUpperCase()

    // Check if "existing" user (in real backend this is a lookup)
    const isNewUser = !state.user || state.user.email !== profile.email.toLowerCase()

    set((s) => ({
      ...s,
      user: {
        full_name: profile.name,
        email: profile.email.toLowerCase().trim(),
        phone: s.user?.phone || '',  // phone may need to be added later
        referral_code: s.user?.referral_code || code,
        role: isAdmin ? 'admin' : 'user',
        email_verified: true,        // Google emails are pre-verified
        two_factor_enabled: s.user?.two_factor_enabled || false,
      },
      // Only initialise wallet on first login
      wallet: isNewUser
        ? { balance: 0, total_deposited: 0, total_withdrawn: 0, total_earned: 0 }
        : s.wallet,
    }))

    logSecurityEvent(
      'email_verified',
      profile.email,
      isNewUser ? 'New account created via Google OAuth' : 'Logged in via Google OAuth',
      'info'
    )

    return { ok: true, isNewUser }
  },

  clearLockout() {
    set((s) => ({ ...s, lockout_until: undefined, login_attempts: [] }))
    logSecurityEvent('login_unlocked', state.user?.email || 'admin@cointap.trade', 'Lockout manually cleared by admin', 'info')
  },

  logout() { set((s) => ({ ...s, user: null })) },

  updateProfile(updates: Partial<Pick<User, 'full_name' | 'email' | 'phone'>>) {
    set((s) => s.user ? { ...s, user: { ...s.user, ...updates } } : s)
    logActivity('Profile Updated', state.user?.email || 'unknown', Object.keys(updates).join(', '))
  },

  changePassword(_currentPassword: string, _newPassword: string): { ok: boolean; error?: string } {
    // In demo, any current password works. In production, validate against backend.
    if (!_newPassword || _newPassword.length < 6) {
      return { ok: false, error: 'New password must be at least 6 characters' }
    }
    logActivity('Password Changed', state.user?.email || 'unknown', 'User updated their password')
    return { ok: true }
  },

  deposit(amount: number) {
    set((s) => {
      const before = s.wallet.balance
      const after = before + amount
      const tx: WalletTx = {
        id: uid(), type: 'deposit', direction: 'in', amount,
        balance_before: before, balance_after: after,
        status: 'completed', reference: 'MPESA-' + uid(),
        description: 'M-Pesa deposit', created_at: Date.now(),
      }
      return {
        ...s,
        wallet: { ...s.wallet, balance: after, total_deposited: s.wallet.total_deposited + amount },
        transactions: [tx, ...s.transactions],
      }
    })
  },

  buyShares(plan: Plan, amount: number): { ok: boolean; error?: string } {
    if (amount < plan.min_amount) return { ok: false, error: `Minimum investment is ${formatKsh(plan.min_amount)}` }
    if (amount > plan.max_amount) return { ok: false, error: `Maximum investment is ${formatKsh(plan.max_amount)}` }
    if (state.wallet.balance < amount) return { ok: false, error: 'Insufficient wallet balance. Please deposit first.' }
    if (state.pool.public_pool_balance < amount) return { ok: false, error: 'Share pool sold out. Please wait for next batch.' }

    set((s) => {
      const before = s.wallet.balance
      const after = before - amount
      const expected = amount + (amount * plan.profit_percent) / 100
      const now = Date.now()
      const matures = now + plan.duration_days * 24 * 3600 * 1000
      const order: Order = {
        id: uid(), plan_id: plan.id, plan_name: plan.name,
        amount_invested: amount, profit_percent: plan.profit_percent,
        expected_return: expected, status: 'active',
        starts_at: now, matures_at: matures,
      }
      const tx: WalletTx = {
        id: uid(), type: 'share_purchase', direction: 'out', amount,
        balance_before: before, balance_after: after,
        status: 'completed', reference: 'ORD-' + order.id,
        description: `Purchase — ${plan.name}`, created_at: now,
      }
      return {
        ...s,
        wallet: { ...s.wallet, balance: after },
        orders: [order, ...s.orders],
        transactions: [tx, ...s.transactions],
        pool: { ...s.pool, public_pool_balance: s.pool.public_pool_balance - amount },
      }
    })
    return { ok: true }
  },

  settleMaturedOrders() {
    const now = Date.now()
    const matured = state.orders.filter((o) => o.status === 'active' && o.matures_at <= now)
    if (matured.length === 0) return
    set((s) => {
      let balance = s.wallet.balance
      let earned = s.wallet.total_earned
      const txs: WalletTx[] = []
      const orders = s.orders.map((o) => {
        if (o.status === 'active' && o.matures_at <= now) {
          const before = balance
          balance += o.expected_return
          earned += o.expected_return - o.amount_invested
          txs.push({
            id: uid(), type: 'maturity_return', direction: 'in',
            amount: o.expected_return, balance_before: before, balance_after: balance,
            status: 'completed', reference: 'MAT-' + o.id,
            description: `Maturity Return — ${o.plan_name}`, created_at: now,
          })
          return { ...o, status: 'settled' as const, settled_at: now }
        }
        return o
      })
      return {
        ...s, orders,
        wallet: { ...s.wallet, balance, total_earned: earned },
        transactions: [...txs, ...s.transactions],
      }
    })
  },

  requestWithdrawal(amount: number, phone: string, twoFactorCode?: string): { ok: boolean; error?: string; requires_2fa?: boolean; requires_email_verification?: boolean } {
    const now = Date.now()
    const user = state.user

    // 1. Email verification required for withdrawals
    if (user && !user.email_verified) {
      return { ok: false, error: 'Please verify your email before withdrawing.', requires_email_verification: true }
    }

    // 2. Account flagged?
    if (user?.flagged) {
      return { ok: false, error: `Account flagged for review: ${user.flag_reason || 'Suspicious activity'}. Contact support.` }
    }

    // 3. Basic validation
    if (amount < state.settings.min_withdrawal)
      return { ok: false, error: `Minimum withdrawal is ${formatKsh(state.settings.min_withdrawal)}` }
    if (state.wallet.balance < amount)
      return { ok: false, error: 'Insufficient wallet balance' }

    // 4. 24-hour cooldown after a withdrawal (skip for very first withdrawal)
    const COOLDOWN_MS = 60 * 60_000  // 1h cooldown demo (24h in production)
    if (user?.last_withdrawal_at && (now - user.last_withdrawal_at) < COOLDOWN_MS) {
      const minutesLeft = Math.ceil((COOLDOWN_MS - (now - user.last_withdrawal_at)) / 60_000)
      return { ok: false, error: `Withdrawal cooldown active. Please wait ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.` }
    }

    // 5. Daily limit check (Ksh 500,000 per 24h)
    const DAILY_LIMIT = 500_000
    const dayWindow = 24 * 60 * 60_000
    let dailyTotal = user?.daily_withdrawal_total || 0
    if (!user?.daily_withdrawal_reset_at || (now - user.daily_withdrawal_reset_at) > dayWindow) {
      dailyTotal = 0
    }
    if ((dailyTotal + amount) > DAILY_LIMIT) {
      const remaining = DAILY_LIMIT - dailyTotal
      return { ok: false, error: `Daily withdrawal limit is ${formatKsh(DAILY_LIMIT)}. Remaining today: ${formatKsh(remaining)}.` }
    }

    // 6. 2FA required for amounts over Ksh 5,000
    const TWOFA_THRESHOLD = 5_000
    if (amount >= TWOFA_THRESHOLD) {
      if (!twoFactorCode) {
        return { ok: false, error: '2FA verification required for this amount.', requires_2fa: true }
      }
      const verify = store.verify2FA(twoFactorCode)
      if (!verify.ok) {
        return { ok: false, error: verify.error || 'Invalid 2FA code' }
      }
    }

    // 7. Large-withdrawal flagging (50K+)
    const LARGE_THRESHOLD = 50_000
    if (amount >= LARGE_THRESHOLD) {
      logSecurityEvent('large_withdrawal', user?.email || 'unknown',
        `Large withdrawal of ${formatKsh(amount)} to ${phone}`, 'warning')
    }

    // 8. Rapid-withdrawal detection (3+ in last 10 minutes)
    const tenMinsAgo = now - 10 * 60_000
    const recent = state.withdrawals.filter((w) => w.requested_at > tenMinsAgo).length
    if (recent >= 2) {
      logSecurityEvent('rapid_withdrawals', user?.email || 'unknown',
        `${recent + 1} withdrawals in 10 minutes — flagged for review`, 'critical')
    }

    // 9. All checks passed — process withdrawal
    set((s) => {
      const before = s.wallet.balance
      const after = before - amount
      const w: Withdrawal = { id: uid(), amount, phone, status: 'pending', requested_at: now }
      const tx: WalletTx = {
        id: uid(), type: 'withdrawal', direction: 'out', amount,
        balance_before: before, balance_after: after,
        status: 'pending', reference: 'WD-' + w.id,
        description: `Withdrawal to ${phone}`, created_at: now,
      }
      return {
        ...s,
        user: s.user ? {
          ...s.user,
          last_withdrawal_at: now,
          daily_withdrawal_total: dailyTotal + amount,
          daily_withdrawal_reset_at: s.user.daily_withdrawal_reset_at && (now - s.user.daily_withdrawal_reset_at) < dayWindow
            ? s.user.daily_withdrawal_reset_at
            : now,
        } : null,
        wallet: { ...s.wallet, balance: after, total_withdrawn: s.wallet.total_withdrawn + amount },
        withdrawals: [w, ...s.withdrawals],
        transactions: [tx, ...s.transactions],
      }
    })
    return { ok: true }
  },

  // Admin actions
  adminApproveWithdrawal(id: string) {
    set((s) => ({
      ...s,
      withdrawals: s.withdrawals.map((w) =>
        w.id === id ? { ...w, status: 'paid' as const, mpesa_reference: 'B2C-' + uid() } : w
      ),
    }))
  },

  adminRejectWithdrawal(id: string) {
    const wd = state.withdrawals.find((w) => w.id === id)
    if (!wd) return
    set((s) => {
      const before = s.wallet.balance
      const after = before + wd.amount
      const tx: WalletTx = {
        id: uid(), type: 'withdrawal_reversal', direction: 'in', amount: wd.amount,
        balance_before: before, balance_after: after,
        status: 'completed', reference: 'REV-' + id,
        description: 'Withdrawal reversal', created_at: Date.now(),
      }
      return {
        ...s,
        wallet: { ...s.wallet, balance: after },
        withdrawals: s.withdrawals.map((w) => w.id === id ? { ...w, status: 'rejected' as const } : w),
        transactions: [tx, ...s.transactions],
      }
    })
  },

  adminReleaseBatch() {
    set((s) => {
      const batch = Math.min(s.pool.batch_size, s.pool.reserve_pool_balance)
      return {
        ...s,
        pool: {
          ...s.pool,
          public_pool_balance: s.pool.public_pool_balance + batch,
          reserve_pool_balance: s.pool.reserve_pool_balance - batch,
        },
      }
    })
  },

  adminUpdatePool(updates: Partial<State['pool']>) {
    set((s) => ({ ...s, pool: { ...s.pool, ...updates } }))
  },

  adminUpdatePlan(id: string, updates: Partial<Plan>) {
    set((s) => ({
      ...s,
      plans: s.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }))
  },

  adminAddPlan(plan: Omit<Plan, 'id'>) {
    set((s) => ({ ...s, plans: [...s.plans, { ...plan, id: uid() }] }))
  },

  adminCreditWallet(amount: number, description = 'Admin adjustment') {
    set((s) => {
      const before = s.wallet.balance
      const after = before + amount
      const tx: WalletTx = {
        id: uid(), type: 'admin_adjustment', direction: amount >= 0 ? 'in' : 'out',
        amount: Math.abs(amount), balance_before: before, balance_after: after,
        status: 'completed', reference: 'ADJ-' + uid(),
        description, created_at: Date.now(),
      }
      return {
        ...s,
        wallet: { ...s.wallet, balance: after },
        transactions: [tx, ...s.transactions],
      }
    })
  },

  adminForceMaturity(orderId: string) {
    set((s) => ({
      ...s,
      orders: s.orders.map((o) =>
        o.id === orderId ? { ...o, matures_at: Date.now() - 1000 } : o
      ),
    }))
    logActivity('Order Force-Matured', `Order ${orderId}`, 'Forced settlement')
  },

  updateSettings(updates: Partial<State['settings']>) {
    set((s) => ({ ...s, settings: { ...s.settings, ...updates } }))
    logActivity('Settings Updated', 'System Settings', JSON.stringify(updates))
  },

  // ── USER MANAGEMENT ────────────────────────────────────
  adminCreditUserWallet(userId: string, amount: number, reason: string) {
    set((s) => ({
      ...s,
      admin_users: s.admin_users.map((u) =>
        u.id === userId
          ? { ...u, wallet_balance: u.wallet_balance + amount, total_deposited: amount > 0 ? u.total_deposited + amount : u.total_deposited }
          : u
      ),
    }))
    const user = state.admin_users.find((u) => u.id === userId)
    logActivity(amount >= 0 ? 'User Wallet Credited' : 'User Wallet Debited', user?.email || userId, `${amount >= 0 ? '+' : ''}${amount} — ${reason}`)
  },

  adminToggleUserStatus(userId: string) {
    set((s) => ({
      ...s,
      admin_users: s.admin_users.map((u) =>
        u.id === userId ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u
      ),
    }))
    const user = state.admin_users.find((u) => u.id === userId)
    logActivity(user?.status === 'active' ? 'User Suspended' : 'User Activated', user?.email || userId, 'Status changed by admin')
  },

  adminPromoteUser(userId: string) {
    set((s) => ({
      ...s,
      admin_users: s.admin_users.map((u) =>
        u.id === userId ? { ...u, role: u.role === 'admin' ? 'user' : 'admin' } : u
      ),
    }))
    const user = state.admin_users.find((u) => u.id === userId)
    logActivity('User Role Changed', user?.email || userId, `Role: ${user?.role === 'admin' ? 'user' : 'admin'}`)
  },

  adminDeleteUser(userId: string) {
    const user = state.admin_users.find((u) => u.id === userId)
    set((s) => ({ ...s, admin_users: s.admin_users.filter((u) => u.id !== userId) }))
    logActivity('User Deleted', user?.email || userId, 'Account permanently removed')
  },

  // ── PLAN MANAGEMENT ────────────────────────────────────
  adminDeletePlan(id: string) {
    const plan = state.plans.find((p) => p.id === id)
    set((s) => ({ ...s, plans: s.plans.filter((p) => p.id !== id) }))
    logActivity('Plan Deleted', plan?.name || id, 'Plan removed')
  },

  // ── POOL MANAGEMENT ────────────────────────────────────
  adminInjectFunds(amount: number, target: 'public' | 'reserve') {
    set((s) => ({
      ...s,
      pool: {
        ...s.pool,
        [target === 'public' ? 'public_pool_balance' : 'reserve_pool_balance']:
          s.pool[target === 'public' ? 'public_pool_balance' : 'reserve_pool_balance'] + amount,
      },
    }))
    logActivity('Pool Injected', `${target} pool`, `Added Ksh ${amount.toLocaleString()}`)
  },

  // ── ANNOUNCEMENTS ──────────────────────────────────────
  adminAddAnnouncement(input: Omit<Announcement, 'id' | 'created_at'>) {
    set((s) => ({
      ...s,
      announcements: [{ ...input, id: uid(), created_at: Date.now() }, ...s.announcements],
    }))
    logActivity('Announcement Posted', input.title, input.message.slice(0, 60))
  },

  adminToggleAnnouncement(id: string) {
    set((s) => ({
      ...s,
      announcements: s.announcements.map((a) =>
        a.id === id ? { ...a, is_active: !a.is_active } : a
      ),
    }))
  },

  adminDeleteAnnouncement(id: string) {
    set((s) => ({ ...s, announcements: s.announcements.filter((a) => a.id !== id) }))
  },

  adminClearActivityLogs() {
    set((s) => ({ ...s, activity_logs: [] }))
  },
}

// Helper: log admin activity
function logActivity(action: string, target: string, details: string) {
  const log: ActivityLog = {
    id: uid(),
    action,
    target,
    details,
    admin_email: state.user?.email || 'admin@cointap.trade',
    created_at: Date.now(),
  }
  set((s) => ({ ...s, activity_logs: [log, ...s.activity_logs].slice(0, 200) }))
}

// Helper: log security event
function logSecurityEvent(type: SecurityEvent['type'], email: string, details: string, severity: SecurityEvent['severity']) {
  const event: SecurityEvent = {
    id: uid(),
    type,
    email,
    details,
    severity,
    timestamp: Date.now(),
  }
  set((s) => ({ ...s, security_events: [event, ...s.security_events].slice(0, 200) }))
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(initial),
  )
}

export const formatKsh = (n: number) =>
  'Ksh ' + Math.round(n).toLocaleString('en-KE')
