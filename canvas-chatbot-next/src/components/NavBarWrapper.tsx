'use client'

import { usePathname } from 'next/navigation'
import MainNavBar from '@/components/MainNavBar'

export default function NavBarWrapper() {
  const pathname = usePathname()
  if (pathname.startsWith('/docs')) {
    return null
  }
  return <MainNavBar />
}
