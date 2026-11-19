'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Search, UserPlus, UsersRound } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { discoverGroups, Group, joinGroup } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export default function DiscoverGroupsPage() {
  const { tokens } = useAuth()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [search, setSearch] = useState('')
  const [groupId, setGroupId] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async (term = '') => {
    if (!tokens?.access) { setGroups([]); setLoading(false); return }
    setLoading(true); setError('')
    try { setGroups(await discoverGroups(tokens.access, term)) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not search groups.') }
    finally { setLoading(false) }
  }, [tokens?.access])

  useEffect(() => { void load() }, [load])

  async function join(id: number) {
    if (!tokens?.access) return
    setJoining(id); setError('')
    try {
      await joinGroup(tokens.access, id)
      router.push(`/groups/${id}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not join this group.') }
    finally { setJoining(null) }
  }

  async function joinById(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = Number(groupId)
    if (!Number.isInteger(id) || id < 1) { setError('Enter a valid group ID.'); return }
    await join(id)
  }

  return <AppShell title="Find Groups">
    <Link href="/groups" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#66657c]"><ArrowLeft size={16}/>My groups</Link>
    <section className="mb-6 rounded-[24px] border border-[#eeedfa] bg-white p-6 sm:p-8">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#6256df]"><UserPlus size={15}/> Join your community</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Find a group</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77778f]">Search by group name, or enter a group ID shared by its members. Joining gives you access to its members and shared expenses.</p>
      <form onSubmit={joinById} className="mt-5 flex max-w-xl gap-2"><input aria-label="Group ID" type="number" min="1" required value={groupId} onChange={event => setGroupId(event.target.value)} placeholder="Enter group ID" className="field-input min-w-0 flex-1"/><button className="shrink-0 rounded-xl bg-[#6256df] px-5 py-3 text-sm font-semibold text-white">Join by ID</button></form>
    </section>
    <form onSubmit={event => { event.preventDefault(); void load(search.trim()) }} className="mb-5 flex max-w-2xl gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Search group names or IDs</span><Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77778f]"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search group names or IDs" className="field-input pl-11"/></label><button className="rounded-xl bg-[#f0efff] px-5 text-sm font-semibold text-[#5145d1]">Search</button></form>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <div className="rounded-2xl bg-white p-8 text-sm text-[#77778f]">Searching groups…</div> : groups.length ? <div className="grid gap-4 sm:grid-cols-2">{groups.map(group => <article key={group.id} className="rounded-[22px] border border-[#eeedfa] bg-white p-5"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eeedff] text-[#5145d1]"><UsersRound size={20}/></span><div className="min-w-0 flex-1"><h2 className="truncate font-bold">{group.group_name}</h2><p className="mt-1 text-xs text-[#77778f]">Group ID: {group.id}</p></div></div><button type="button" onClick={() => void join(group.id)} disabled={joining === group.id} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6256df] px-4 py-3 text-sm font-semibold text-white disabled:opacity-55">{joining === group.id ? 'Joining…' : <>Join group <ArrowRight size={16}/></>}</button></article>)}</div> : <div className="rounded-2xl border border-dashed border-[#d8d5f2] bg-white px-6 py-12 text-center"><p className="font-semibold">No groups found</p><p className="mt-1 text-sm text-[#77778f]">Try another name or ask a member to share the group ID.</p></div>}
  </AppShell>
}
