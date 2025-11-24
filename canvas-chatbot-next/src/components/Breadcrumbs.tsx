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
    <nav aria-label="Breadcrumb" className="bg-background border-b border-border">
      <ol className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-1 text-sm">
        <li>
          <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
        </li>
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-1">
            <span className="text-muted-foreground">/</span>
            {item.isLast ? (
              <span className="text-foreground">{item.label}</span>
            ) : (
              <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}