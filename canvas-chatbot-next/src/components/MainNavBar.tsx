'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogoutButton } from '@/components/logout-button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Menu } from 'lucide-react'
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'



export default function MainNavBar() {
  const pathname = usePathname()
  const [authUser, setAuthUser] = useState<any>(null)
  useEffect(() => {
    const unsubs: (() => void)[] = []
    let supabase: any = null
    try {
      supabase = createSupabaseClient()
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
      <div className="max-w-lvw px-4 h-12 flex items-center justify-start">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="Lulu Home" className="flex items-center">
            <img src="/dog_logo.png" alt="Lulu logo" className="h-12 w-auto" />
            <span className="ml-2 text-lg font-semibold">Lulu</span>
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
                          pathname === '/protected/chat' ? 'bg-accent text-accent-foreground' : ''
                        )}
                        aria-current={pathname === '/protected/chat' ? 'page' : undefined}
                      >
                        <Link href="/protected/chat">Chat</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        asChild
                        className={cn(
                          pathname === '/protected/context' ? 'bg-accent text-accent-foreground' : ''
                        )}
                        aria-current={pathname === '/protected/context' ? 'page' : undefined}
                      >
                        <Link href="/protected/context">Context</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        asChild
                        className={cn(
                          pathname === '/protected/quiz' ? 'bg-accent text-accent-foreground' : ''
                        )}
                        aria-current={pathname === '/protected/quiz' ? 'page' : undefined}
                      >
                        <Link href="/protected/quiz">Quiz</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        asChild
                        className={cn(
                          pathname.startsWith('/protected/settings') ? 'bg-accent text-accent-foreground' : ''
                        )}
                        aria-current={pathname.startsWith('/protected/settings') ? 'page' : undefined}
                      >
                        <Link href="/protected/settings">Settings</Link>
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
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        asChild
                        className={cn(
                          pathname.startsWith('/account/billing') ? 'bg-accent text-accent-foreground' : ''
                        )}
                        aria-current={pathname.startsWith('/account/billing') ? 'page' : undefined}
                      >
                        <Link href="/account/billing">Billing</Link>
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
                      <Link href="/protected/chat">Chat</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/protected/quiz">Quiz</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/protected/context">Context</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/protected/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/help">Help</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/billing">Billing</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <LogoutButton />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : null}
        </div>
        <div className="ml-auto">
          {authUser ? (
            <LogoutButton />
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
              <Link href="/auth/login"><Button size="sm">Get Started</Button></Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
