'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, ReceiptText, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { getGroups, getPayments, Group, mediaUrl, Payment } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export default function TransactionsPage() {
  const { tokens } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!tokens?.access) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [paymentRows, groupRows] = await Promise.all([getPayments(tokens.access), getGroups(tokens.access)])
      setPayments(paymentRows); setGroups(groupRows)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load transactions.') }
    finally { setLoading(false) }
  }, [tokens?.access])
  useEffect(() => { void load() }, [load])
  const groupById = new Map(groups.map(group => [group.id, group.group_name]))
  const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)
  return <AppShell title="Transactions"><section className="mb-6 rounded-[24px] border border-[#eeedfa] bg-white p-6 sm:p-8"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#5d52d6]"><ArrowLeftRight size={16}/>Payment history</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Transactions</h1><p className="mt-2 text-sm text-[#74738a]">Payments recorded across your groups.</p></section>
    {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
    <section className="overflow-hidden rounded-[22px] border border-[#eeedfa] bg-white"><div className="border-b border-[#f0eff8] px-5 py-4"><h2 className="flex items-center gap-2 font-bold"><ReceiptText size={18} className="text-[#6256df]"/>Payment records</h2></div>{loading ? <div className="space-y-3 p-5" aria-label="Loading transactions">{[0,1,2,3].map(item => <div key={item} className="h-12 animate-pulse rounded-lg bg-[#f3f2fc]"/>)}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f7f6ff] text-xs uppercase tracking-[.09em] text-[#77778f]"><tr><th className="px-5 py-3 font-semibold">Date</th><th className="px-5 py-3 font-semibold">Group</th><th className="px-5 py-3 font-semibold">Paid by</th><th className="px-5 py-3 font-semibold">Paid to</th><th className="px-5 py-3 font-semibold">Amount</th><th className="px-5 py-3 font-semibold">Method</th><th className="px-5 py-3 font-semibold">Proof</th></tr></thead><tbody className="divide-y divide-[#f0eff8]">{payments.map((payment,index) => { const groupId = payment.settlement_detail?.group; const date = payment.payment_date ? new Date(payment.payment_date) : null; return <tr key={payment.id ?? `${payment.settlement}-${index}`} className="hover:bg-[#fbfaff]"><td className="whitespace-nowrap px-5 py-4 text-[#56556c]">{date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date) : '—'}</td><td className="px-5 py-4 font-medium">{groupId != null ? groupById.get(groupId) ?? `Group ${groupId}` : '—'}</td><td className="px-5 py-4">{payment.settlement_detail?.from_username ?? '—'}</td><td className="px-5 py-4">{payment.settlement_detail?.to_username ?? '—'}</td><td className="px-5 py-4 font-semibold">{currency(Number(payment.amount_paid))}</td><td className="px-5 py-4 capitalize text-[#56556c]">{payment.payment_method}</td><td className="px-5 py-4">{payment.receipt_image ? <a href={mediaUrl(payment.receipt_image) ?? undefined} target="_blank" rel="noreferrer" className="font-semibold text-[#5145d1] underline">View screenshot</a> : <span className="text-[#9997aa]">—</span>}</td></tr>})}</tbody></table>{payments.length === 0 && <p className="px-5 py-12 text-center text-sm text-[#77778f]">No payments recorded yet.</p>}</div>}</section>
  </AppShell>
}
