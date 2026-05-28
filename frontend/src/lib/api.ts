// ─────────────────────────────────────────────────────────────
// CoinTap API client — talks to the Flask backend.
//
// All requests go through `api()`, which:
//   • prefixes /api
//   • attaches the JWT access token
//   • auto-refreshes the token on 401 and retries once
//   • throws a friendly Error on failure
//
// Tokens are stored in localStorage. In production behind HTTPS you
// may move these to httpOnly cookies, but for a JWT SPA this is standard.
// ─────────────────────────────────────────────────────────────

const ACCESS_KEY = 'cointap_access'
const REFRESH_KEY = 'cointap_refresh'

export const tokens = {
  get access() { return localStorage.getItem(ACCESS_KEY) },
  get refresh() { return localStorage.getItem(REFRESH_KEY) },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function rawFetch(path: string, options: RequestInit = {}, useAuth = true): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (useAuth && tokens.access) {
    headers['Authorization'] = `Bearer ${tokens.access}`
  }
  return fetch(`/api${path}`, { ...options, headers })
}

async function tryRefresh(): Promise<boolean> {
  if (!tokens.refresh) return false
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.refresh}`,
      },
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data.access_token) {
      tokens.set(data.access_token)
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Core request helper. Returns parsed JSON, throws ApiError on failure.
 */
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
  useAuth = true,
): Promise<T> {
  let res = await rawFetch(path, options, useAuth)

  // Auto-refresh on 401, retry once
  if (res.status === 401 && useAuth && tokens.refresh) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      res = await rawFetch(path, options, useAuth)
    } else {
      tokens.clear()
    }
  }

  let body: any = null
  try { body = await res.json() } catch { /* no body */ }

  if (!res.ok) {
    const message = body?.error || body?.msg || `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }
  return body as T
}

// Convenience verbs
export const http = {
  get: <T = any>(path: string) => api<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, body?: any, useAuth = true) =>
    api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }, useAuth),
  put: <T = any>(path: string, body?: any) =>
    api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T = any>(path: string) => api<T>(path, { method: 'DELETE' }),
}

// ─── Typed endpoint wrappers ─────────────────────────────────

export interface ApiUser {
  id: number
  full_name: string
  email: string
  phone: string
  referral_code: string
  promo_code?: string
  role: 'user' | 'admin'
  is_active: boolean
  created_at: string
}

export const authApi = {
  async register(input: { full_name: string; email: string; phone: string; password: string; promo_code?: string }) {
    const data = await http.post<{ ok: boolean; user: ApiUser; access_token: string; refresh_token: string }>(
      '/auth/register', input, false,
    )
    tokens.set(data.access_token, data.refresh_token)
    return data.user
  },

  async login(email: string, password: string) {
    const data = await http.post<{ ok: boolean; user: ApiUser; access_token: string; refresh_token: string }>(
      '/auth/login', { email, password }, false,
    )
    tokens.set(data.access_token, data.refresh_token)
    return data.user
  },

  async me() {
    const data = await http.get<{ ok: boolean; user: ApiUser }>('/auth/me')
    return data.user
  },

  async updateProfile(input: { full_name?: string; phone?: string; password?: string }) {
    const data = await http.put<{ ok: boolean; user: ApiUser }>('/auth/me', input)
    return data.user
  },

  logout() {
    tokens.clear()
  },

  isAuthenticated() {
    return !!tokens.access
  },
}

export const walletApi = {
  get: () => http.get('/wallet/').then((d) => d.wallet),
  transactions: (page = 1) => http.get(`/wallet/transactions?page=${page}`),
  initiateDeposit: (amount: number, phone: string) =>
    http.post('/wallet/deposit/initiate', { amount, phone }),
}

export const plansApi = {
  list: () => http.get('/plans/').then((d) => d.plans),
}

export const ordersApi = {
  buy: (plan_id: number, amount: number) => http.post('/orders/buy', { plan_id, amount }),
  list: () => http.get('/orders/').then((d) => d.orders),
}

export const withdrawalsApi = {
  request: (amount: number, phone: string) => http.post('/withdrawals/request', { amount, phone }),
  list: () => http.get('/withdrawals/').then((d) => d.withdrawals),
}

export const poolApi = {
  status: () => http.get('/pool/status'),
}

export const referralsApi = {
  list: () => http.get('/referrals/'),
}

export const adminApi = {
  dashboard: () => http.get('/admin/dashboard'),
  users: (page = 1, q = '') => http.get(`/admin/users?page=${page}&q=${encodeURIComponent(q)}`),
  adjustWallet: (userId: number, amount: number, description: string) =>
    http.put(`/admin/users/${userId}/wallet`, { amount, description }),
  orders: (status = '') => http.get(`/admin/orders${status ? `?status=${status}` : ''}`),
  forceMature: (orderId: number) => http.put(`/admin/orders/${orderId}/force-mature`),
  withdrawals: (status = '') => http.get(`/admin/withdrawals${status ? `?status=${status}` : ''}`),
  approveWithdrawal: (id: number) => http.put(`/admin/withdrawals/${id}/approve`),
  rejectWithdrawal: (id: number, reason = '') => http.put(`/admin/withdrawals/${id}/reject`, { reason }),
  createPlan: (plan: any) => http.post('/admin/plans', plan),
  updatePlan: (id: number, plan: any) => http.put(`/admin/plans/${id}`, plan),
  updatePool: (pool: any) => http.put('/admin/pool', pool),
  releaseBatch: () => http.post('/admin/pool/release-batch'),
}

export { ApiError }
