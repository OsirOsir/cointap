// Centralized mock store for CoinTap.
// Mirrors REST endpoints so it can be swapped with Flask/PostgreSQL backend.
import { useSyncExternalStore } from 'react'

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
  admin_users: [
    { id: 'u1', full_name: 'Mary Wanjiku', email: 'mary@example.com', phone: '+254712345678', role: 'user', status: 'active', wallet_balance: 45000, total_deposited: 30000, total_earned: 15000, total_orders: 3, joined_at: Date.now() - 86400000 * 30, last_login_at: Date.now() - 3600000 },
    { id: 'u2', full_name: 'John Kamau', email: 'john@example.com', phone: '+254723456789', role: 'user', status: 'active', wallet_balance: 128000, total_deposited: 100000, total_earned: 28000, total_orders: 8, joined_at: Date.now() - 86400000 * 60, last_login_at: Date.now() - 7200000 },
    { id: 'u3', full_name: 'Grace Achieng', email: 'grace@example.com', phone: '+254734567890', role: 'user', status: 'active', wallet_balance: 8500, total_deposited: 5000, total_earned: 3500, total_orders: 2, joined_at: Date.now() - 86400000 * 7, last_login_at: Date.now() - 1800000 },
    { id: 'u4', full_name: 'Peter Otieno', email: 'peter@example.com', phone: '+254745678901', role: 'user', status: 'suspended', wallet_balance: 0, total_deposited: 12000, total_earned: 0, total_orders: 1, joined_at: Date.now() - 86400000 * 90, last_login_at: Date.now() - 86400000 * 5 },
    { id: 'u5', full_name: 'Faith Njeri', email: 'faith@example.com', phone: '+254756789012', role: 'user', status: 'active', wallet_balance: 250000, total_deposited: 200000, total_earned: 50000, total_orders: 12, joined_at: Date.now() - 86400000 * 120, last_login_at: Date.now() - 600000 },
    { id: 'u6', full_name: 'David Mwangi', email: 'david@example.com', phone: '+254767890123', role: 'user', status: 'active', wallet_balance: 18000, total_deposited: 15000, total_earned: 3000, total_orders: 2, joined_at: Date.now() - 86400000 * 15, last_login_at: Date.now() - 14400000 },
    { id: 'u7', full_name: 'Sarah Akinyi', email: 'sarah@example.com', phone: '+254778901234', role: 'user', status: 'active', wallet_balance: 75000, total_deposited: 60000, total_earned: 15000, total_orders: 5, joined_at: Date.now() - 86400000 * 45, last_login_at: Date.now() - 86400000 },
    { id: 'u8', full_name: 'James Kiprono', email: 'james@example.com', phone: '+254789012345', role: 'user', status: 'active', wallet_balance: 12000, total_deposited: 10000, total_earned: 2000, total_orders: 1, joined_at: Date.now() - 86400000 * 3, last_login_at: Date.now() - 86400000 * 2 },
  ],
  announcements: [
    { id: 'a1', title: 'Welcome to CoinTap', message: 'Start your investment journey with us today. Earn up to 95% returns!', type: 'info', is_active: true, created_at: Date.now() - 86400000 * 2 },
  ],
  activity_logs: [
    { id: 'l1', action: 'Plan Updated', target: 'Growth Plan', details: 'Profit changed from 60% to 65%', admin_email: 'admin@cointap.trade', created_at: Date.now() - 3600000 * 5 },
    { id: 'l2', action: 'User Suspended', target: 'peter@example.com', details: 'Suspicious activity', admin_email: 'admin@cointap.trade', created_at: Date.now() - 86400000 },
    { id: 'l3', action: 'Pool Released', target: 'Public Pool', details: 'Released Ksh 500,000 from reserve', admin_email: 'admin@cointap.trade', created_at: Date.now() - 7200000 },
  ],
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

  register(input: { full_name: string; email: string; phone: string; promo_code?: string }) {
    const code = 'CT' + Math.random().toString(36).slice(2, 7).toUpperCase()
    set((s) => ({
      ...s,
      user: { ...input, referral_code: code, role: 'user' },
      wallet: { balance: 0, total_deposited: 0, total_withdrawn: 0, total_earned: 0 },
    }))
  },

  login(email: string, isAdmin = false) {
    if (!state.user) {
      set((s) => ({
        ...s,
        user: {
          full_name: isAdmin ? 'Admin User' : 'Demo Investor',
          email,
          phone: '+254700000000',
          referral_code: isAdmin ? 'CTADMIN' : 'CTDEMO1',
          role: isAdmin ? 'admin' : 'user',
        },
      }))
    }
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

  requestWithdrawal(amount: number, phone: string): { ok: boolean; error?: string } {
    if (amount < state.settings.min_withdrawal)
      return { ok: false, error: `Minimum withdrawal is ${formatKsh(state.settings.min_withdrawal)}` }
    if (state.wallet.balance < amount)
      return { ok: false, error: 'Insufficient wallet balance' }
    set((s) => {
      const before = s.wallet.balance
      const after = before - amount
      const w: Withdrawal = { id: uid(), amount, phone, status: 'pending', requested_at: Date.now() }
      const tx: WalletTx = {
        id: uid(), type: 'withdrawal', direction: 'out', amount,
        balance_before: before, balance_after: after,
        status: 'pending', reference: 'WD-' + w.id,
        description: `Withdrawal to ${phone}`, created_at: Date.now(),
      }
      return {
        ...s,
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

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(state),
    () => selector(initial),
  )
}

export const formatKsh = (n: number) =>
  'Ksh ' + Math.round(n).toLocaleString('en-KE')
