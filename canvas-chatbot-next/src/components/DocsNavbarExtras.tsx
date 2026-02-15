'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogoutButton } from '@/components/logout-button'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'

export function DocsNavbarExtras() {
  const [authUser, setAuthUser] = useState<unknown>(null)
  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseClient> | null = null
    try {
      supabase = createSupabaseClient()
    } catch {
      return
    }
    const load = async () => {
      try {
        const { data: { session } } = await supabase!.auth.getSession()
        setAuthUser(session?.user ?? null)
      } catch {
        setAuthUser(null)
      }
    }
    load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load()
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      {authUser ? (
        <>
          <Link href="/protected/chat">
            <Button variant="ghost" size="sm">
              Back to app
            </Button>
          </Link>
          <LogoutButton />
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
