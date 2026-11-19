// frontend/lib/api.ts


const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface Group { id: number; group_name: string; created_by: number; created_at: string; }
export interface ExpenseSplitInput { user: number; owed_amount: number; }
export interface Expense { id?: number; group: number; paid_by: number; description: string; total_amount: number; category: string; splits: ExpenseSplitInput[]; }
export interface Balance { user_id: number; username: string; total_paid: number; total_owed: number; net_balance: number; }
export interface SettleUpTxn { from_user: number; to_user: number; amount: number; }

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const register = (data: { username: string; email: string; password: string }) =>
  request('/register/', { method: 'POST', body: JSON.stringify(data) });

export const login = (data: { username: string; password: string }) =>
  request<{ access: string; refresh: string }>('/token/', { method: 'POST', body: JSON.stringify(data) });

export const getGroups = (token: string) => request<Group[]>('/groups/', {}, token);
export const createGroup = (token: string, data: { group_name: string }) =>
  request<Group>('/groups/', { method: 'POST', body: JSON.stringify(data) }, token);

export const addGroupMember = (token: string, data: { group: number; user: number }) =>
  request('/group-members/', { method: 'POST', body: JSON.stringify(data) }, token);

export const getExpenses = (token: string, groupId?: number) =>
  request<Expense[]>(`/expenses/${groupId ? `?group=${groupId}` : ''}`, {}, token);

export const addExpense = (token: string, data: Expense) =>
  request<Expense>('/expenses/', { method: 'POST', body: JSON.stringify(data) }, token);

export const getBalances = (token: string, groupId: number) =>
  request<Balance[]>(`/groups/${groupId}/balances/`, {}, token);

export const getSettleUp = (token: string, groupId: number) =>
  request<SettleUpTxn[]>(`/groups/${groupId}/settle-up/`, {}, token);

// --- add to lib/api.ts ---

export const refreshToken = (refresh: string) =>
  request<{ access: string }>('/token/refresh/', { method: 'POST', body: JSON.stringify({ refresh }) });

export const getMe = (token: string) =>
  request<{ id: number; username: string; email: string }>('/me/', {}, token);

export const getGroupMembers = (token: string, groupId: number) =>
  request<{ id: number; group: number; user: number }[]>(`/group-members/?group=${groupId}`, {}, token);

export interface Settlement { id?: number; group: number; from_user: number; to_user: number; amount: number; status?: string; }
export const createSettlement = (token: string, data: Settlement) =>
  request<Settlement>('/settlements/', { method: 'POST', body: JSON.stringify(data) }, token);

export interface Payment { id?: number; settlement: number; amount_paid: number; payment_method: string; }
export const recordPayment = (token: string, data: Payment) =>
  request<Payment>('/payments/', { method: 'POST', body: JSON.stringify(data) }, token);

export const getPayments = (token: string) => request<Payment[]>('/payments/', {}, token);


export interface Payment {
  id?: number;
  settlement: number;
  settlement_detail?: { id: number; group: number; from_user: number; to_user: number; amount: string };
  amount_paid: number;
  payment_date?: string;
  payment_method: string;
}