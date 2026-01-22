'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogoutButton } from '@/components/logout-button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Menu } from 'lucide-react'
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { UserCountBadge } from '@/components/UserCountBadge'



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
          <UserCountBadge variant="compact" className="hidden sm:flex" />
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
                          'inline-flex items-center gap-1.5',
                          pathname === '/protected/artifacts' ? 'bg-accent text-accent-foreground' : ''
                        )}
                        aria-current={pathname === '/protected/artifacts' ? 'page' : undefined}
                      >
                        <Link href="/protected/artifacts" className="inline-flex items-center gap-1.5">
                          Artifacts
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700">Beta</Badge>
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink
                        asChild
                        className={cn(
                          pathname === '/protected/study-roadmap' ? 'bg-accent text-accent-foreground' : ''
                        )}
                        aria-current={pathname === '/protected/study-roadmap' ? 'page' : undefined}
                      >
                        <Link href="/protected/study-roadmap">Study</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavigationMenuLink
                            className={cn(
                              'inline-flex items-center rounded-md px-3 py-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed',
                              pathname.startsWith('/account/billing') ? 'bg-accent text-accent-foreground' : ''
                            )}
                            aria-disabled="true"
                          >
                            Billing
                          </NavigationMenuLink>
                        </TooltipTrigger>
                        <TooltipContent>Not ready for public use</TooltipContent>
                      </Tooltip>
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
                      <Link href="/protected/context">Context</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/protected/artifacts" className="flex items-center gap-1.5">
                        Artifacts
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700">Beta</Badge>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/protected/study-roadmap">Study</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled title="Not ready for public use">
                      Billing
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
