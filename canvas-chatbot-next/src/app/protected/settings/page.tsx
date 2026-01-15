'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Settings } from 'lucide-react'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

interface User {
  id: string
  email: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<any[]>([])
  const [currentSession, setCurrentSession] = useState<any | null>(null)
  const router = useRouter()
  let supabase: any = null

  try {
    supabase = createSupabaseClient()
  } catch (error) {
    console.error('Error creating Supabase client:', error)
  }

  useEffect(() => {
    checkUser()
    loadSessions()
  }, [])

  const checkUser = async () => {
    try {
      if (!supabase) {
        router.push('/auth/login')
        return
      }
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        router.push('/auth/login')
        return
      }
      setUser({ id: session.user.id, email: session.user.email || '' })
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const loadSessions = async () => {
    try {
      if (!supabase) return
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session) return
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
      if (!error && data) {
        const loaded = data.map((s: any) => ({
          id: s.id,
          title: s.title,
          messages: [],
          lastMessage: new Date(s.updated_at),
          created_at: new Date(s.created_at),
          updated_at: new Date(s.updated_at),
        }))
        setSessions(loaded)
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }




  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex flex-col">
        <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
          <div>
            <div className="mb-4">
              <Image
                src="/dog_laptop.png"
                alt="Settings"
                width={120}
                height={120}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
              </div>
            </div>
            <p className="text-muted-foreground mt-1">
              Configure your personal preferences
            </p>
          </div>

          <div id="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Canvas configuration has been moved to the Context page. 
                  <a href="/protected/context" className="text-primary underline ml-1">Go to Context</a> to set up your Canvas integration.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
