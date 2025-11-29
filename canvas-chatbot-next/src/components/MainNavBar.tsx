'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Menu } from 'lucide-react'
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'



export default function MainNavBar() {
  const pathname = usePathname()
  const [authUser, setAuthUser] = useState<any>(null)
  useEffect(() => {
    const unsubs: (() => void)[] = []
    let supabase: any = null
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      if (supabaseUrl && supabaseAnonKey) {
        supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
      }
    } catch { }
    ; (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user || null
        setAuthUser(user)
      } catch { }
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
          const user = session?.user || null
          setAuthUser(user)
        })
        unsubs.push(() => { try { subscription.unsubscribe() } catch { } })
      } catch { }
      try {
        if (typeof window !== 'undefined') {
          const handler = async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession()
              const user = session?.user || null
              setAuthUser(user)
            } catch { }
          }
          window.addEventListener('storage', handler)
          unsubs.push(() => { try { window.removeEventListener('storage', handler) } catch { } })
        }
      } catch { }
    })()
    return () => { unsubs.forEach((fn) => { try { fn() } catch { } }) }
  }, [])
  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border" role="navigation" aria-label="Main">
      <div className="max-w-7xl px-4 h-12 flex items-center justify-start">
        <div className="flex items-center gap-2">
          <Link href="/" aria-label="Home" className="flex items-center">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
          </Link>
          {authUser ? (
            <>
              <div className="hidden sm:block">
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        asChild
                        className={cn(
                          pathname === '/chat' ? 'bg-accent text-accent-foreground' : ''
                        )}
                        aria-current={pathname === '/chat' ? 'page' : undefined}
                      >
                        <Link href="/chat">Chat</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        asChild
                        className={cn(
                          pathname.startsWith('/settings') ? 'bg-accent text-accent-foreground' : ''
                        )}
                        aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
                      >
                        <Link href="/settings">Settings</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        asChild
                        className={cn(
                          pathname.startsWith('/help') ? 'bg-accent text-accent-foreground' : ''
                        )}
                        aria-current={pathname.startsWith('/help') ? 'page' : undefined}
                      >
                        <Link href="/help">Help</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              </div>
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="Menu">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link href="/chat">Chat</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/help">Help</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
              <Link href="/login"><Button size="sm">Get Started</Button></Link>
            </div>
          )}
        </div>
        {null}
      </div>
    </header>
  )
}
