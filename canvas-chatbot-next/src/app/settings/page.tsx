'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import EnhancedSidebar from '@/components/EnhancedSidebar'
import AIProvidersSettings from '@/app/settings/ai-providers/page'
import { Input } from '@/ui/atoms/Input'
import { Label } from '@/ui/atoms/Label'
import { Button } from '@/ui/atoms/Button'

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    if (supabaseUrl && supabaseAnonKey) {
      supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
    } else {
      console.warn('Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
    }
  } catch (error) {
    console.error('Error creating Supabase client:', error)
  }

  const institutions = [
    { value: 'https://swinburne.instructure.com', label: 'Swinburne University' },
    { value: 'https://canvas.mit.edu', label: 'MIT' },
    { value: 'https://canvas.harvard.edu', label: 'Harvard University' },
    { value: 'https://bcourses.berkeley.edu', label: 'UC Berkeley' },
    { value: 'https://canvas.stanford.edu', label: 'Stanford University' },
    { value: 'https://canvas.uw.edu', label: 'University of Washington' },
    { value: 'https://canvas.yale.edu', label: 'Yale University' },
    { value: 'https://canvas.cornell.edu', label: 'Cornell University' },
    { value: 'custom', label: 'Custom Institution URL' },
  ]

  useEffect(() => {
    checkUser()
    loadSessions()
  }, [])

  const checkUser = async () => {
    try {
      if (!supabase) {
        router.push('/login')
        return
      }
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        router.push('/login')
        return
      }
      setUser({ id: session.user.id, email: session.user.email || '' })
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
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

  const handleSessionSelect = (session: any) => {
    setCurrentSession(session)
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
        } catch {}
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

  

  const handleSignOut = async () => {
    try {
      const { error } = await supabase?.auth.signOut()
      if (error) throw error
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="hidden md:block">
        <EnhancedSidebar
          user={user}
          sessions={sessions}
          currentSession={currentSession}
          onSessionSelect={handleSessionSelect}
          onNewSession={() => {}}
          onSettingsClick={() => {}}
          onLogout={handleSignOut}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-600" />
              <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Canvas Configuration</h2>
              <div className="text-sm">
                {canvasStatus === 'connected' && <span className="text-green-600">Connected</span>}
                {canvasStatus === 'missing' && <span className="text-yellow-600">Not configured</span>}
                {canvasStatus === 'error' && <span className="text-red-600">Error</span>}
              </div>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleCanvasSave}>
              <div>
                <Label htmlFor="institution">Canvas Institution</Label>
                <select
                  id="institution"
                  value={canvasInstitution}
                  onChange={(e) => setCanvasInstitution(e.target.value)}
                  className="mt-2 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {institutions.map((inst) => (
                    <option key={inst.value} value={inst.value}>{inst.label}</option>
                  ))}
                </select>
                {canvasInstitution === 'custom' && (
                  <div className="mt-3">
                    <Label htmlFor="canvasUrl">Canvas URL</Label>
                    <Input
                      id="canvasUrl"
                      value={canvasUrl}
                      onChange={(e) => setCanvasUrl(e.target.value)}
                      placeholder="your-school.instructure.com"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="canvasToken">Canvas API Token</Label>
                <Input
                  id="canvasToken"
                  type="password"
                  value={canvasToken}
                  onChange={(e) => setCanvasToken(e.target.value)}
                  placeholder="Canvas API Token"
                />
                <p className="mt-2 text-xs text-gray-500">Token is sent securely to the server and stored encrypted. It is not saved in your browser.</p>
              </div>

              {canvasMessage && (
                <div className={`p-3 rounded-lg text-sm ${canvasStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                  {canvasMessage}
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={savingCanvas}>
                  {savingCanvas ? 'Saving…' : 'Save Canvas Settings'}
                </Button>
                {canvasStatus === 'connected' && (
                  <span className="text-sm text-gray-600">Connected to {canvasInstitution === 'custom' ? canvasUrl : canvasInstitution}</span>
                )}
              </div>
            </form>
          </div>
          <AIProvidersSettings />
        </div>
      </div>
    </div>
  )
}