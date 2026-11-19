import { publishTokens, Tokens } from './auth-context'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
const STORAGE_KEY = 'splitmate_tokens'
let refreshInFlight: Promise<string | null> | null = null

export interface Group { id: number; group_name: string; description?: string; created_by: number; created_at: string }
export interface ExpenseSplitInput { user: number; owed_amount: number }
export interface Expense { id?: number; group: number; paid_by: number; description: string; total_amount: number; category: string; splits: ExpenseSplitInput[]; receipt_image?: string | null }
export interface Balance { user_id: number; username: string; total_paid: number; total_owed: number; net_balance: number }
export interface SettleUpTxn { from_user: number; to_user: number; amount: number }
export interface Settlement { id?: number; group: number; from_user: number; to_user: number; amount: number; status?: string }
export interface Payment { id?: number; settlement: number; settlement_detail?: { id: number; group: number; from_user: number; from_username: string; to_user: number; to_username: string; amount: string }; amount_paid: number; payment_date?: string; payment_method: string; receipt_image?: string | null }

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const send = (accessToken?: string) => {
    const headers = new Headers(options.headers)
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
    return fetch(`${BASE_URL}${path}`, { ...options, headers })
  }
  let res = await send(token)
  if (res.status === 401 && token && typeof window !== 'undefined') {
    const access = await refreshAccessToken()
    if (access) res = await send(access)
    else publishTokens(null)
    if (res.status === 401) publishTokens(null)
  }
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as Partial<Tokens> | null
      if (!saved?.refresh) return null
      const response = await fetch(`${BASE_URL}/token/refresh/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: saved.refresh }),
      })
      if (!response.ok) return null
      const body = await response.json() as { access: string; refresh?: string }
      const next = { access: body.access, refresh: body.refresh ?? saved.refresh }
      publishTokens(next)
      return next.access
    } catch { return null }
    finally { refreshInFlight = null }
  })()
  return refreshInFlight
}

export const register = (data: { username: string; email: string; password: string }) => request('/register/', { method: 'POST', body: JSON.stringify(data) })
export const login = (data: { username: string; password: string }) => request<{ access: string; refresh: string }>('/token/', { method: 'POST', body: JSON.stringify(data) })
export const refreshToken = (refresh: string) => request<{ access: string }>('/token/refresh/', { method: 'POST', body: JSON.stringify({ refresh }) })
export const getMe = (token: string) => request<{ id: number; username: string; email: string }>('/me/', {}, token)
export const getGroups = (token: string) => request<Group[]>('/groups/', {}, token)
export const discoverGroups = (token: string, search = '') => request<Group[]>(`/groups/discover/${search ? `?search=${encodeURIComponent(search)}` : ''}`, {}, token)
export const joinGroup = (token: string, groupId: number) => request(`/groups/${groupId}/join/`, { method: 'POST' }, token)
export const deleteGroup = (token: string, groupId: number) => request<void>(`/groups/${groupId}/`, { method: 'DELETE' }, token)
export const createGroup = (token: string, data: { group_name: string }) => request<Group>('/groups/', { method: 'POST', body: JSON.stringify(data) }, token)
export const addGroupMember = (token: string, data: { group: number; user: number }) => request('/group-members/', { method: 'POST', body: JSON.stringify(data) }, token)
export const getGroupMembers = (token: string, groupId: number) => request<{ id: number; group: number; user: number; username: string; role: string }[]>(`/group-members/?group=${groupId}`, {}, token)
export const searchUsers = (token: string, search: string) => request<{ id: number; username: string }[]>(`/users/?search=${encodeURIComponent(search)}`, {}, token)
export const getProfile = (token: string) => request<{ id: number; username: string; email: string }>('/me/', {}, token)
export const updateProfile = (token: string, data: { username?: string; email?: string }) => request<{ id: number; username: string; email: string }>('/me/', { method: 'PATCH', body: JSON.stringify(data) }, token)
export const getExpenses = (token: string, groupId?: number) => request<Expense[]>(`/expenses/${groupId ? `?group=${groupId}` : ''}`, {}, token)
export const addExpense = (token: string, data: Expense, receipt?: File | null) => {
  if (!receipt) return request<Expense>('/expenses/', { method: 'POST', body: JSON.stringify(data) }, token)
  const form = new FormData()
  form.set('group', String(data.group)); form.set('paid_by', String(data.paid_by))
  form.set('description', data.description); form.set('total_amount', String(data.total_amount))
  form.set('category', data.category); form.set('splits', JSON.stringify(data.splits)); form.set('receipt_image', receipt)
  return request<Expense>('/expenses/', { method: 'POST', body: form }, token)
}
export const getBalances = (token: string, groupId: number) => request<Balance[]>(`/groups/${groupId}/balances/`, {}, token)
export const getSettleUp = (token: string, groupId: number) => request<SettleUpTxn[]>(`/groups/${groupId}/settle-up/`, {}, token)
export const createSettlement = (token: string, data: Settlement) => request<Settlement>('/settlements/', { method: 'POST', body: JSON.stringify(data) }, token)
export const recordPayment = (token: string, data: Payment, receipt?: File | null) => {
  if (!receipt) return request<Payment>('/payments/', { method: 'POST', body: JSON.stringify(data) }, token)
  const form = new FormData()
  form.set('settlement', String(data.settlement)); form.set('amount_paid', String(data.amount_paid))
  form.set('payment_method', data.payment_method); form.set('receipt_image', receipt)
  return request<Payment>('/payments/', { method: 'POST', body: form }, token)
}
export const getPayments = (token: string) => request<Payment[]>('/payments/', {}, token)

export function mediaUrl(path?: string | null) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return `${BASE_URL.replace(/\/api\/?$/, '')}${path.startsWith('/') ? path : `/${path}`}`
}
