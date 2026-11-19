'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Plus, Search, UsersRound, X, UserPlus } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { createGroup, discoverGroups, getGroups, Group, joinGroup } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

const accents = [
  { icon: 'bg-[#e8e5ff] text-[#5145d1]', wash: 'bg-[#6256df]/[.07]' },
  { icon: 'bg-[#fff0ed] text-[#b62d31]', wash: 'bg-[#ff7771]/[.08]' },
  { icon: 'bg-[#ddfff3] text-[#00754e]', wash: 'bg-[#40dca4]/[.09]' },
  { icon: 'bg-[#e8ebff] text-[#5145d1]', wash: 'bg-[#7b8cff]/[.09]' },
]

export default function GroupsPage() {
  const { tokens } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [availableGroups, setAvailableGroups] = useState<Group[]>([])
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const loadGroups = useCallback(async () => {
    if (!tokens?.access) { setGroups([]); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [mine, available] = await Promise.all([getGroups(tokens.access), discoverGroups(tokens.access)])
      setGroups(mine); setAvailableGroups(available)
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load groups.') }
    finally { setLoading(false) }
  }, [tokens?.access])

  useEffect(() => { void loadGroups() }, [loadGroups])
  const filteredGroups = useMemo(() => groups.filter(group => group.group_name.toLowerCase().includes(query.trim().toLowerCase())), [groups, query])
  const creatorCount = useMemo(() => new Set(groups.map(group => group.created_by)).size, [groups])

  async function join(groupId: number) {
    if (!tokens?.access) return
    setJoiningId(groupId); setError('')
    try {
      await joinGroup(tokens.access, groupId)
      await loadGroups()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not join this group.') }
    finally { setJoiningId(null) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tokens?.access || !name.trim()) return
    setSaving(true); setError('')
    try {
      const created = await createGroup(tokens.access, { group_name: name.trim() })
      setGroups(current => [created, ...current])
      setName(''); setOpen(false)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create group.') }
    finally { setSaving(false) }
  }

  return <AppShell title="My Groups">
    <section className="mb-6 flex flex-col justify-between gap-6 rounded-[24px] border border-[#eeedfa] bg-white p-6 shadow-[0_2px_8px_rgba(35,29,100,.025)] sm:flex-row sm:items-center sm:p-8">
      <div className="max-w-2xl"><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#5d52d6]"><UsersRound size={15} /> Shared ledgers</p><h1 className="text-3xl font-bold tracking-tight sm:text-[34px]">My Expense Groups</h1><p className="mt-2 text-sm leading-6 text-[#6e6d83] sm:text-base">Manage shared expenses across your hostel rooms, trips, and teams.</p></div>
      <div className="flex shrink-0 flex-col gap-3 sm:items-end"><div className="flex gap-2"><div className="min-w-[120px] rounded-xl bg-[#f2f1ff] px-4 py-2.5"><p className="text-xs text-[#696880]">Groups</p><p className="text-lg font-bold">{loading ? '—' : groups.length}</p></div><div className="min-w-[120px] rounded-xl bg-[#f2f1ff] px-4 py-2.5"><p className="text-xs text-[#696880]">Group creators</p><p className="text-lg font-bold">{loading ? '—' : creatorCount}</p></div></div><button type="button" onClick={() => setOpen(true)} disabled={!tokens?.access} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6256df] px-5 py-3 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(98,86,223,.2)] transition hover:bg-[#5045ce] disabled:cursor-not-allowed disabled:opacity-60"><Plus size={18} />Create Group</button></div>
    </section>

    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="relative block min-w-0 flex-1"><span className="sr-only">Search groups</span><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77778f]"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by group name" className="w-full rounded-2xl border border-[#efedf8] bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-[#9694a8] focus:border-[#766be5] focus:ring-4 focus:ring-[#6256df]/10"/></label>
      <span className="inline-flex w-fit items-center rounded-full bg-[#6256df] px-5 py-3 text-sm font-semibold text-white">All groups <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5">{loading ? '—' : groups.length}</span></span>
    </div>

    {!tokens?.access && <div className="mb-6 rounded-2xl border border-[#e6e3ff] bg-[#f1efff] px-5 py-4 text-sm text-[#4f46c7]">Sign in to view and manage your groups. <Link href="/login" className="font-bold underline underline-offset-4">Log in</Link></div>}
    {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}

    {loading ? <div className="grid gap-5 lg:grid-cols-2" aria-label="Loading groups">{[0, 1, 2, 3].map(item => <div key={item} className="h-[235px] animate-pulse rounded-[22px] border border-[#eeedfa] bg-white p-6"><div className="h-10 w-2/5 rounded-lg bg-[#efeffb]" /><div className="mt-7 h-4 w-3/5 rounded bg-[#f2f1fa]" /><div className="mt-3 h-4 w-2/5 rounded bg-[#f2f1fa]" /><div className="mt-8 h-10 w-36 rounded-xl bg-[#efeffb]" /></div>)}</div> : filteredGroups.length === 0 ? <div className="rounded-[24px] border border-dashed border-[#d8d5f2] bg-white px-6 py-16 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#f0efff] text-[#6256df]"><UsersRound size={25} /></span><h2 className="mt-5 text-xl font-bold">{groups.length ? 'No matching groups' : 'No groups yet'}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#77778f]">{groups.length ? 'Try a different group name.' : 'Create a group to start keeping shared expenses together.'}</p>{groups.length === 0 && <button onClick={() => setOpen(true)} disabled={!tokens?.access} className="mt-6 rounded-xl bg-[#6256df] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5045ce] disabled:opacity-50"><Plus size={16} className="mr-2 inline" />Create your first group</button>}</div> : <div className="grid gap-5 lg:grid-cols-2">{filteredGroups.map((group, index) => { const accent = accents[index % accents.length]; return <Link href={`/groups/${group.id}`} key={group.id} className="group relative flex min-h-[230px] flex-col overflow-hidden rounded-[22px] border border-[#eeedfa] bg-white p-6 shadow-[0_2px_8px_rgba(35,29,100,.025)] transition hover:-translate-y-0.5 hover:border-[#d8d3ff] hover:shadow-[0_12px_30px_rgba(51,43,135,.08)] sm:p-7"><div className={`pointer-events-none absolute -right-10 -top-14 size-40 rounded-full ${accent.wash}`} /><div className="relative flex items-start gap-4"><span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${accent.icon}`}><UsersRound size={24} /></span><div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold leading-7 tracking-tight sm:text-2xl">{group.group_name}</h2><p className="mt-2 text-sm text-[#737288]">Group created by User {group.created_by}</p></div><ArrowRight size={19} className="mt-1 shrink-0 text-[#aaa8c0] transition group-hover:translate-x-1 group-hover:text-[#6256df]" /></div><div className="relative mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#f0eff8] pt-5 text-sm"><span className="flex items-center gap-1.5 text-[#5e5d74]"><CalendarDays size={15} className="text-[#6256df]"/>Created {dateLabel(group.created_at)}</span><span className="inline-flex items-center gap-1 rounded-lg bg-[#f2f1ff] px-3 py-2 font-semibold text-[#5145d1]">View group details <ArrowRight size={14}/></span></div></Link> })}</div>}

    {tokens?.access && <section className="mt-10"><div className="mb-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#6256df]"><UserPlus size={15}/> Find a group</p><h2 className="mt-1 text-xl font-bold">Discover groups you can join</h2><p className="mt-1 text-sm text-[#77778f]">Join a group to see its members and shared expenses.</p></div>{availableGroups.length === 0 ? <div className="rounded-2xl border border-[#eeedfa] bg-white p-5 text-sm text-[#77778f]">No other groups are available right now. Ask a group admin to create one or share its name with you.</div> : <div className="grid gap-3 sm:grid-cols-2">{availableGroups.map(group => <article key={group.id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#eeedfa] bg-white p-4"><div className="min-w-0"><h3 className="truncate font-semibold">{group.group_name}</h3><p className="mt-1 text-xs text-[#77778f]">Created {dateLabel(group.created_at)}</p></div><button type="button" onClick={() => void join(group.id)} disabled={joiningId === group.id} className="shrink-0 rounded-xl bg-[#6256df] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{joiningId === group.id ? 'Joining…' : 'Join group'}</button></article>)}</div>}</section>}

    {open && <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#17172e]/35 p-4 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}><section role="dialog" aria-modal="true" aria-labelledby="create-title" className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl sm:p-7"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#6256df]">New shared ledger</p><h2 id="create-title" className="mt-1 text-2xl font-bold">Create a group</h2></div><button onClick={() => setOpen(false)} aria-label="Close form" className="grid size-9 place-items-center rounded-xl bg-[#f3f2ff] text-[#65647c]"><X size={18} /></button></div><form onSubmit={submit}><label htmlFor="group-name" className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-[#74738a]">Group name</label><input id="group-name" autoFocus required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Hostel Room 204" className="w-full rounded-xl border border-[#e7e5f2] bg-[#fafaff] px-4 py-3 text-sm outline-none transition focus:border-[#6256df] focus:ring-4 focus:ring-[#6256df]/10"/><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-[#f1f0fb] px-4 py-3 text-sm font-semibold text-[#55546d]">Cancel</button><button disabled={saving || !name.trim()} className="rounded-xl bg-[#6256df] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Creating…' : 'Create group'}</button></div></form></section></div>}
  </AppShell>
}
