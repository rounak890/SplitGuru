'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, WalletCards } from 'lucide-react'
import { register } from '@/lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSubmitting(true)
    try { await register({ username: username.trim(), email: email.trim(), password }); router.push('/login') }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to create your account. Please try again.') }
    finally { setSubmitting(false) }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f7ff] px-4 py-10"><section className="w-full max-w-md rounded-[28px] border border-[#eeedfa] bg-white p-7 shadow-[0_18px_60px_rgba(51,43,135,.08)] sm:p-9"><Link href="/groups" className="mb-9 inline-flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#6256df] text-white"><WalletCards size={22}/></span><span className="text-lg font-bold">SplitMate</span></Link><p className="text-xs font-bold uppercase tracking-[.14em] text-[#6256df]">Get started</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Create your account</h1><p className="mt-2 text-sm text-[#77778f]">Set up your account to organize shared expenses.</p><form onSubmit={submit} className="mt-8 space-y-5"><div><label htmlFor="username" className="field-label">Username</label><input id="username" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} className="field-input" placeholder="Choose a username"/></div><div><label htmlFor="email" className="field-label">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="field-input" placeholder="you@example.com"/></div><div><label htmlFor="password" className="field-label">Password</label><input id="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} className="field-input" placeholder="At least 8 characters"/></div>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6256df] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#5145d1] disabled:opacity-60">{submitting ? 'Creating account…' : 'Create account'}{!submitting && <ArrowRight size={17}/>}</button></form><p className="mt-6 text-center text-sm text-[#77778f]">Already registered? <Link href="/login" className="font-semibold text-[#5145d1] hover:underline">Sign in</Link></p></section></main>
}
