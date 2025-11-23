'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Send, Settings, Plus, Search, Trash2, Edit3, Paperclip, BookOpen, Menu, X } from 'lucide-react'
import { marked } from 'marked'
import EnhancedSidebar from '@/components/EnhancedSidebar'

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
  const [showSettings, setShowSettings] = useState(false)
  const [geminiKey, setGeminiKey] = useState('')
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

  async function safeJson(response: Response, url: string) {
    const ct = response.headers.get('content-type') || ''
    if (ct.toLowerCase().startsWith('application/json')) {
      return await response.json()
    }
    const text = await response.text()
    const preview = text.slice(0, 200)
    throw new Error(`Non-JSON response from ${url} (${response.status}): ${preview}`)
  }

  // Check authentication
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
            } catch {}
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
              } catch {}
            } else {
              setCanvasStatus('missing')
              setShowSettings(true)
            }
          }
        } else {
          setCanvasStatus('missing')
        }

        // Load saved Gemini key
        const savedKey = localStorage.getItem('geminiKey')
        if (savedKey) {
          setGeminiKey(savedKey)
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
      }
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !geminiKey || isTyping) return

    if (!user) {
      alert('Please log in first')
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
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': currentSession?.id || 'default',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: input,
          gemini_key: geminiKey,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
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

  useEffect(() => {
    if (geminiKey && geminiKey.trim()) {
      try {
        localStorage.setItem('geminiKey', geminiKey)
      } catch {}
    }
  }, [geminiKey])
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
    } catch {}
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
                <p className="text-sm text-slate-500">Powered by Google Gemini</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white border-b border-slate-200 p-6">
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Settings</h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="geminiKey" className="block text-sm font-medium text-slate-700 mb-1">
                    Google Gemini API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="geminiKey"
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                      placeholder="Enter your Gemini API key"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Your API key is stored locally and never sent to our servers.
                  </p>
                </div>
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
                    className={`max-w-2xl px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
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
                placeholder="Ask about your courses, assignments, modules..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                disabled={isTyping || !geminiKey}
              />
              <button
                onClick={sendMessage}
                disabled={isTyping || !input.trim() || !geminiKey}
                className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            {!geminiKey && (
              <p className="text-sm text-slate-500 mt-2">
                Please add your Gemini API key in settings to start chatting.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}