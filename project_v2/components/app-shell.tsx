'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeftRight, ChartNoAxesColumn, ChevronDown, CircleUserRound, LayoutDashboard, LogOut, ReceiptText, UserPlus, UsersRound, WalletCards } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const links = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/groups', label: 'My Groups', icon: UsersRound },
  { href: '/groups/discover', label: 'Find Groups', icon: UserPlus },
  { href: '/expenses', label: 'Expenses', icon: ReceiptText },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/profile', label: 'Profile', icon: CircleUserRound },
]

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { clearTokens, tokens } = useAuth()
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#17172e] md:flex">
      <aside className="flex w-full shrink-0 flex-col border-b border-[#eeedfa] bg-white px-4 py-4 md:sticky md:top-0 md:h-screen md:w-[258px] md:border-b-0 md:border-r md:px-5 md:py-6">
        <Link href="/" className="mb-5 flex items-center gap-3 px-1 md:mb-10">
          <span className="grid size-10 place-items-center rounded-xl bg-[#6256df] text-white"><WalletCards size={21} /></span>
          <span><span className="block text-lg font-bold tracking-tight">SplitMate</span><span className="block text-xs text-[#77778f]">Campus Ledger Suite</span></span>
        </Link>
        <p className="mb-3 hidden px-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#85849b] md:block">Main navigation</p>
        <nav aria-label="Main navigation" className="flex flex-wrap gap-2 md:flex-col">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href === '/groups' && pathname.startsWith('/groups/') && pathname !== '/groups/discover')
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-[#6256df] text-white shadow-sm' : 'text-[#39394f] hover:bg-[#f2f1fe]'}`}><Icon size={18} />{label}</Link>
          })}
          {pathname.startsWith('/groups/') && <Link href={`${pathname.split('/').slice(0, 3).join('/')}/settle-up`} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${pathname.endsWith('/settle-up') ? 'bg-[#6256df] text-white' : 'text-[#39394f] hover:bg-[#f2f1fe]'}`}><ChartNoAxesColumn size={18} />Settle Up</Link>}
        </nav>
        <div className="mt-auto hidden rounded-2xl bg-[#f3f2ff] p-3 md:block">
          <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-white text-[#6256df]"><CircleUserRound size={21} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Campus account</p><p className="text-xs text-[#77778f]">Shared expenses, simplified</p></div><ChevronDown size={16} className="text-[#77778f]" /></div>
          {tokens && <button onClick={() => { clearTokens(); router.push('/login') }} className="mt-3 flex w-full items-center gap-2 border-t border-[#e7e5fb] pt-3 text-xs font-medium text-[#66657d] hover:text-[#4c41cc]"><LogOut size={15} />Sign out</button>}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-[#efedf8] bg-white/90 px-5 backdrop-blur md:px-8">
          <div><p className="text-sm font-semibold">{title ?? 'Good to see you'}</p><p className="text-xs text-[#77778f]">Your shared ledger, all in one place</p></div>
          <Link href="/groups" className="hidden items-center gap-2 rounded-xl bg-[#f2f1fe] px-3 py-2 text-xs font-semibold text-[#554ad0] sm:flex"><LayoutDashboard size={15} />Campus Ledger</Link>
        </header>
        <main className="mx-auto w-full max-w-[1450px] px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
