'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, WalletCards } from 'lucide-react'
import { login } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { setTokens } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSubmitting(true)
    try { setTokens(await login({ username: username.trim(), password })); router.push('/groups') }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to log in. Please try again.') }
    finally { setSubmitting(false) }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f7ff] px-4 py-10"><section className="w-full max-w-md rounded-[28px] border border-[#eeedfa] bg-white p-7 shadow-[0_18px_60px_rgba(51,43,135,.08)] sm:p-9"><Link href="/groups" className="mb-9 inline-flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#6256df] text-white"><WalletCards size={22}/></span><span className="text-lg font-bold">SplitMate</span></Link><p className="text-xs font-bold uppercase tracking-[.14em] text-[#6256df]">Welcome back</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Sign in to SplitMate</h1><p className="mt-2 text-sm text-[#77778f]">Continue to your shared group ledger.</p><form onSubmit={submit} className="mt-8 space-y-5"><div><label htmlFor="username" className="field-label">Username</label><input id="username" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} className="field-input" placeholder="Your username"/></div><div><label htmlFor="password" className="field-label">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="field-input" placeholder="Your password"/></div>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6256df] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#5145d1] disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}{!submitting && <ArrowRight size={17}/>}</button></form><p className="mt-6 text-center text-sm text-[#77778f]">New to SplitMate? <Link href="/signup" className="font-semibold text-[#5145d1] hover:underline">Create an account</Link></p></section></main>
}
