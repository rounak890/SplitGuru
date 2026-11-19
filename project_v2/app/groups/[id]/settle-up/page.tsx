'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Check, HandCoins, Sparkles, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { createSettlement, getBalances, getMe, getSettleUp, Balance, SettleUpTxn, recordPayment } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export default function SettleUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { tokens } = useAuth()
  const [groupId, setGroupId] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<SettleUpTxn[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<number | null>(null)
  const [paymentFiles, setPaymentFiles] = useState<Record<number, File | null>>({})
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const paymentLock = useRef(false)
  const [error, setError] = useState('')
  useEffect(() => { void params.then(value => setGroupId(Number(value.id))) }, [params])
  const load = useCallback(async () => {
    if (!tokens?.access || !groupId) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [settleRows, balanceRows, me] = await Promise.all([getSettleUp(tokens.access, groupId), getBalances(tokens.access, groupId), getMe(tokens.access)])
      setTransactions(settleRows); setBalances(balanceRows)
      setCurrentUserId(me.id)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load settlement suggestions.') }
    finally { setLoading(false) }
  }, [groupId, tokens?.access])
  useEffect(() => { void load() }, [load])

  async function markPaid(txn: SettleUpTxn, index: number) {
    if (!tokens?.access || !groupId || paymentLock.current) return
    paymentLock.current = true
    setPending(index); setError('')
    try {
      const settlement = await createSettlement(tokens.access, { group: groupId, from_user: txn.from_user, to_user: txn.to_user, amount: txn.amount })
      if (settlement.id == null) throw new Error('Settlement was created, but the API did not return its id, so payment could not be recorded.')
      await recordPayment(tokens.access, { settlement: settlement.id, amount_paid: txn.amount, payment_method: paymentFiles[index] ? 'upi' : 'cash' }, paymentFiles[index])
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not record this payment.') }
    finally { paymentLock.current = false; setPending(null) }
  }

  const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  const currentBalance = balances.find(balance => balance.user_id === currentUserId)
  const userOwes = Math.max(-(currentBalance?.net_balance ?? 0), 0)
  const userIsOwed = Math.max(currentBalance?.net_balance ?? 0, 0)
  const transferTotal = transactions.reduce((sum, txn) => sum + Number(txn.amount || 0), 0)
  const username = (id: number) => balances.find(balance => balance.user_id === id)?.username ?? `User ${id}`
  return <AppShell title="Settle up"><Link href={`/groups/${groupId ?? ''}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#66657c] hover:text-[#5145d1]"><ArrowLeft size={16}/>Back to group</Link><section className="mb-6 flex flex-col justify-between gap-6 rounded-[24px] bg-gradient-to-br from-[#5548cf] via-[#6256df] to-[#8378ed] p-6 text-white shadow-[0_12px_30px_rgba(82,70,200,.2)] sm:flex-row sm:items-center sm:p-8"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-white/75"><Sparkles size={15}/>Group {groupId ?? '—'} · settlement plan</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Settle up</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">Review the transfer suggestions returned for this group. Record a cash payment after it has been made.</p></div><div className="min-w-[180px] rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur"><p className="text-xs font-medium text-white/75">Suggested transfers</p><p className="mt-1 text-3xl font-bold">{loading ? '—' : transactions.length}</p><p className="mt-1 text-xs text-white/75">{loading ? 'Loading' : 'from the group API'}</p></div></section>
    {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
    <section className="mb-5 grid gap-4 lg:grid-cols-3"><article className="rounded-[22px] border border-[#eeedfa] bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-[#77768b]">Total you owe</h2><span className="grid size-10 place-items-center rounded-xl bg-[#ffe4e1] text-[#bd3438]"><ArrowDownRight size={20}/></span></div><p className="mt-3 text-2xl font-bold text-[#bd3438]">{loading ? '—' : money(userOwes)}</p><p className="mt-1 text-xs text-[#77768b]">Current net balance for you</p></article><article className="rounded-[22px] border border-[#eeedfa] bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-[#77768b]">Total you are owed</h2><span className="grid size-10 place-items-center rounded-xl bg-[#d9fff1] text-[#08794f]"><ArrowUpRight size={20}/></span></div><p className="mt-3 text-2xl font-bold text-[#08794f]">{loading ? '—' : money(userIsOwed)}</p><p className="mt-1 text-xs text-[#77768b]">Current net balance for you</p></article><article className="rounded-[22px] border border-[#eeedfa] bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-[#77768b]">Suggested net flow</h2><span className="grid size-10 place-items-center rounded-xl bg-[#eeedff] text-[#5145d1]"><HandCoins size={20}/></span></div><p className="mt-3 text-2xl font-bold text-[#5145d1]">{loading ? '—' : money(transferTotal)}</p><p className="mt-1 text-xs text-[#77768b]">Across {loading ? '—' : transactions.length} suggested transfers</p></article></section>
    <section className="mb-5 flex flex-col gap-3 rounded-[20px] border border-[#e5e2ff] bg-[#f1efff] p-4 sm:flex-row sm:items-center"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#5145d1]"><Sparkles size={19}/></span><div><h2 className="text-sm font-bold">How this works <span className="ml-2 rounded-full bg-[#dcd8ff] px-2 py-1 text-[10px] uppercase tracking-wide text-[#5145d1]">API suggestions</span></h2><p className="mt-1 text-xs leading-5 text-[#686680]">Transfers are provided by this group&apos;s settle-up endpoint. Mark as paid only after the cash payment is complete.</p></div></section>
    {loading ? <div className="space-y-4" aria-label="Loading settlement suggestions">{[0,1,2].map(i => <div key={i} className="h-28 animate-pulse rounded-[22px] bg-white"/>)}</div> : <div className="space-y-4">{transactions.length ? transactions.map((txn,index) => <article key={`${txn.from_user}-${txn.to_user}-${index}`} className="flex flex-col gap-5 rounded-[22px] border border-[#eeedfa] bg-white p-5 shadow-[0_2px_8px_rgba(35,29,100,.025)] sm:flex-row sm:items-center sm:px-6"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{username(txn.from_user)}</p><p className="mt-1 text-xs text-[#85849a]">Pays</p></div><div className="flex shrink-0 flex-col items-center text-[#6256df]"><span className="mb-1 text-xl font-bold">{money(txn.amount)}</span><ArrowRight size={20}/></div><div className="min-w-0 flex-1 text-right"><p className="truncate text-sm font-semibold">{username(txn.to_user)}</p><p className="mt-1 text-xs text-[#85849a]">Receives</p></div></div><div className="flex flex-col gap-2 sm:w-56"><label className="text-xs font-medium text-[#77778f]">Payment screenshot (optional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setPaymentFiles(current => ({ ...current, [index]: event.target.files?.[0] ?? null }))} className="mt-1 block w-full text-xs"/></label><button onClick={() => void markPaid(txn,index)} disabled={pending !== null} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#08794f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#066341] disabled:opacity-55"><Check size={17}/>{pending === index ? 'Recording…' : 'Mark as Paid'}</button></div></article>) : <div className="rounded-[22px] border border-dashed border-[#d8d5f2] bg-white px-6 py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#ddfff3] text-[#08794f]"><Check size={22}/></span><h2 className="mt-4 text-lg font-bold">All settled</h2><p className="mt-1 text-sm text-[#77778f]">There are no optimized transfers for this group.</p></div>}</div>}
    {!loading && balances.length > 0 && <section className="mt-7 rounded-[22px] border border-[#eeedfa] bg-white p-5 sm:p-6"><h2 className="text-lg font-bold">Group balances</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{balances.map(balance => <li key={balance.user_id} className="flex items-center justify-between rounded-xl bg-[#f7f6ff] px-4 py-3"><span className="text-sm font-medium">{balance.username}</span><span className={`text-sm font-bold ${balance.net_balance >= 0 ? 'text-[#08794f]' : 'text-[#b4232c]'}`}>{money(balance.net_balance)}</span></li>)}</ul></section>}
  </AppShell>
}
