'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Settings } from 'lucide-react'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/select'
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
  const [savingCanvas, setSavingCanvas] = useState(false)
  const [canvasStatus, setCanvasStatus] = useState<'connected' | 'missing' | 'error'>('missing')
  const [canvasInstitution, setCanvasInstitution] = useState('https://swinburne.instructure.com')
  const [canvasUrl, setCanvasUrl] = useState('https://swinburne.instructure.com')
  const [canvasToken, setCanvasToken] = useState('')
  const [canvasMessage, setCanvasMessage] = useState<string | null>(null)
  const router = useRouter()
  let supabase: any = null

  try {
    supabase = createSupabaseClient()
  } catch (error) {
    console.error('Error creating Supabase client:', error)
  }

  const auInstitutions = [
    { value: 'https://myuni.adelaide.edu.au', label: 'University of Adelaide' },
    { value: 'https://canvas.anu.edu.au', label: 'Australian National University (ANU)' },
    { value: 'https://canvas.online.acu.edu.au', label: 'Australian Catholic University (ACU)' },
    { value: 'https://rmit.instructure.com', label: 'Royal Melbourne Institute of Technology (RMIT)' },
    { value: 'https://canvas.sydney.edu.au', label: 'University of Sydney' },
    { value: 'https://lms.unimelb.edu.au/canvas', label: 'University of Melbourne' },
    { value: 'https://canvas.uts.edu.au', label: 'University of Technology Sydney (UTS)' },
    { value: 'https://uclearn.canberra.edu.au', label: 'University of Canberra (UC)' },
    { value: 'https://canvas.qut.edu.au', label: 'Queensland University of Technology (QUT)' },
    { value: 'https://swinburne.instructure.com', label: 'Swinburne University of Technology' },
    { value: 'https://usc.instructure.com', label: 'University of the Sunshine Coast (USC)' },
    { value: 'https://canvas.newcastle.edu.au', label: 'University of Newcastle (UON)' },
  ]

  const vnInstitutions = [
    { value: 'https://vinuni.instructure.com', label: 'VinUniversity (VinUni)' },
    { value: 'https://rmit.instructure.com', label: 'RMIT University Vietnam' },
    { value: 'https://swinburne.instructure.com', label: 'Swinburne Vietnam' },
  ]

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

  const loadCanvasStatus = async () => {
    try {
      if (!supabase || !user) return
      const { data, error } = await supabase
        .from('profiles')
        .select('canvas_api_url')
        .eq('id', user.id)
        .single()
      if (!error && data?.canvas_api_url) {
        setCanvasStatus('connected')
        try {
          const base = String(data.canvas_api_url).replace(/\/?api\/v1$/, '')
          setCanvasInstitution(base)
          setCanvasUrl(base)
        } catch { }
      } else {
        setCanvasStatus('missing')
      }
    } catch (error) {
      setCanvasStatus('error')
    }
  }

  useEffect(() => {
    loadCanvasStatus()
  }, [user])

  useEffect(() => {
    console.debug('Canvas token instructions ready')
  }, [])

  const handleCanvasSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setCanvasMessage(null)
    setSavingCanvas(true)
    try {
      const base = canvasInstitution === 'custom' ? canvasUrl.trim() : canvasInstitution.trim()
      const finalUrl = base.endsWith('/api/v1') ? base : (base.endsWith('/') ? `${base}api/v1` : `${base}/api/v1`)
      const response = await fetch('/api/auth/canvas-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ canvas_token: canvasToken, canvas_url: finalUrl })
      })
      const data = await response.json().catch(() => ({ error: 'Failed to save' }))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save Canvas credentials')
      }
      setCanvasMessage(data.message || 'Canvas configuration saved')
      setCanvasStatus('connected')
      setCanvasToken('')
    } catch (err) {
      setCanvasMessage(err instanceof Error ? err.message : 'Failed to save Canvas credentials')
      setCanvasStatus('error')
    } finally {
      setSavingCanvas(false)
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
              Configure your Canvas integration and personal preferences
            </p>
          </div>

          <div id="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Canvas Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCanvasSave} aria-busy={savingCanvas}>
                  <div>
                    <Label htmlFor="institution">Canvas Links for Australian and Vietnamese Universities</Label>
                    <Select value={canvasInstitution} onValueChange={(v) => { console.debug('Selected Canvas institution', v); setCanvasInstitution(v) }}>
                      <SelectTrigger id="institution" className="mt-2">
                        <SelectValue placeholder="Select institution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Australian Universities</SelectLabel>
                          {auInstitutions.map((inst) => (
                            <SelectItem key={`${inst.value}-au`} value={inst.value}>{inst.label}</SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Vietnamese Universities</SelectLabel>
                          {vnInstitutions.map((inst) => (
                            <SelectItem key={`${inst.value}-vn`} value={inst.value}>{inst.label}</SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectItem value="custom">Custom Institution URL</SelectItem>
                      </SelectContent>
                    </Select>
                    {canvasInstitution === 'custom' && (
                      <div className="mt-3">
                        <Label htmlFor="canvasUrl">Canvas URL</Label>
                        <Input id="canvasUrl" value={canvasUrl} onChange={(e) => setCanvasUrl(e.target.value)} placeholder="your-school.instructure.com" />
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="canvasToken">Canvas API Token</Label>
                    <Input id="canvasToken" type="password" value={canvasToken} onChange={(e) => setCanvasToken(e.target.value)} placeholder="Canvas API Token" aria-describedby="canvasTokenHelp" />
                    <p id="canvasTokenHelp" className="mt-2 text-xs text-muted-foreground">Token is sent securely to the server and stored encrypted. It is not saved in your browser.</p>
                    <div id="canvasTokenInstructions" className="mt-2 text-xs text-muted-foreground space-y-2">
                      <p>How to get a Canvas API token:</p>
                      <ol className="list-decimal ml-4 space-y-1">
                        <li>
                          Sign in to your institution’s Canvas
                          { (canvasInstitution || canvasUrl) && (
                            <>
                              {' '}
                              <a
                                href={(canvasInstitution === 'custom' ? canvasUrl : canvasInstitution) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >Open Canvas</a>
                            </>
                          )}
                        </li>
                        <li>Go to Account → Settings.</li>
                        <li>Find the Access Tokens section and click New Access Token.</li>
                        <li>Enter a purpose and optional expiry, then Generate Token.</li>
                        <li>Copy the token and paste it into the field above.</li>
                      </ol>
                    </div>
                  </div>

                  {canvasMessage && (
                    <div role="status" aria-live="polite" className={`p-3 rounded-lg text-sm ${canvasStatus === 'error' ? 'border border-destructive bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'}`}>
                      {canvasMessage}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={savingCanvas}>
                      {savingCanvas ? (
                        <span className="inline-flex items-center gap-2"><Spinner aria-hidden="true" /> Saving…</span>
                      ) : (
                        'Save Canvas Settings'
                      )}
                    </Button>
                    {canvasStatus === 'connected' && (
                      <span className="text-sm text-muted-foreground">Connected to {canvasInstitution === 'custom' ? canvasUrl : canvasInstitution}</span>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
