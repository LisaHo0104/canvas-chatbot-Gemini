'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Breadcrumbs() {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  const items = parts.map((part, idx) => {
    const href = '/' + parts.slice(0, idx + 1).join('/')
    const label = part.replace(/-/g, ' ')
    const isLast = idx === parts.length - 1
    return { href, label, isLast }
  })

  if (items.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb" className="bg-white border-b border-slate-200">
      <ol className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-1 text-sm">
        <li>
          <Link href="/" className="text-slate-600 hover:text-slate-900">Home</Link>
        </li>
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-1">
            <span className="text-slate-300">/</span>
            {item.isLast ? (
              <span className="text-slate-900">{item.label}</span>
            ) : (
              <Link href={item.href} className="text-slate-600 hover:text-slate-900">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}