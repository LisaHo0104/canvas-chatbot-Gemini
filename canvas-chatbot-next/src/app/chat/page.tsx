'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Send, Settings, Trash2, Paperclip, BookOpen, Menu, X, Brain, ChevronDown, AlarmClock } from 'lucide-react'
import { marked } from 'marked'
import EnhancedSidebar from '@/components/EnhancedSidebar'
import { AIProvider } from '@/lib/ai-provider-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dropzone } from '@/components/ui/dropzone'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'

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

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  provider_type?: 'configured' | 'legacy'
  provider_id?: string
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  lastMessage: Date
  created_at: Date
  updated_at: Date
}

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([])
  const [activeProvider, setActiveProvider] = useState<AIProvider | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('anthropic/claude-3.5-sonnet')
  const [showProviderSelector, setShowProviderSelector] = useState(false)
  const [canvasInstitution, setCanvasInstitution] = useState('https://swinburne.instructure.com')
  const [canvasUrl, setCanvasUrl] = useState('https://swinburne.instructure.com')
  const [canvasToken, setCanvasToken] = useState('')
  const [canvasStatus, setCanvasStatus] = useState<'connected' | 'missing' | 'error'>('missing')
  const [canvasError, setCanvasError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const apiBase = ''

  const quickActions = useMemo(() => [
    {
      id: 'qa-courses',
      label: 'Current courses',
      prompt: 'What are my current courses?',
      icon: <BookOpen className="w-4 h-4 mr-1.5" aria-hidden="true" />,
    },
    {
      id: 'qa-deadlines',
      label: 'Upcoming deadlines',
      prompt: 'What are my upcoming deadlines?',
      icon: <AlarmClock className="w-4 h-4 mr-1.5" aria-hidden="true" />,
    },
  ], [])

  async function safeJson(response: Response, url: string) {
    const ct = response.headers.get('content-type') || ''
    if (ct.toLowerCase().startsWith('application/json')) {
      return await response.json()
    }
    const text = await response.text()
    const preview = text.slice(0, 200)
    throw new Error(`Non-JSON response from ${url} (${response.status}): ${preview}`)
  }

  // Check authentication and load data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if Supabase is properly configured
        if (!supabase) {
          console.error('Supabase client not available')
          router.push('/login')
          return
        }

        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          router.push('/login')
          return
        }

        setUser(session.user)

        // Load user data from profiles table
        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name, canvas_institution, canvas_api_url')
          .eq('id', session.user.id)
          .single()

        if (userData) {
          setUser((prev: any) => ({ ...prev, user_name: userData.full_name }))

          // Prioritize database credentials over localStorage
          if (userData.canvas_api_url) {
            setCanvasStatus('connected')
            try {
              const base = String(userData.canvas_api_url).replace(/\/?api\/v1$/, '')
              setCanvasInstitution(base)
              setCanvasUrl(base)
              // Don't set token here since it's encrypted in database
            } catch { }
          } else {
            // Fallback to localStorage if no database credentials
            const savedToken = typeof window !== 'undefined' ? localStorage.getItem('canvasToken') : null
            const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('canvasUrl') : null
            if (savedToken && savedUrl) {
              setCanvasStatus('connected')
              try {
                const base = String(savedUrl).replace(/\/?api\/v1$/, '')
                setCanvasInstitution(base)
                setCanvasUrl(base)
                setCanvasToken(savedToken)
              } catch { }
            } else {
              setCanvasStatus('missing')
            }
          }
        } else {
          setCanvasStatus('missing')
        }

        // Gemini removed

        await loadAIProviders(session.user.id)
        try {
          const savedModel = typeof window !== 'undefined' ? localStorage.getItem('preferredModel') : null
          if (savedModel && savedModel.trim()) {
            setSelectedModel(savedModel)
          }
        } catch { }
        // Load chat sessions
        await loadChatSessions(session.user.id)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'preferredModel' && typeof event.newValue === 'string') {
        const value = event.newValue.trim()
        if (value) setSelectedModel(value)
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage)
      }
    }
  }, [])

  const loadAIProviders = async (userId: string) => {
    try {
      const response = await fetch('/api/ai-providers', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setAiProviders(data.providers)
        const active = data.providers.find((p: AIProvider) => p.is_active)
        setActiveProvider(active || null)
      }
    } catch (error) {
      console.error('Error loading AI providers:', error)
    }
  }

  const loadChatSessions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false })

      if (!error && data) {
        const loadedSessions = data.map((session: any) => ({
          id: session.id,
          title: session.title,
          messages: [],
          lastMessage: new Date(session.last_message_at),
          created_at: new Date(session.created_at),
          updated_at: new Date(session.updated_at),
        }))
        setSessions(loadedSessions)
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const createNewSession = async (): Promise<ChatSession | null> => {
    if (!user) return

    try {
      // Save to database and let it generate the UUID
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: user.id,
          title: 'New Chat',
          created_at: new Date(),
          updated_at: new Date(),
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating session:', error)
        return
      }

      if (data) {
        const newSession: ChatSession = {
          id: data.id,
          title: data.title,
          messages: [],
          lastMessage: new Date(data.updated_at),
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
        }

        setSessions(prev => [newSession, ...prev])
        setCurrentSession(newSession)
        setMessages([])
        setUploadedFile(null)
        return newSession
      }
    } catch (error) {
      console.error('Error creating session:', error)
    }
    return null
  }

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return

    if (!user) {
      alert('Please log in first')
      return
    }

    // Default OpenRouter flow does not require a configured provider or Gemini key

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      let sessionForSend = currentSession
      if (!sessionForSend) {
        const created = await createNewSession()
        if (created) {
          sessionForSend = created
        } else {
          throw new Error('Failed to create chat session')
        }
      }
      const chatUrl = `${apiBase || ''}/api/chat`
      const requestBody: any = {
        query: input,
        history: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      }

      if (activeProvider) {
        requestBody.provider_id = activeProvider.id
        if (activeProvider.provider_name === 'openrouter') {
          requestBody.model_override = selectedModel
        }
      } else {
        requestBody.model = selectedModel
      }

      if (canvasStatus === 'connected') {
        requestBody.canvas_token = canvasToken
        requestBody.canvas_url = canvasUrl
      }

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionForSend.id,
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      const data = await safeJson(response, chatUrl)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        provider_type: activeProvider ? 'configured' : 'legacy',
        provider_id: activeProvider?.id,
      }

      setMessages(prev => [...prev, assistantMessage])

      // Update session title if it's the first message
      if (messages.length === 0 && sessionForSend) {
        const newTitle = input.substring(0, 50) + (input.length > 50 ? '...' : '')
        try {
          await supabase
            .from('chat_sessions')
            .update({ title: newTitle })
            .eq('id', sessionForSend.id)
        } catch { }
        setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null)
        setSessions(prev => prev.map(s => s.id === sessionForSend!.id ? { ...s, title: newTitle } : s))
      }
    } catch (error) {
      console.error('Error sending message:', error)
      if (error instanceof Error && (error.message.includes('Canvas credentials') || error.message.includes('Canvas API'))) {
        alert('Your Canvas credentials are missing or invalid. Please log in and configure your Canvas token and URL.')
      }
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSessionSelect = async (session: ChatSession) => {
    setMobileMenuOpen(false)
    // Load messages for the selected session
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      const loadedMessages = data.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        provider_type: msg.metadata?.provider_type,
        provider_id: msg.metadata?.provider_id,
      }))

      setMessages(loadedMessages)
      setCurrentSession({
        ...session,
        messages: loadedMessages
      })
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, messages: loadedMessages } : s))
    } else {
      setCurrentSession(session)
      setMessages([])
    }
  }

  const handleSessionDelete = async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
      setMessages([])
    }
  }

  const handleSessionRename = (sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s))
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const uploadUrl = `${apiBase || ''}/api/upload`
      const response = await fetch(uploadUrl, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await safeJson(response, uploadUrl)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file')
      }

      setUploadedFile({ name: data.filename, content: data.content })

      // Add file content as a message
      const fileMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `[UPLOADED FILE: ${data.filename}]\n\nFile Content:\n${data.content}\n\n[END OF FILE]`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, fileMessage])
    } catch (error) {
      console.error('Error uploading file:', error)
      alert(`Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Gemini key persistence removed
  useEffect(() => {
    try {
      if (canvasToken && canvasToken.trim()) {
        localStorage.setItem('canvasToken', canvasToken)
      }
      const base = canvasInstitution === 'custom' ? canvasUrl.trim() : canvasInstitution.trim()
      const finalUrl = base.endsWith('/api/v1') ? base : (base.endsWith('/') ? `${base}api/v1` : `${base}/api/v1`)
      if (finalUrl) {
        localStorage.setItem('canvasUrl', finalUrl)
      }
    } catch { }
  }, [canvasToken, canvasInstitution, canvasUrl])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-slate-50">
      {/* Enhanced Sidebar */}
      <div className="hidden md:block">
        <EnhancedSidebar
          user={user}
          sessions={sessions}
          currentSession={currentSession}
          onSessionSelect={handleSessionSelect}
          onNewSession={createNewSession}
          onSessionDelete={handleSessionDelete}
          onSessionRename={handleSessionRename}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
          <Button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-50"
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="absolute left-0 top-0 h-full w-80">
            <EnhancedSidebar
              user={user}
              sessions={sessions}
              currentSession={currentSession}
              onSessionSelect={handleSessionSelect}
              onNewSession={createNewSession}
              onSessionDelete={handleSessionDelete}
              onSessionRename={handleSessionRename}
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="bg-background border-b border-border px-6 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <Button
                onClick={() => setMobileMenuOpen(true)}
                variant="ghost"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Canvas AI Assistant
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {activeProvider ? `Powered by ${activeProvider.provider_name}` : `Powered by OpenRouter • ${selectedModel}`}
                  </p>
                  {(activeProvider || aiProviders.length > 0) && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowProviderSelector(!showProviderSelector)}>
                      <Brain className="w-3 h-3" />
                      Change
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {showProviderSelector && (
            <DropdownMenu open onOpenChange={setShowProviderSelector}>
              <DropdownMenuTrigger asChild>
                <span />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-w-sm">
                {aiProviders.map((provider) => (
                  <DropdownMenuItem
                    key={provider.id}
                    onSelect={async () => {
                      try {
                        const response = await fetch('/api/ai-providers/active', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ providerId: provider.id })
                        })
                        if (response.ok) {
                          setActiveProvider(provider)
                          setAiProviders(prev => prev.map(p => ({ ...p, is_active: p.id === provider.id })))
                        }
                      } finally {
                        setShowProviderSelector(false)
                      }
                    }}
                    className={provider.is_active ? 'bg-accent' : undefined}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium capitalize text-foreground">{provider.provider_name}</div>
                        <div className="text-sm text-muted-foreground">{provider.model_name}</div>
                      </div>
                      {provider.is_active && <div className="size-2 rounded-full bg-primary" />}
                    </div>
                  </DropdownMenuItem>
                ))}
                {aiProviders.length === 0 && (
                  <DropdownMenuItem disabled>No AI providers configured</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/settings" className="flex items-center gap-1">
                    <Settings className="w-4 h-4" />
                    Manage AI Providers
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>



        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                Welcome to Canvas AI Assistant
              </h2>
              <p className="text-slate-600 mb-8">
                I can help you with your courses, assignments, modules, and answer questions about your learning materials.
              </p>
              {/* CTA cards removed as requested */}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-lg relative ${message.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200'
                      }`}
                  >
                    {message.role === 'assistant' && message.provider_type === 'configured' && (
                      <div className="absolute -top-6 left-0 text-xs text-slate-500 flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        {aiProviders.find(p => p.id === message.provider_id)?.provider_name || 'AI'}
                      </div>
                    )}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(message.content),
                      }}
                      className="prose prose-sm max-w-none"
                    />
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-background border border-border px-4 py-3 rounded-lg">
                    <Spinner />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-background border-t border-border p-6">
          <div className="max-w-3xl mx-auto">
            <div
              className="mb-4 -mt-1"
              role="group"
              aria-label="Quick actions"
            >
              <div className="pb-2 flex gap-2 flex-wrap md:flex-nowrap md:overflow-x-auto md:[&>*]:shrink-0">
                {quickActions.map((qa) => (
                  <Button
                    key={qa.id}
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-full px-3 h-8 bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm hover:shadow-md transition-transform focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label={qa.label}
                    onClick={() => setInput(qa.prompt)}
                    title={qa.label}
                  >
                    {qa.icon}
                    {qa.label}
                  </Button>
                ))}
              </div>
            </div>
            {uploadedFile && (
              <div className="mb-4 p-3 bg-muted border border-border rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{uploadedFile.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setUploadedFile(null)} aria-label="Remove file">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-3">
              <Dropzone onFiles={(files) => {
                const f = files[0]
                if (!f) return
                const formData = new FormData()
                formData.append('file', f)
                  ; (async () => {
                    try {
                      const uploadUrl = `${apiBase || ''}/api/upload`
                      const response = await fetch(uploadUrl, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'X-Session-ID': currentSession?.id || '' },
                        body: formData,
                      })
                      const data = await safeJson(response, uploadUrl)
                      if (!response.ok) throw new Error(data.error || 'Failed to upload file')
                      setUploadedFile({ name: data.filename, content: data.content })
                      const fileMessage = {
                        id: Date.now().toString(),
                        role: 'user',
                        content: `[UPLOADED FILE: ${data.filename}]\n\nFile Content:\n${data.content}\n\n[END OF FILE]`,
                        timestamp: new Date(),
                      }
                      setMessages(prev => [...prev, fileMessage])
                    } catch (error) {
                      alert(`Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`)
                    }
                  })()
              }} />
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={"Ask about your courses, assignments, modules..."}
                disabled={isTyping}
              />
              <Button onClick={sendMessage} disabled={isTyping || !input.trim()} aria-busy={isTyping}>
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}