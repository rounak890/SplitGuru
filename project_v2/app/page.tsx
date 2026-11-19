'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChartNoAxesColumn, CircleDollarSign, ReceiptText, UsersRound, WalletCards } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Balance, Expense, getBalances, getExpenses, getGroups, getMe, getSettleUp, Group, SettleUpTxn } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

type GroupBalances = { groupId: number; balances: Balance[] }
type GroupSettlements = { groupId: number; transactions: SettleUpTxn[] }
const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)

export default function OverviewPage() {
  const { tokens } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [groupBalances, setGroupBalances] = useState<GroupBalances[]>([])
  const [groupSettlements, setGroupSettlements] = useState<GroupSettlements[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!tokens?.access) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [groupRows, expenseRows, me] = await Promise.all([getGroups(tokens.access), getExpenses(tokens.access), getMe(tokens.access)])
      const [balances, settleRows] = await Promise.all([
        Promise.all(groupRows.map(async group => ({ groupId: group.id, balances: await getBalances(tokens.access, group.id) }))),
        Promise.all(groupRows.map(async group => ({ groupId: group.id, transactions: await getSettleUp(tokens.access, group.id) }))),
      ])
      setGroups(groupRows); setExpenses(expenseRows); setGroupBalances(balances); setGroupSettlements(settleRows); setCurrentUserId(me.id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load overview data.') }
    finally { setLoading(false) }
  }, [tokens?.access])
  useEffect(() => { void load() }, [load])

  const totals = useMemo(() => {
    const me = groupSettlements.flatMap(item => item.transactions)
    const owed = me.filter(txn => txn.to_user === currentUserId).reduce((sum, txn) => sum + Number(txn.amount), 0)
    const owes = me.filter(txn => txn.from_user === currentUserId).reduce((sum, txn) => sum + Number(txn.amount), 0)
    return { expenses: expenses.reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0), owed, owes, net: owed - owes }
  }, [expenses, groupSettlements, currentUserId])

  const categoryTotals = useMemo(() => {
    const result = new Map<string, number>()
    expenses.forEach(expense => result.set(expense.category || 'Uncategorized', (result.get(expense.category || 'Uncategorized') ?? 0) + Number(expense.total_amount || 0)))
    return [...result.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [expenses])
  const groupNames = useMemo(() => new Map(groups.map(group => [group.id, group.group_name])), [groups])
  const usernames = useMemo(() => new Map(groupBalances.flatMap(item => item.balances.map(balance => [balance.user_id, balance.username] as const))), [groupBalances])
  const maximumCategory = Math.max(...categoryTotals.map(([, amount]) => amount), 1)
  const stats = [
    { title: 'Total group expenses', value: currency(totals.expenses), note: `${expenses.length} expense records`, icon: ReceiptText, color: 'text-[#5145d1]', tint: 'bg-[#ebe9ff]', bar: 'bg-[#6256df]', width: expenses.length ? 'w-2/3' : 'w-0' },
    { title: 'You owe', value: currency(totals.owes), note: 'From your group balances', icon: ArrowDownRight, color: 'text-[#bd3438]', tint: 'bg-[#ffe4e1]', bar: 'bg-[#ef4444]', width: totals.owes ? 'w-1/2' : 'w-0' },
    { title: 'You are owed', value: currency(totals.owed), note: 'From your group balances', icon: ArrowUpRight, color: 'text-[#08794f]', tint: 'bg-[#d9fff1]', bar: 'bg-[#10b981]', width: totals.owed ? 'w-2/3' : 'w-0' },
    { title: 'Net balance', value: currency(totals.net), note: currentUserId == null ? 'Sign in to view your balance' : totals.net >= 0 ? 'Net credit across groups' : 'Net amount to settle', icon: CircleDollarSign, color: totals.net >= 0 ? 'text-[#08794f]' : 'text-[#bd3438]', tint: totals.net >= 0 ? 'bg-[#d9fff1]' : 'bg-[#ffe4e1]', bar: totals.net >= 0 ? 'bg-[#10b981]' : 'bg-[#ef4444]', width: totals.net ? 'w-3/4' : 'w-0' },
  ]

  return <AppShell title="Overview">
    <div className="mb-6"><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#5d52d6]"><ChartNoAxesColumn size={15}/> Campus ledger</p><h1 className="text-3xl font-bold tracking-tight">Overview</h1><p className="mt-1 text-sm text-[#727187]">A snapshot based on your groups, expenses, and returned balances.</p></div>
    {!tokens?.access && <div className="mb-5 rounded-2xl border border-[#e6e3ff] bg-[#f1efff] px-5 py-4 text-sm text-[#4f46c7]">Sign in to load your expense data. <Link href="/login" className="font-bold underline underline-offset-4">Log in</Link></div>}
    {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(stat => <article key={stat.title} className="relative overflow-hidden rounded-[22px] border border-[#eeedfa] bg-white p-5 shadow-[0_2px_8px_rgba(35,29,100,.025)]"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[.1em] text-[#77768b]">{stat.title}</p><span className={`grid size-10 place-items-center rounded-xl ${stat.tint} ${stat.color}`}><stat.icon size={19}/></span></div><p className={`mt-4 truncate text-2xl font-bold tracking-tight sm:text-[28px] ${stat.color}`}>{loading ? '—' : stat.value}</p><p className="mt-1 text-xs text-[#77768b]">{loading ? 'Loading…' : stat.note}</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#f0eff8]"><div className={`h-full rounded-full ${stat.bar} ${stat.width}`}/></div></article>)}</div>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)]">
      <div className="space-y-5"><section className="rounded-[22px] border border-[#eeedfa] bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Expense categories</h2><p className="mt-1 text-xs text-[#77768b]">Totals grouped from expense category and amount fields</p></div><ReceiptText size={19} className="text-[#6256df]"/></div>{loading ? <div className="space-y-4">{[0,1,2].map(item=><div key={item} className="h-12 animate-pulse rounded-xl bg-[#f4f3fc]"/>)}</div> : categoryTotals.length ? <div className="space-y-4">{categoryTotals.map(([category, amount], index) => <div key={category}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-medium"><span className={`size-2.5 shrink-0 rounded-full ${['bg-[#6256df]','bg-[#10b981]','bg-[#8b86ed]','bg-[#f59e9b]'][index]}`}/><span className="truncate">{category}</span></span><span className="font-semibold">{currency(amount)}</span></div><div className="h-2 rounded-full bg-[#f0eff8]"><div className={`h-2 rounded-full ${['bg-[#6256df]','bg-[#10b981]','bg-[#8b86ed]','bg-[#f59e9b]'][index]}`} style={{width:`${Math.max(5, amount / maximumCategory * 100)}%`}}/></div></div>)}</div> : <p className="rounded-xl bg-[#f7f6ff] px-4 py-9 text-center text-sm text-[#77768b]">No expense categories to summarize yet.</p>}</section>
        <section className="rounded-[22px] border border-[#eeedfa] bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Expense records</h2><p className="mt-1 text-xs text-[#77768b]">Descriptions and amounts returned by your API</p></div><Link href="/expenses" className="text-sm font-semibold text-[#5145d1]">View all</Link></div>{loading ? <div className="space-y-3">{[0,1,2].map(item=><div key={item} className="h-[68px] animate-pulse rounded-xl bg-[#f4f3fc]"/>)}</div> : expenses.length ? <ul className="space-y-3">{expenses.slice(0,5).map((expense,index)=><li key={expense.id ?? `${expense.group}-${index}`} className="flex items-center gap-3 rounded-xl bg-[#f7f6ff] p-3.5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ebe9ff] text-[#5145d1]"><WalletCards size={18}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{expense.description}</p><p className="mt-1 truncate text-xs text-[#77768b]">{groupNames.get(expense.group) ?? `Group ${expense.group}`} · Paid by {usernames.get(expense.paid_by) ?? `User ${expense.paid_by}`}</p></div><span className="shrink-0 text-sm font-bold">{currency(Number(expense.total_amount))}</span></li>)}</ul> : <p className="rounded-xl bg-[#f7f6ff] px-4 py-9 text-center text-sm text-[#77768b]">No expense records yet.</p>}</section></div>
      <aside className="rounded-[22px] border border-[#eeedfa] bg-white p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">My Groups</h2><p className="mt-1 text-xs text-[#77768b]">{loading ? 'Loading…' : `${groups.length} groups returned`}</p></div><Link href="/groups" aria-label="View all groups" className="grid size-9 place-items-center rounded-xl bg-[#6256df] text-white"><UsersRound size={18}/></Link></div>{loading ? <div className="space-y-3">{[0,1,2].map(item=><div key={item} className="h-[76px] animate-pulse rounded-xl bg-[#f4f3fc]"/>)}</div> : groups.length ? <ul className="space-y-3">{groups.slice(0,5).map((group,index)=><li key={group.id}><Link href={`/groups/${group.id}`} className="flex items-center gap-3 rounded-xl bg-[#f6f5ff] p-3.5 transition hover:bg-[#efedff]"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${['bg-[#e8e5ff] text-[#5145d1]','bg-[#ddfff3] text-[#08794f]','bg-[#fff0ed] text-[#b62d31]'][index%3]}`}><UsersRound size={17}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{group.group_name}</span><span className="mt-1 block truncate text-xs text-[#77768b]">Created by User {group.created_by}</span></span><ArrowRight size={15} className="shrink-0 text-[#77768b]"/></Link></li>)}</ul> : <p className="rounded-xl bg-[#f7f6ff] px-4 py-8 text-center text-sm text-[#77768b]">No groups found.</p>}<Link href="/groups" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#eeedff] px-4 py-3 text-sm font-semibold text-[#5145d1]">View all groups <ArrowRight size={16}/></Link></aside>
    </div>
  </AppShell>
}
