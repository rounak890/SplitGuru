'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, ReceiptText, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Balance, Expense, getBalances, getExpenses, getGroups, Group } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export default function ExpensesPage() {
  const { tokens } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!tokens?.access) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [groupRows, expenseRows] = await Promise.all([getGroups(tokens.access), getExpenses(tokens.access)])
      const balanceRows = await Promise.all(groupRows.map(group => getBalances(tokens.access, group.id)))
      setGroups(groupRows); setExpenses(expenseRows); setBalances(balanceRows.flat())
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load expenses.') }
    finally { setLoading(false) }
  }, [tokens?.access])
  useEffect(() => { void load() }, [load])
  const groupNames = useMemo(() => new Map(groups.map(group => [group.id, group.group_name])), [groups])
  const usernames = useMemo(() => new Map(balances.map(balance => [balance.user_id, balance.username])), [balances])
  const total = expenses.reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0)
  const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  return <AppShell title="Expenses"><section className="mb-6 flex flex-col justify-between gap-5 rounded-[24px] border border-[#eeedfa] bg-white p-6 sm:flex-row sm:items-center sm:p-8"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#5d52d6]"><ReceiptText size={16}/>Shared ledger</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Expenses</h1><p className="mt-2 text-sm text-[#74738a]">Expense entries from your groups.</p></div><div className="flex items-center gap-4"><div className="rounded-xl bg-[#f2f1ff] px-4 py-2.5"><p className="text-xs text-[#696880]">Recorded expenses</p><p className="text-lg font-bold">{loading ? '—' : expenses.length}</p></div><div className="rounded-xl bg-[#f2f1ff] px-4 py-2.5"><p className="text-xs text-[#696880]">Total amount</p><p className="text-lg font-bold">{loading ? '—' : money(total)}</p></div></div></section>
    {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
    {!tokens?.access && <div className="mb-5 rounded-2xl border border-[#e6e3ff] bg-[#f1efff] px-5 py-4 text-sm text-[#4f46c7]">Sign in to view your expenses. <Link href="/login" className="font-bold underline">Log in</Link></div>}
    <section className="overflow-hidden rounded-[22px] border border-[#eeedfa] bg-white"><div className="border-b border-[#f0eff8] px-5 py-4"><h2 className="font-bold">All expense records</h2></div>{loading ? <div className="space-y-3 p-5" aria-label="Loading expenses">{[0,1,2,3].map(item=><div key={item} className="h-14 animate-pulse rounded-lg bg-[#f3f2fc]"/>)}</div> : expenses.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#f7f6ff] text-xs uppercase tracking-[.09em] text-[#77778f]"><tr><th className="px-5 py-3 font-semibold">Description</th><th className="px-5 py-3 font-semibold">Group</th><th className="px-5 py-3 font-semibold">Paid by</th><th className="px-5 py-3 font-semibold">Category</th><th className="px-5 py-3 font-semibold">Amount</th><th className="px-5 py-3"/></tr></thead><tbody className="divide-y divide-[#f0eff8]">{expenses.map((expense,index)=><tr key={expense.id ?? `${expense.group}-${index}`} className="hover:bg-[#fbfaff]"><td className="px-5 py-4 font-semibold">{expense.description}</td><td className="px-5 py-4">{groupNames.get(expense.group) ?? `Group ${expense.group}`}</td><td className="px-5 py-4">{usernames.get(expense.paid_by) ?? `User ${expense.paid_by}`}</td><td className="px-5 py-4"><span className="rounded-full bg-[#eeedff] px-3 py-1 text-xs font-medium text-[#5145d1]">{expense.category}</span></td><td className="whitespace-nowrap px-5 py-4 font-semibold">{money(Number(expense.total_amount))}</td><td className="px-5 py-4"><Link href={`/groups/${expense.group}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-[#eeedff] px-3 py-2 text-xs font-semibold text-[#5145d1]">Group details <Plus size={13}/></Link></td></tr>)}</tbody></table></div> : <div className="px-5 py-14 text-center"><ReceiptText size={24} className="mx-auto text-[#6256df]"/><h2 className="mt-3 font-semibold">No expenses yet</h2><p className="mt-1 text-sm text-[#77778f]">Add an expense from a group details page.</p><Link href="/groups" className="mt-4 inline-flex rounded-xl bg-[#6256df] px-4 py-2.5 text-sm font-semibold text-white">Browse groups</Link></div>}</section>
  </AppShell>
}
