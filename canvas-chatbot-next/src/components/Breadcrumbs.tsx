'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

export default function Breadcrumbs() {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  const items = parts.map((part, idx) => {
    const href = '/' + parts.slice(0, idx + 1).join('/')
    const label = part.replace(/-/g, ' ')
    const isLast = idx === parts.length - 1
    const isBeta = part === 'quiz' || part === 'rubric' || part === 'study-plan'
    return { href, label, isLast, isBeta }
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
              <span className="text-foreground flex items-center gap-1.5">
                {item.label}
                {item.isBeta && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Beta</Badge>}
              </span>
            ) : (
              <Link href={item.href} className="text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                {item.label}
                {item.isBeta && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Beta</Badge>}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}