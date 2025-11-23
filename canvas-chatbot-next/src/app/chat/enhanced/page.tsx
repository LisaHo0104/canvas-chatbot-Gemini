'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Send, Settings, Plus, Search, Trash2, Edit3, Paperclip, BookOpen, Menu, X, Brain, ChevronDown } from 'lucide-react'
import { marked } from 'marked'
import EnhancedSidebar from '@/components/EnhancedSidebar'
import { AIProvider } from '@/lib/ai-provider-service'

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

export default function EnhancedChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([])
  const [activeProvider, setActiveProvider] = useState<AIProvider | null>(null)
  const [showProviderSelector, setShowProviderSelector] = useState(false)
  const [canvasInstitution, setCanvasInstitution] = useState('https://swinburne.instructure.com')
  const [canvasUrl, setCanvasUrl] = useState('https://swinburne.instructure.com')
  const [canvasToken, setCanvasToken] = useState('')
  const [canvasStatus, setCanvasStatus] = useState<'connected' | 'missing' | 'error'>('missing')
  const [canvasError, setCanvasError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [legacyGeminiKey, setLegacyGeminiKey] = useState('') // For backward compatibility
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const apiBase = ''

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
          
          // Load Canvas credentials
          if (userData.canvas_api_url) {
            setCanvasStatus('connected')
            try {
              const base = String(userData.canvas_api_url).replace(/\/?api\/v1$/, '')
              setCanvasInstitution(base)
              setCanvasUrl(base)
            } catch {}
          } else {
            setCanvasStatus('missing')
            setShowSettings(true)
          }
        } else {
          setCanvasStatus('missing')
        }

        // Load AI providers
        await loadAIProviders(session.user.id)

        // Load legacy Gemini key for backward compatibility
        const savedKey = localStorage.getItem('geminiKey')
        if (savedKey) {
          setLegacyGeminiKey(savedKey)
        }

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

  const loadAIProviders = async (userId: string) => {
    try {
      const response = await fetch('/api/ai-providers')
      if (response.ok) {
        const data = await response.json()
        setAiProviders(data.providers)
        
        // Find active provider
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
        .order('updated_at', { ascending: false })

      if (!error && data) {
        const loadedSessions = data.map((session: any) => ({
          id: session.id,
          title: session.title,
          messages: [],
          lastMessage: new Date(session.updated_at),
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

  const createNewSession = async () => {
    if (!user) return

    try {
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
      }
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return

    if (!user) {
      alert('Please log in first')
      return
    }

    // Check if we have an AI provider configured
    if (!activeProvider && !legacyGeminiKey) {
      alert('Please configure an AI provider in settings first.')
      setShowSettings(true)
      return
    }

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
      const chatUrl = `${apiBase || ''}/api/chat`
      const requestBody: any = {
        query: input,
        history: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      }

      // Use active provider if available, otherwise fall back to legacy gemini key
      if (activeProvider) {
        requestBody.provider_id = activeProvider.id
      } else if (legacyGeminiKey) {
        requestBody.gemini_key = legacyGeminiKey
      }

      // Add Canvas context if available
      if (canvasStatus === 'connected') {
        requestBody.canvas_token = canvasToken
        requestBody.canvas_url = canvasUrl
      }

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': currentSession?.id || 'default',
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
      if (messages.length === 0 && currentSession) {
        const newTitle = input.substring(0, 50) + (input.length > 50 ? '...' : '')
        setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null)
        setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, title: newTitle } : s))
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
    <div className="flex h-screen bg-slate-50">
      {/* Enhanced Sidebar */}
      <div className="hidden md:block">
        <EnhancedSidebar
          user={user}
          sessions={sessions}
          currentSession={currentSession}
          onSessionSelect={handleSessionSelect}
          onNewSession={createNewSession}
          onSettingsClick={() => setShowSettings(!showSettings)}
          onLogout={handleLogout}
          onSessionDelete={handleSessionDelete}
          onSessionRename={handleSessionRename}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80">
            <EnhancedSidebar
              user={user}
              sessions={sessions}
              currentSession={currentSession}
              onSessionSelect={handleSessionSelect}
              onNewSession={createNewSession}
              onSettingsClick={() => {
                setShowSettings(!showSettings)
                setMobileMenuOpen(false)
              }}
              onLogout={handleLogout}
              onSessionDelete={handleSessionDelete}
              onSessionRename={handleSessionRename}
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Canvas AI Assistant
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-500">
                    {activeProvider ? `Powered by ${activeProvider.provider_name}` : 'No AI provider configured'}
                  </p>
                  {activeProvider && (
                    <button
                      onClick={() => setShowProviderSelector(!showProviderSelector)}
                      className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                      <Brain className="w-3 h-3" />
                      Change
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Provider Selector Dropdown */}
          {showProviderSelector && (
            <div className="absolute top-16 left-6 right-6 md:left-auto md:right-6 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-w-sm">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-medium text-slate-900">Select AI Provider</h3>
                <p className="text-sm text-slate-500">Choose which AI provider to use for this chat</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {aiProviders.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/ai-providers/active', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ providerId: provider.id })
                        })
                        
                        if (response.ok) {
                          setActiveProvider(provider)
                          setAiProviders(prev => prev.map(p => ({
                            ...p,
                            is_active: p.id === provider.id
                          })))
                        }
                      } catch (error) {
                        console.error('Error setting active provider:', error)
                      } finally {
                        setShowProviderSelector(false)
                      }
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                      provider.is_active ? 'bg-slate-50' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-slate-900 capitalize">{provider.provider_name}</div>
                      <div className="text-sm text-slate-500">{provider.model_name}</div>
                    </div>
                    {provider.is_active && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                  </button>
                ))}
                {aiProviders.length === 0 && (
                  <div className="p-4 text-center text-slate-500">
                    <p className="text-sm">No AI providers configured</p>
                    <a
                      href="/settings/ai-providers"
                      className="text-sm text-indigo-600 hover:text-indigo-500 mt-2 inline-block"
                    >
                      Configure providers
                    </a>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-200">
                <a
                  href="/settings/ai-providers"
                  className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
                >
                  <Settings className="w-4 h-4" />
                  Manage AI Providers
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white border-b border-slate-200 p-6">
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Settings</h3>
              
              {/* AI Provider Settings */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-slate-900">AI Provider</h4>
                  <a
                    href="/settings/ai-providers"
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Configure Providers
                  </a>
                </div>
                
                {activeProvider ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-900 capitalize">{activeProvider.provider_name}</p>
                        <p className="text-sm text-green-700">{activeProvider.model_name}</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">No AI provider configured. Please configure a provider to start chatting.</p>
                  </div>
                )}
              </div>

              {/* Legacy Gemini Key (for backward compatibility) */}
              <div className="mb-6">
                <label htmlFor="legacyGeminiKey" className="block text-sm font-medium text-slate-700 mb-1">
                  Legacy Gemini API Key (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="legacyGeminiKey"
                    type="password"
                    value={legacyGeminiKey}
                    onChange={(e) => setLegacyGeminiKey(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                    placeholder="Enter Gemini API key (fallback option)"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  This is a fallback option. We recommend using the new AI provider configuration above.
                </p>
              </div>

              {/* Canvas Settings */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Canvas Connection</span>
                  <span className={`text-xs ${canvasStatus === 'connected' ? 'text-green-600' : canvasStatus === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
                    {canvasStatus === 'connected' ? 'Connected' : canvasStatus === 'error' ? 'Error' : 'Not connected'}
                  </span>
                </div>

                <label htmlFor="canvasInstitution" className="block text-sm font-medium text-slate-700 mb-1">Canvas Institution</label>
                <select
                  id="canvasInstitution"
                  value={canvasInstitution}
                  onChange={(e) => setCanvasInstitution(e.target.value)}
                  className="w-full px-3 py-2 mb-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                >
                  <option value="https://swinburne.instructure.com">Swinburne University</option>
                  <option value="https://canvas.mit.edu">MIT</option>
                  <option value="https://canvas.harvard.edu">Harvard University</option>
                  <option value="https://bcourses.berkeley.edu">UC Berkeley</option>
                  <option value="https://canvas.stanford.edu">Stanford University</option>
                  <option value="https://canvas.uw.edu">University of Washington</option>
                  <option value="https://canvas.yale.edu">Yale University</option>
                  <option value="https://canvas.cornell.edu">Cornell University</option>
                  <option value="custom">Custom Institution URL</option>
                </select>

                {canvasInstitution === 'custom' && (
                  <>
                    <label htmlFor="customCanvasUrl" className="block text-sm font-medium text-slate-700 mb-1">Custom Canvas URL</label>
                    <input
                      id="customCanvasUrl"
                      type="url"
                      value={canvasUrl}
                      onChange={(e) => setCanvasUrl(e.target.value)}
                      className="w-full px-3 py-2 mb-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                      placeholder="https://yourschool.instructure.com"
                    />
                  </>
                )}

                <label htmlFor="canvasToken" className="block text-sm font-medium text-slate-700 mb-1">Canvas API Token</label>
                <input
                  id="canvasToken"
                  type="password"
                  value={canvasToken}
                  onChange={(e) => setCanvasToken(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                  placeholder="Paste your Canvas API token"
                />
                <p className="text-xs text-slate-500 mt-1">Get it in Canvas: Profile → Settings → Approved Integrations → + New Access Token</p>

                {canvasError && (
                  <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{canvasError}</div>
                )}

                <button
                  onClick={async () => {
                    const base = canvasInstitution === 'custom' ? canvasUrl.trim() : canvasInstitution.trim()
                    const finalUrl = base.endsWith('/api/v1') ? base : (base.endsWith('/') ? `${base}api/v1` : `${base}/api/v1`)
                    setCanvasError('')
                    try {
                      const verifyUrl = `${apiBase || ''}/api/auth/canvas-login`
                      const response = await fetch(verifyUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ canvas_token: canvasToken, canvas_url: finalUrl }),
                      })
                      const data = await safeJson(response, verifyUrl)
                      if (!response.ok) {
                        setCanvasStatus('error')
                        setCanvasError(data.error || 'Failed to connect Canvas')
                      } else {
                        setCanvasStatus('connected')
                        setCanvasError('')
                      }
                    } catch (error: any) {
                      setCanvasStatus('error')
                      setCanvasError(error?.message || 'Network error')
                    }
                  }}
                  className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  disabled={!canvasToken || (!canvasUrl && canvasInstitution === 'custom')}
                >
                  Save Canvas Connection
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setInput('What are my current courses?')}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="font-medium text-slate-900">📚 What are my current courses?</div>
                  <div className="text-sm text-slate-500 mt-1">View your enrolled courses</div>
                </button>
                <button
                  onClick={() => setInput('What are my upcoming deadlines?')}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="font-medium text-slate-900">⏰ What are my upcoming deadlines?</div>
                  <div className="text-sm text-slate-500 mt-1">Check upcoming assignments</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-lg relative ${
                      message.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
                    {/* Provider indicator */}
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
                  <div className="bg-white border border-slate-200 px-4 py-3 rounded-lg">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 p-6">
          <div className="max-w-3xl mx-auto">
            {uploadedFile && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{uploadedFile.name}</span>
                </div>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={activeProvider || legacyGeminiKey ? "Ask about your courses, assignments, modules..." : "Configure an AI provider to start chatting"}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                disabled={isTyping || (!activeProvider && !legacyGeminiKey)}
              />
              <button
                onClick={sendMessage}
                disabled={isTyping || !input.trim() || (!activeProvider && !legacyGeminiKey)}
                className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            {!activeProvider && !legacyGeminiKey && (
              <p className="text-sm text-slate-500 mt-2">
                Please configure an AI provider in settings to start chatting.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}