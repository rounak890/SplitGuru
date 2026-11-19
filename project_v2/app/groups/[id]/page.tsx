'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, ReceiptText, UsersRound, X, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { addExpense, addGroupMember, Balance, deleteGroup, Expense, getBalances, getExpenses, getGroupMembers, getMe, Group, getGroups, getSettleUp, mediaUrl, searchUsers, SettleUpTxn } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { tokens, userId } = useAuth()
  const router = useRouter()
  const [groupId, setGroupId] = useState<number | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<{ id: number; group: number; user: number; username: string; role: string }[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [groupSettlements, setGroupSettlements] = useState<SettleUpTxn[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({})
  const [category, setCategory] = useState('other')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberMatches, setMemberMatches] = useState<{ id: number; username: string }[]>([])
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [addingMember, setAddingMember] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)

  useEffect(() => { void params.then(value => setGroupId(Number(value.id))) }, [params])
  const load = useCallback(async () => {
    if (!tokens?.access || !groupId) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [memberRows, expenseRows, groups, balanceRows, settleRows, me] = await Promise.all([getGroupMembers(tokens.access, groupId), getExpenses(tokens.access, groupId), getGroups(tokens.access), getBalances(tokens.access, groupId), getSettleUp(tokens.access, groupId), getMe(tokens.access)])
      setMembers(memberRows); setBalances(balanceRows); setExpenses(expenseRows); setGroup(groups.find(item => item.id === groupId) ?? null)
      setGroupSettlements(settleRows); setCurrentUserId(me.id)
      setSelected(memberRows.map(item => item.user))
      setCustomAmounts(current => Object.fromEntries(memberRows.map(item => [item.user, current[item.user] ?? ''])))
      setPaidBy(current => current || String(userId ?? memberRows[0]?.user ?? ''))
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load group details.') }
    finally { setLoading(false) }
  }, [groupId, tokens?.access, userId])
  useEffect(() => { void load() }, [load])

  const usernames = useMemo(() => new Map(balances.map(balance => [balance.user_id, balance.username])), [balances])
  const memberName = (id: number) => members.find(member => member.user === id)?.username ?? usernames.get(id) ?? `User ${id}`
  const personalOwes = groupSettlements.filter(txn => txn.from_user === currentUserId)
  const personalOwed = groupSettlements.filter(txn => txn.to_user === currentUserId)
  const personalOwesTotal = personalOwes.reduce((sum, txn) => sum + Number(txn.amount), 0)
  const personalOwedTotal = personalOwed.reduce((sum, txn) => sum + Number(txn.amount), 0)
  const validAmount = Number(amount)
  const customTotal = selected.reduce((sum, user) => sum + Math.round(Number(customAmounts[user] || 0) * 100), 0)
  const totalCents = Math.round(validAmount * 100)

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tokens?.access || !groupId || !Number.isFinite(validAmount) || validAmount <= 0 || selected.length === 0) return
    const cents = Math.round(validAmount * 100)
    const base = Math.floor(cents / selected.length)
    const remainder = cents % selected.length
    const splits = splitMode === 'equal'
      ? selected.map((user, index) => ({ user, owed_amount: (base + (index < remainder ? 1 : 0)) / 100 }))
      : selected.map(user => ({ user, owed_amount: Math.round(Number(customAmounts[user] || 0) * 100) / 100 }))
    if (splits.some(split => split.owed_amount < 0) || Math.round(splits.reduce((sum, split) => sum + split.owed_amount, 0) * 100) !== cents) {
      setError('Custom amounts must add up exactly to the expense total.')
      return
    }
    setSaving(true); setError('')
    try {
      const expense = await addExpense(tokens.access, { group: groupId, paid_by: Number(paidBy), description: description.trim(), total_amount: validAmount, category, splits }, receiptFile)
      setExpenses(current => [expense, ...current]); setModal(false); setDescription(''); setAmount(''); setCategory('other'); setReceiptFile(null); setSplitMode('equal')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add expense.') }
    finally { setSaving(false) }
  }

  async function findMembers() {
    if (!tokens?.access || memberQuery.trim().length < 2) return
    try {
      const results = await searchUsers(tokens.access, memberQuery.trim())
      setMemberMatches(results.filter(result => !members.some(member => member.user === result.id)))
      setSelectedUser(null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not search users.') }
  }

  async function inviteMember() {
    if (!tokens?.access || !groupId || selectedUser == null) return
    setAddingMember(true); setError('')
    try {
      await addGroupMember(tokens.access, { group: groupId, user: selectedUser })
      setMemberQuery(''); setMemberMatches([]); setSelectedUser(null)
      setMembers(await getGroupMembers(tokens.access, groupId))
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add member.') }
    finally { setAddingMember(false) }
  }

  async function removeGroup() {
    if (!tokens?.access || !groupId || !window.confirm('Delete this group and its expenses, members, and settlements? This cannot be undone.')) return
    setDeletingGroup(true); setError('')
    try { await deleteGroup(tokens.access, groupId); router.push('/groups') }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete group.') }
    finally { setDeletingGroup(false) }
  }

  return <AppShell title="Group details">
    <Link href="/groups" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#66657c] hover:text-[#5145d1]"><ArrowLeft size={16} />All groups</Link>
    {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
    {loading ? <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className="h-52 animate-pulse rounded-3xl bg-white"/><div className="h-80 animate-pulse rounded-3xl bg-white"/></div> : <>
      <section className="mb-6 rounded-[24px] border border-[#eeedfa] bg-white p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex items-start gap-4"><span className="grid size-14 place-items-center rounded-2xl bg-[#e8e5ff] text-[#5145d1]"><UsersRound size={25}/></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#5d52d6]">Shared group · ID {groupId}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{group?.group_name ?? `Group ${groupId}`}</h1><p className="mt-2 text-sm text-[#77778f]">Created by User {group?.created_by ?? '—'} <span className="px-1">·</span>{group?.created_at ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(group.created_at)) : ''}</p></div></div><div className="flex flex-wrap gap-2"><Link href={`/groups/${groupId}/settle-up`} className="rounded-xl bg-[#f1f0ff] px-4 py-3 text-sm font-semibold text-[#5145d1]">Settle up</Link><button onClick={() => setModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#6256df] px-4 py-3 text-sm font-semibold text-white"><Plus size={17}/>Add Expense</button>{group?.created_by === userId && <button onClick={() => void removeGroup()} disabled={deletingGroup} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-50"><Trash2 size={16}/>{deletingGroup ? 'Deleting…' : 'Delete group'}</button>}</div></div></section>
      <section className="mb-6"><div className="mb-3"><h2 className="text-lg font-bold">Your balance in this group</h2><p className="mt-1 text-xs text-[#77778f]">Check your share before opening Settle up.</p></div><div className="grid gap-4 sm:grid-cols-2"><article className="rounded-[20px] border border-[#eeedfa] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#77778f]">You owe</p><p className="mt-1 text-2xl font-bold text-[#b4232c]">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(personalOwesTotal)}</p></div><span className="rounded-xl bg-[#fff0ed] px-3 py-2 text-xs font-semibold text-[#b4232c]">{personalOwes.length} {personalOwes.length === 1 ? 'person' : 'people'}</span></div>{personalOwes.length ? <ul className="mt-3 space-y-2">{personalOwes.map(txn => <li key={`owe-${txn.to_user}`} className="flex justify-between gap-3 border-t border-[#f0eff8] pt-2 text-sm"><span>You owe {memberName(txn.to_user)}</span><strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(txn.amount))}</strong></li>)}</ul> : <p className="mt-3 border-t border-[#f0eff8] pt-2 text-sm text-[#77778f]">You do not owe anyone in this group.</p>}</article><article className="rounded-[20px] border border-[#eeedfa] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#77778f]">Owed to you</p><p className="mt-1 text-2xl font-bold text-[#08794f]">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(personalOwedTotal)}</p></div><span className="rounded-xl bg-[#ddfff3] px-3 py-2 text-xs font-semibold text-[#08794f]">{personalOwed.length} {personalOwed.length === 1 ? 'person' : 'people'}</span></div>{personalOwed.length ? <ul className="mt-3 space-y-2">{personalOwed.map(txn => <li key={`owed-${txn.from_user}`} className="flex justify-between gap-3 border-t border-[#f0eff8] pt-2 text-sm"><span>{memberName(txn.from_user)} owes you</span><strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(txn.amount))}</strong></li>)}</ul> : <p className="mt-3 border-t border-[#f0eff8] pt-2 text-sm text-[#77778f]">Nobody owes you in this group.</p>}</article></div></section>
      <div className="grid gap-5 lg:grid-cols-[.82fr_1.18fr]"><section className="rounded-[22px] border border-[#eeedfa] bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Members</h2><p className="mt-1 text-xs text-[#77778f]">{members.length} {members.length === 1 ? 'member' : 'members'}</p></div><UsersRound size={19} className="text-[#6256df]"/></div>{members.length ? <ul className="space-y-3">{members.map(member => <li key={member.id} className="flex items-center gap-3 rounded-xl bg-[#f7f6ff] p-3"><span className="grid size-9 place-items-center rounded-full bg-white text-sm font-bold text-[#5145d1]">{member.username.slice(0,2).toUpperCase()}</span><span className="text-sm font-medium">{memberName(member.user)}</span>{member.user === userId && <span className="ml-auto rounded-full bg-[#e5e3ff] px-2 py-1 text-[10px] font-semibold text-[#5145d1]">You</span>}</li>)}</ul> : <p className="rounded-xl bg-[#f7f6ff] p-4 text-sm text-[#77778f]">No members were returned for this group.</p>}{group?.created_by === userId && <div className="mt-5 border-t border-[#f0eff8] pt-5"><p className="text-sm font-semibold">Add a member</p><p className="mt-1 text-xs text-[#77778f]">Find an existing account by username.</p><div className="mt-3 flex gap-2"><input value={memberQuery} onChange={event => setMemberQuery(event.target.value)} placeholder="Username" className="field-input min-w-0 flex-1"/><button type="button" onClick={() => void findMembers()} disabled={memberQuery.trim().length < 2} className="rounded-xl bg-[#f1f0ff] px-4 text-sm font-semibold text-[#5145d1] disabled:opacity-50">Find</button></div>{memberMatches.length > 0 && <div className="mt-3 space-y-2">{memberMatches.map(candidate => <label key={candidate.id} className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#f7f6ff] p-3 text-sm"><input type="radio" name="candidate" checked={selectedUser === candidate.id} onChange={() => setSelectedUser(candidate.id)} className="accent-[#5145d1]"/>{candidate.username}</label>)}<button type="button" onClick={() => void inviteMember()} disabled={selectedUser == null || addingMember} className="w-full rounded-xl bg-[#6256df] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{addingMember ? 'Adding…' : 'Add selected member'}</button></div>}</div>}</section>
        <section className="rounded-[22px] border border-[#eeedfa] bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Recent expenses</h2><p className="mt-1 text-xs text-[#77778f]">Latest shared group activity</p></div><ReceiptText size={19} className="text-[#6256df]"/></div>{expenses.length ? <ul className="space-y-3">{expenses.map((expense, index) => <li key={expense.id ?? `${expense.description}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f7f6ff] p-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{expense.description}</p><p className="mt-1 text-xs text-[#77778f]">Paid by {memberName(expense.paid_by)} · {expense.category || 'Other'}</p>{expense.receipt_image && <a href={mediaUrl(expense.receipt_image) ?? undefined} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#5145d1] underline">View bill screenshot</a>}</div><p className="shrink-0 text-base font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(expense.total_amount)}</p></li>)}</ul> : <div className="rounded-xl bg-[#f7f6ff] px-4 py-10 text-center text-sm text-[#77778f]">No expenses have been added yet.</div>}</section></div>
    </>}
    {modal && <div className="fixed inset-0 z-30 flex justify-end bg-[#17172e]/40 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setModal(false) }}><section role="dialog" aria-modal="true" aria-labelledby="expense-title" className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto rounded-l-[24px] bg-white p-6 shadow-2xl sm:p-8"><div className="mb-6 flex items-start justify-between"><div><span className="grid size-11 place-items-center rounded-xl bg-[#e8e5ff] text-[#5145d1]"><ReceiptText size={21}/></span><h2 id="expense-title" className="mt-3 text-2xl font-bold">Add an Expense</h2><p className="mt-1 text-sm text-[#77778f]">Adding to {group?.group_name ?? 'this group'}</p></div><button aria-label="Close" onClick={() => setModal(false)} className="grid size-9 place-items-center rounded-xl bg-[#f2f1ff]"><X size={18}/></button></div><form onSubmit={submitExpense} className="space-y-5"><div><label htmlFor="expense-description" className="field-label">Expense description</label><input id="expense-description" required value={description} onChange={event => setDescription(event.target.value)} placeholder="What was this expense for?" className="field-input"/></div><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="expense-amount" className="field-label">Total amount</label><input id="expense-amount" type="number" min="0.01" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className="field-input"/></div><div><label htmlFor="paid-by" className="field-label">Paid by</label><select id="paid-by" required value={paidBy} onChange={event => setPaidBy(event.target.value)} className="field-input">{members.map(member => <option key={member.id} value={member.user}>{memberName(member.user)}{member.user === userId ? ' (You)' : ''}</option>)}</select></div></div><div><label htmlFor="expense-category" className="field-label">Category</label><select id="expense-category" value={category} onChange={event => setCategory(event.target.value)} className="field-input">{['food','groceries','transport','utilities','rent','entertainment','supplies','travel','other'].map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></div><fieldset><legend className="field-label">Split amounts</legend><div className="mb-3 flex gap-2"><button type="button" onClick={() => setSplitMode('equal')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${splitMode === 'equal' ? 'bg-[#6256df] text-white' : 'bg-[#f1f0ff] text-[#5145d1]'}`}>Split equally</button><button type="button" onClick={() => setSplitMode('custom')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${splitMode === 'custom' ? 'bg-[#6256df] text-white' : 'bg-[#f1f0ff] text-[#5145d1]'}`}>Set each amount</button></div><div className="space-y-2">{members.map(member => <div key={member.id} className="flex items-center gap-3 rounded-xl bg-[#f5f4ff] p-3 text-sm"><input type="checkbox" aria-label={`Include ${memberName(member.user)} in split`} checked={selected.includes(member.user)} onChange={event => setSelected(current => event.target.checked ? [...new Set([...current, member.user])] : current.filter(id => id !== member.user))} className="size-4 accent-[#5145d1]"/><span className="min-w-0 flex-1 truncate">{memberName(member.user)}{member.user === userId ? ' (You)' : ''}</span>{splitMode === 'custom' && <input aria-label={`${memberName(member.user)} share`} type="number" min="0" step="0.01" disabled={!selected.includes(member.user)} value={customAmounts[member.user] ?? ''} onChange={event => setCustomAmounts(current => ({ ...current, [member.user]: event.target.value }))} placeholder="0.00" className="field-input max-w-32 text-right"/>}</div>)}</div><p className={`mt-2 text-xs ${splitMode === 'custom' && customTotal !== totalCents ? 'text-red-600' : 'text-[#77778f]'}`}>{splitMode === 'custom' ? `Assigned ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(customTotal / 100)} of ${Number.isFinite(validAmount) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(validAmount) : '₹0.00'}.` : `${selected.length} members selected. Shares are rounded to cents and any remainder is distributed one cent at a time.`}</p></fieldset><div><label htmlFor="receipt-image" className="field-label">Bill screenshot (optional)</label><input id="receipt-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setReceiptFile(event.target.files?.[0] ?? null)} className="field-input"/><p className="mt-1 text-xs text-[#77778f]">JPG, PNG, or WebP, up to 10 MB.</p></div><div className="flex justify-end gap-3 border-t border-[#f0eff8] pt-5"><button type="button" onClick={() => setModal(false)} className="rounded-xl bg-[#f1f0fb] px-4 py-3 text-sm font-semibold">Cancel</button><button disabled={saving || !description.trim() || !Number.isFinite(validAmount) || validAmount <= 0 || selected.length === 0 || members.length === 0 || (splitMode === 'custom' && customTotal !== totalCents)} className="rounded-xl bg-[#5145d1] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Expense'}</button></div></form></section></div>}
  </AppShell>
}
