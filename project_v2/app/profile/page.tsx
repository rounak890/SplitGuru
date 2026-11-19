'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CircleUserRound } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { getGroupMembers, getGroups, getProfile, getSettleUp, Group, SettleUpTxn, updateProfile } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

type Profile = { id: number; username: string; email: string }
type BalanceItem = { groupId: number; otherUserId: number; amount: number }

export default function ProfilePage() {
  const { tokens } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [settlements, setSettlements] = useState<{ groupId: number; transactions: SettleUpTxn[] }[]>([])
  const [userNames, setUserNames] = useState<Record<number, string>>({})
  const [balanceLoading, setBalanceLoading] = useState(true)

  useEffect(() => {
    if (!tokens?.access) { setBalanceLoading(false); return }
    void (async () => {
      try {
        const [data, groupRows] = await Promise.all([getProfile(tokens.access), getGroups(tokens.access)])
        setProfile(data); setUsername(data.username); setEmail(data.email); setGroups(groupRows)
        const [rows, memberRows] = await Promise.all([
          Promise.all(groupRows.map(async group => ({ groupId: group.id, transactions: await getSettleUp(tokens.access, group.id) }))),
          Promise.all(groupRows.map(group => getGroupMembers(tokens.access, group.id))),
        ])
        setSettlements(rows)
        setUserNames(Object.fromEntries(memberRows.flat().map(member => [member.user, member.username])))
      } catch (err) { setError(err instanceof Error ? err.message : 'Could not load profile and balances.') }
      finally { setBalanceLoading(false) }
    })()
  }, [tokens?.access])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tokens?.access) return
    setSaving(true); setMessage(''); setError('')
    try {
      const updated = await updateProfile(tokens.access, { username: username.trim(), email: email.trim() })
      setProfile(updated); setUsername(updated.username); setEmail(updated.email); setMessage('Profile updated.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update profile.') }
    finally { setSaving(false) }
  }

  const groupNames = useMemo(() => new Map(groups.map(group => [group.id, group.group_name])), [groups])
  const owes: BalanceItem[] = useMemo(() => settlements.flatMap(({ groupId, transactions }) => transactions
    .filter(txn => txn.from_user === profile?.id)
    .map(txn => ({ groupId, otherUserId: txn.to_user, amount: Number(txn.amount) }))), [settlements, profile?.id])
  const owedToYou: BalanceItem[] = useMemo(() => settlements.flatMap(({ groupId, transactions }) => transactions
    .filter(txn => txn.to_user === profile?.id)
    .map(txn => ({ groupId, otherUserId: txn.from_user, amount: Number(txn.amount) }))), [settlements, profile?.id])
  const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)

  function balanceCard(title: string, items: BalanceItem[], direction: 'owe' | 'owed') {
    const positive = direction === 'owed'
    const tone = positive ? 'text-[#08794f]' : 'text-[#b4232c]'
    const wash = positive ? 'bg-[#ddfff3]' : 'bg-[#fff0ed]'
    const Icon = positive ? ArrowDownRight : ArrowUpRight
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    return <article key={title} className="rounded-[22px] border border-[#eeedfa] bg-white p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold">{title}</h3><p className={`mt-1 text-2xl font-bold ${tone}`}>{balanceLoading ? '—' : currency(total)}</p></div><span className={`grid size-11 place-items-center rounded-xl ${wash} ${tone}`}><Icon size={21}/></span></div>{balanceLoading ? <p className="text-sm text-[#77778f]">Loading balances…</p> : items.length ? <ul className="space-y-2">{items.map((item, index) => <li key={`${item.groupId}-${item.otherUserId}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8f7ff] px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{userNames[item.otherUserId] ?? `User ${item.otherUserId}`}</p><Link href={`/groups/${item.groupId}`} className="mt-0.5 block truncate text-xs text-[#77778f] underline">{groupNames.get(item.groupId) ?? `Group ${item.groupId}`}</Link></div><span className={`shrink-0 text-sm font-bold ${tone}`}>{currency(item.amount)}</span></li>)}</ul> : <p className="rounded-xl bg-[#f8f7ff] p-4 text-sm text-[#77778f]">{positive ? 'Nobody owes you right now.' : 'You do not owe anyone right now.'}</p>}</article>
  }

  return <AppShell title="Profile">
    <section className="mx-auto max-w-4xl rounded-[24px] border border-[#eeedfa] bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-7 flex items-center gap-4"><span className="grid size-14 place-items-center rounded-2xl bg-[#e8e5ff] text-[#5145d1]"><CircleUserRound size={27}/></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#6256df]">Account settings</p><h1 className="mt-1 text-2xl font-bold">Your profile</h1></div></div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <div><label className="field-label" htmlFor="profile-username">Username</label><input id="profile-username" required value={username} onChange={event => setUsername(event.target.value)} className="field-input"/></div>
        <div><label className="field-label" htmlFor="profile-email">Email</label><input id="profile-email" type="email" value={email} onChange={event => setEmail(event.target.value)} className="field-input"/></div>
        <div><p className="field-label">User ID</p><p className="rounded-xl bg-[#f7f6ff] px-4 py-3 text-sm text-[#66657c]">{profile?.id ?? 'Loading…'}</p><p className="mt-2 text-xs text-[#77778f]">Others can use your username to find and add you to a group.</p></div>
        <div className="flex items-end"><button disabled={!profile || saving || !username.trim()} className="rounded-xl bg-[#6256df] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button></div>
      </form>
    </section>
    <section className="mx-auto mt-7 max-w-4xl">
      <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#6256df]">Your shared balances</p><h2 className="mt-1 text-2xl font-bold">Who owes whom</h2><p className="mt-1 text-sm text-[#77778f]">Current optimized amounts across all your groups.</p></div>
      <div className="grid gap-5 lg:grid-cols-2">{balanceCard('You owe', owes, 'owe')}{balanceCard('Owed to you', owedToYou, 'owed')}</div>
    </section>
  </AppShell>
}
