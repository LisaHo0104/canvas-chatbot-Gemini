'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NavItem = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname.startsWith(href))
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm ${active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  )
}

export default function MainNavBar() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-2">
        <NavItem href="/chat" label="Chat" />
        <NavItem href="/settings" label="Settings" />
        <NavItem href="/profile" label="Profile" />
        <NavItem href="/help" label="Help" />
      </div>
    </header>
  )
}