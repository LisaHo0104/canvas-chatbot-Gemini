'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { X, CopyIcon, RefreshCcwIcon, GlobeIcon, CheckIcon, SparklesIcon } from 'lucide-react'
import { useChat } from '@ai-sdk/react'
import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { Message as AIMessage, MessageContent as AIMessageContent, MessageAction, MessageActions, MessageResponse, MessageAttachments, MessageAttachment } from '@/components/ai-elements/message'
import { PromptInput, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputActionMenuItem, PromptInputActionAddAttachments, PromptInputBody, PromptInputFooter, PromptInputProvider, PromptInputSubmit, PromptInputTextarea, PromptInputTools, PromptInputButton, PromptInputSpeechButton } from '@/components/ai-elements/prompt-input'
import { ModelSelector, ModelSelectorContent, ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorInput, ModelSelectorItem, ModelSelectorList, ModelSelectorLogo, ModelSelectorLogoGroup, ModelSelectorName, ModelSelectorTrigger } from '@/components/ai-elements/model-selector'
import { Sources, SourcesContent, SourcesTrigger, Source } from '@/components/ai-elements/sources'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning'
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import { Confirmation, ConfirmationTitle, ConfirmationRequest, ConfirmationAccepted, ConfirmationRejected, ConfirmationActions, ConfirmationAction } from '@/components/ai-elements/confirmation'
import type { ToolUIPart } from 'ai'
import { Shimmer } from '@/components/ai-elements/shimmer'
import EnhancedSidebar from '@/components/EnhancedSidebar'
import { AIProvider } from '@/lib/ai-provider-service'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

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
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([])
  const [activeProvider, setActiveProvider] = useState<AIProvider | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('anthropic/claude-3.5-sonnet')
  const [canvasInstitution, setCanvasInstitution] = useState('https://swinburne.instructure.com')
  const [canvasUrl, setCanvasUrl] = useState('https://swinburne.instructure.com')
  const [canvasToken, setCanvasToken] = useState('')
  const [canvasStatus, setCanvasStatus] = useState<'connected' | 'missing' | 'error'>('missing')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [openRouterModels, setOpenRouterModels] = useState<Array<{ id: string; name: string; chef: string; chefSlug: string; providers: string[] }>>([
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', chef: 'Anthropic', chefSlug: 'anthropic', providers: ['anthropic'] },
    { id: 'openai/gpt-4o', name: 'GPT-4o', chef: 'OpenAI', chefSlug: 'openai', providers: ['openai', 'azure'] },
    { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', chef: 'Google', chefSlug: 'google', providers: ['google'] },
  ])
  const [titleGenerating, setTitleGenerating] = useState(false)
  const { messages: uiMessages, sendMessage: sendChatMessage, status, regenerate, addToolApprovalResponse, setMessages: setUIMessages } = useChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  })


  const staticSuggestions = useMemo(() => [
    'Show my current courses',
    'List upcoming deadlines',
    'Summarize latest Canvas announcements',
    'What modules need attention this week?',
  ], [])
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const lastAssistantIdRef = useRef<string | null>(null)
  const lastUpdatedAssistantIdRef = useRef<string | null>(null)
  const suppressAutoSuggestionsRef = useRef<boolean>(false)
  const [suggestionsVisible, setSuggestionsVisible] = useState<boolean>(true)

  useEffect(() => {
    const lastAssistant = [...uiMessages].reverse().find((m) => m.role === 'assistant')
    const isIdle = status !== 'streaming' && status !== 'submitted'
    if (!lastAssistant || !isIdle) return
    if (suppressAutoSuggestionsRef.current) { suppressAutoSuggestionsRef.current = false; return }
    if (lastAssistantIdRef.current === lastAssistant.id) return
    const hasFinalText = lastAssistant.parts.some((p: any) => p.type === 'text' && String((p as any).text || '').trim().length > 0)
    if (!hasFinalText) return
    setLoadingSuggestions(true)
      ; (async () => {
        try {
          const res = await fetch('/api/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: uiMessages,
              provider_id: activeProvider?.id,
              model: selectedModel,
              model_override: activeProvider?.provider_name === 'openrouter' ? selectedModel : undefined,
              max_suggestions: 4,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
            setDynamicSuggestions(suggestions)
            lastAssistantIdRef.current = lastAssistant.id
          }
        } catch (e) {
          console.error('Failed to load suggestions', e)
        } finally {
          setLoadingSuggestions(false)
        }
      })()
  }, [uiMessages, status, selectedModel, activeProvider])


  const regenerateAllSuggestions = async () => {
    setLoadingSuggestions(true)
    setSuggestionsVisible(true)
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: uiMessages,
          provider_id: activeProvider?.id,
          model: selectedModel,
          model_override: activeProvider?.provider_name === 'openrouter' ? selectedModel : undefined,
          max_suggestions: 4,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
        setDynamicSuggestions(suggestions)
      }
    } catch (e) {
      console.error('Failed to regenerate suggestions', e)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  useEffect(() => {
    const lastAssistant = [...uiMessages].reverse().find((m) => m.role === 'assistant')
    const isIdle = status !== 'streaming' && status !== 'submitted'
    if (!lastAssistant || !isIdle) return
    if (lastUpdatedAssistantIdRef.current === lastAssistant.id) return
    lastUpdatedAssistantIdRef.current = lastAssistant.id
    const finalAssistantText = lastAssistant.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => String(p.text || ''))
      .join('')
    if (!String(finalAssistantText || '').trim()) return

    const lastUser = [...uiMessages].reverse().find((m) => m.role === 'user')
    const lastUserText = lastUser
      ? lastUser.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => String(p.text || ''))
        .join('')
      : ''

    const now = new Date()
    const mapUIMessagesToSessionMessages = (): Message[] => {
      return uiMessages
        .map((m: any) => {
          const text = (Array.isArray(m.parts) ? m.parts : [])
            .filter((p: any) => p.type === 'text')
            .map((p: any) => String(p.text || ''))
            .join('')
          if (!String(text || '').trim()) return null as any
          return {
            id: String(m.id || `${Date.now()}`),
            role: m.role,
            content: text,
            timestamp: now,
          } as Message
        })
        .filter(Boolean) as Message[]
    }

    const mappedMessages = mapUIMessagesToSessionMessages()

      ; (async () => {
        let generatedTitle: string | null = null
        const needsTitle = !currentSession?.title || currentSession?.title === 'New Chat'
        if (needsTitle) {
          try {
            setTitleGenerating(true)
            const res = await fetch('/api/session-title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: uiMessages,
                provider_id: activeProvider?.id,
                model: selectedModel,
                model_override: activeProvider?.provider_name === 'openrouter' ? selectedModel : undefined,
              }),
            })
            if (res.ok) {
              const data = await res.json()
              const title = typeof data?.title === 'string' ? data.title.trim() : ''
              if (title) generatedTitle = title
            }
          } catch (e) {
            console.error('Failed to generate session title', e)
          } finally {
            setTitleGenerating(false)
          }
        }

        const fallbackTitleBase = String(lastUserText || '').substring(0, 50)
        const fallbackTitle = fallbackTitleBase + (String(lastUserText || '').length > 50 ? '...' : '')
        const finalTitle = generatedTitle || fallbackTitle

        setSessions((prev) => {
          const updated = prev.map((s) => {
            if (!currentSession || s.id !== currentSession.id) return s
            return {
              ...s,
              title: finalTitle,
              messages: mappedMessages,
              lastMessage: now,
              updated_at: now,
            }
          })
          return updated.sort((a, b) => b.lastMessage.getTime() - a.lastMessage.getTime())
        })

        setCurrentSession((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            title: finalTitle,
            messages: mappedMessages,
            lastMessage: now,
            updated_at: now,
          }
        })

        try {
          const id = currentSession?.id
          if (id && supabase) {
            await supabase
              .from('chat_sessions')
              .update({ title: finalTitle })
              .eq('id', id)
          }
        } catch (e) {
          console.error('Failed to persist session title', e)
        }

      })()
  }, [uiMessages, status, selectedModel, activeProvider])

  const getToolPartId = (tp: ToolUIPart): string | undefined => {
    const anyTp = tp as any
    return anyTp.approval?.id
  }

  const onApproveTool = (tp: ToolUIPart) => {
    const id = getToolPartId(tp)
    if (!id || !(addToolApprovalResponse as any)) return
      ; (addToolApprovalResponse as any)({ id, response: 'approved' })
  }

  const onDenyTool = (tp: ToolUIPart) => {
    const id = getToolPartId(tp)
    if (!id || !(addToolApprovalResponse as any)) return
      ; (addToolApprovalResponse as any)({ id, response: 'denied', reason: 'User denied' })
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

        await loadAIProviders()
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

  useEffect(() => {
    const initModels = async () => {
      try {
        setFetchingModels(true)
        const response = await fetch('/api/openrouter/models', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          const models = Array.isArray(data.models)
            ? data.models.map((m: any) => {
              const id: string = m.id
              const name: string = m.name || id
              const chefSlug = (id.split('/')[0] || '').toLowerCase()
              const chef = chefSlug.charAt(0).toUpperCase() + chefSlug.slice(1)
              return { id, name, chef, chefSlug, providers: [chefSlug] }
            })
            : []
          if (models.length > 0) setOpenRouterModels(models)
        }
      } catch { }
      finally {
        setFetchingModels(false)
      }
    }
    initModels()
  }, [])



  const loadAIProviders = async () => {
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



  useEffect(() => {
    try {
      const id = currentSession?.id
      if (typeof window !== 'undefined') {
        ; (window as any).__currentSessionId = id || undefined
        if (id) localStorage.setItem('currentSessionId', id)
      }
    } catch { }
  }, [currentSession])

  const createNewSession = async (): Promise<ChatSession | null> => {
    if (!user) return null

    try {
      // Save to database and let it generate the UUID
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: user.id,
          title: 'New Chat',
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating session:', error)
        return null
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
        setSuggestionsVisible(true)
        setDynamicSuggestions([])
        try {
          if (typeof window !== 'undefined') {
            ; (window as any).__currentSessionId = newSession.id
            localStorage.setItem('currentSessionId', newSession.id)
          }
        } catch { }
        setUIMessages([])
        return newSession
      }
    } catch (error) {
      console.error('Error creating session:', error)
    }
    return null
  }

  const startEphemeralSession = () => {
    suppressAutoSuggestionsRef.current = false
    setCurrentSession(null)
    setSuggestionsVisible(true)
    setDynamicSuggestions([])
    setUIMessages([])
    try {
      if (typeof window !== 'undefined') {
        ; (window as any).__currentSessionId = undefined
        localStorage.removeItem('currentSessionId')
      }
    } catch { }
  }

  const onSubmitAI = async (message: any) => {
    if (!message.text) return
    if (!user) return
    let sessionForSend = currentSession
    if (!sessionForSend) {
      const created = await createNewSession()
      if (!created) return
      sessionForSend = created
    }
    await sendChatMessage(
      { text: message.text },
      {
        body: {
          model: selectedModel,
          webSearch,
          canvas_token: canvasStatus === 'connected' ? canvasToken : undefined,
          canvas_url: canvasStatus === 'connected' ? canvasUrl : undefined,
          provider_id: activeProvider?.id,
          model_override:
            activeProvider?.provider_name === 'openrouter' ? selectedModel : undefined,
        },
        headers: { 'X-Session-ID': sessionForSend.id },
      },
    )
  }


  const handleSessionSelect = async (session: ChatSession) => {
    setMobileMenuOpen(false)
    suppressAutoSuggestionsRef.current = true
    setSuggestionsVisible(false)
    setDynamicSuggestions([])
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
      const uiHistory = loadedMessages.map((m: any) => ({ id: m.id, role: m.role, parts: [{ type: 'text', text: m.content }] }))
      setUIMessages(uiHistory as any)
      try {
        const lastAssistantInHistory = [...uiHistory].reverse().find((m: any) => m.role === 'assistant')
        if (lastAssistantInHistory?.id) {
          lastUpdatedAssistantIdRef.current = String(lastAssistantInHistory.id)
        }
      } catch { }
      setCurrentSession({
        ...session,
        messages: loadedMessages
      })
      try {
        if (typeof window !== 'undefined') {
          ; (window as any).__currentSessionId = session.id
          localStorage.setItem('currentSessionId', session.id)
        }
      } catch { }
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, messages: loadedMessages } : s))
    } else {
      setCurrentSession(session)
      try {
        if (typeof window !== 'undefined') {
          ; (window as any).__currentSessionId = session.id
          localStorage.setItem('currentSessionId', session.id)
        }
      } catch { }
      setUIMessages([])
    }
  }

  const handleSessionDelete = async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    setCurrentSession(null)
    setUIMessages([])
    try {
      if (typeof window !== 'undefined') {
        ; (window as any).__currentSessionId = undefined
        localStorage.removeItem('currentSessionId')
      }
    } catch { }
  }

  useEffect(() => {
    if (!currentSession) {
      setUIMessages([])
    }
  }, [currentSession])

  const handleSessionRename = (sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s))
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null)
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



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <img
            src="/logo.png"
            alt="App logo"
            className="w-64 h-auto mb-4"
          />
          <Shimmer duration={1}>Loading workspace</Shimmer>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-x-hidden">
      {/* Enhanced Sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <EnhancedSidebar
          user={user}
          sessions={sessions}
          currentSession={currentSession}
          onSessionSelect={handleSessionSelect}
          onNewSession={startEphemeralSession}
          onSessionDelete={handleSessionDelete}
          onSessionRename={handleSessionRename}
          status={status}
          titleGenerating={titleGenerating}
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
              onNewSession={startEphemeralSession}
              onSessionDelete={handleSessionDelete}
              onSessionRename={handleSessionRename}
              status={status}
              titleGenerating={titleGenerating}
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-x-hidden">
        <Conversation className="h-full relative">
          <ConversationContent className="chat-content relative">
            {status === 'error' && (
              <Alert className="max-w-3xl mx-auto" variant="destructive">
                <AlertTitle>Message failed</AlertTitle>
                <AlertDescription>There was an error sending your message. Please check your Canvas settings and try again.</AlertDescription>
              </Alert>
            )}
            {uiMessages.length === 0 ? (
              <div className="max-w-3xl mx-auto text-center py-16">
                <div className="mx-auto w-full max-w-md">
                  <img
                    src="/illustration_chat.png"
                    alt="Chat assistant illustration"
                    className="w-full h-auto"
                  />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Start a conversation</h2>
                <p className="text-slate-600 mb-8">Ask about your courses, assignments, modules, or Canvas announcements. I’ll guide you.</p>
              </div>
            ) : (
              uiMessages.map((message) => {
                const fileParts = message.parts.filter((p) => p.type === 'file') as any[];
                const textParts = message.parts.filter((p) => p.type === 'text') as any[];
                const textDeltaParts = message.parts.filter((p) => (p as any).type === 'text-delta') as any[];
                const toolParts = message.parts.filter((p) => typeof (p as any).type === 'string' && (p as any).type.startsWith('tool-')) as ToolUIPart[];
                const reasoningParts = message.parts.filter((p) => (p as any).type === 'reasoning') as any[];
                const reasoningDeltaParts = message.parts.filter((p) => (p as any).type === 'reasoning-delta') as any[];



                const isMessageStreaming = message.role === 'assistant' && (textDeltaParts.length > 0 || reasoningDeltaParts.length > 0);
                return (
                  <div key={message.id}>
                    {message.role === 'assistant' && message.parts.filter((p) => p.type === 'source-url').length > 0 && (
                      <Sources>
                        <SourcesTrigger count={message.parts.filter((p) => p.type === 'source-url').length} />
                        {message.parts
                          .filter((p) => p.type === 'source-url')
                          .map((part, i) => (
                            <SourcesContent key={`${message.id}-${i}`}>
                              <Source href={(part as any).url} title={(part as any).url} />
                            </SourcesContent>
                          ))}
                      </Sources>
                    )}
                    <AIMessage from={message.role}>
                      {fileParts.length > 0 && (
                        <MessageAttachments className="mb-2">
                          {fileParts.map((fp, idx) => (
                            <MessageAttachment key={`${message.id}-file-${idx}`} data={fp} />
                          ))}
                        </MessageAttachments>
                      )}
                      <AIMessageContent className="w-fit max-w-[85%] min-w-0">
                        {(() => {
                          type Segment =
                            | { kind: 'text'; content: string }
                            | { kind: 'reasoning'; content: string; streaming: boolean }
                            | { kind: 'tool'; part: ToolUIPart };

                          const segments: Segment[] = []
                          let current: Segment | null = null

                          const finalizeCurrent = () => {
                            if (current) {
                              segments.push(current)
                              current = null
                            }
                          }

                          const partsInOrder = message.parts as any[]
                          for (let i = 0; i < partsInOrder.length; i++) {
                            const part: any = partsInOrder[i]
                            const type: string = String(part.type || '')

                            if (type.startsWith('tool-') && message.role === 'assistant') {
                              finalizeCurrent()
                              const tp = part as unknown as ToolUIPart
                              segments.push({ kind: 'tool', part: tp })
                              continue
                            }

                            if (type === 'text' || type === 'text-delta') {
                              if (!current || current.kind !== 'text') {
                                finalizeCurrent()
                                current = { kind: 'text', content: '' }
                              }
                              const chunk = String(part.textDelta ?? part.text ?? '')
                              current.content = (current.content || '') + chunk
                              continue
                            }

                            if (type === 'reasoning' || type === 'reasoning-delta') {
                              if (!current || current.kind !== 'reasoning') {
                                finalizeCurrent()
                                current = { kind: 'reasoning', content: '', streaming: false }
                              }
                              const chunk = String(part.textDelta ?? part.text ?? '')
                              current.content = (current.content || '') + chunk
                              if (type === 'reasoning-delta') {
                                ; (current as any).streaming = true
                              } else {
                                ; (current as any).streaming = false
                              }
                              continue
                            }
                          }
                          finalizeCurrent()

                          return segments.map((seg, idx) => {
                            if (seg.kind === 'tool') {
                              const tp = seg.part
                              return (
                                <div className="mt-2 w-full max-w-full min-w-0 overflow-x-auto break-words" key={`${message.id}-tool-${idx}`}>
                                  <Tool
                                    key={`${message.id}-tool-${idx}-${(message.role === 'assistant' && (textDeltaParts.length > 0 || reasoningDeltaParts.length > 0 || textParts.length > 0)) ? 'collapsed' : 'open'}`}
                                    defaultOpen={!(message.role === 'assistant' && (textDeltaParts.length > 0 || reasoningDeltaParts.length > 0 || textParts.length > 0))}
                                  >
                                    <ToolHeader type={tp.type} state={tp.state} />
                                    <ToolContent>
                                      <ToolInput input={tp.input} />
                                      <Confirmation approval={(tp as any).approval} state={tp.state}>
                                        <ConfirmationTitle>
                                          Execute {tp.type.split('-').slice(1).join('-')}?
                                        </ConfirmationTitle>
                                        <ConfirmationRequest>
                                          <ConfirmationActions>
                                            <ConfirmationAction onClick={() => onApproveTool(tp)}>Approve</ConfirmationAction>
                                            <ConfirmationAction variant="outline" onClick={() => onDenyTool(tp)}>Deny</ConfirmationAction>
                                          </ConfirmationActions>
                                        </ConfirmationRequest>
                                        <ConfirmationAccepted>
                                          <div className="text-sm text-muted-foreground">Approved</div>
                                        </ConfirmationAccepted>
                                        <ConfirmationRejected>
                                          <div className="text-sm text-muted-foreground">Denied</div>
                                        </ConfirmationRejected>
                                      </Confirmation>
                                      <ToolOutput className="min-w-0" output={tp.output} errorText={tp.errorText} />
                                    </ToolContent>
                                  </Tool>
                                </div>
                              )
                            }
                            if (seg.kind === 'reasoning') {
                              return (
                                <Reasoning isStreaming={seg.streaming && isMessageStreaming} defaultOpen key={`${message.id}-reasoning-${idx}`}>
                                  <ReasoningTrigger />
                                  <ReasoningContent>
                                    {seg.content}
                                  </ReasoningContent>
                                </Reasoning>
                              )
                            }
                            return (
                              <MessageResponse key={`${message.id}-text-${idx}`}>{seg.content}</MessageResponse>
                            )
                          })
                        })()}
                        {message.role === 'assistant' && !isMessageStreaming && status !== 'streaming' && status !== 'submitted' && (
                          <div className="mt-1">
                            <MessageActions>
                              <MessageAction
                                tooltip="Copy"
                                onClick={() => {
                                  const text = textParts.map((p: any) => String(p.text || '')).join('');
                                  navigator.clipboard.writeText(text);
                                }}
                              >
                                <CopyIcon className="size-4" />
                              </MessageAction>
                              <MessageAction tooltip="Regenerate" onClick={() => regenerate()}>
                                <RefreshCcwIcon className="size-4" />
                              </MessageAction>
                            </MessageActions>
                          </div>
                        )}
                      </AIMessageContent>
                    </AIMessage>
                  </div>
                );
              })
            )}
            {(status === 'streaming' || status === 'submitted') && (
              <div className="flex flex-col items-start gap-2 p-2 rounded-md">
                <img
                  src="/illustration_thinking.png"
                  alt="Thinking"
                  className="w-24 h-auto rounded"
                />
                <Shimmer duration={1}>Thinking...</Shimmer>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>



        <div className="grid shrink-0 gap-2 border-t border-slate-200">
          <PromptInputProvider>
            <Suggestions className="px-4 pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Generate suggestions"
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={regenerateAllSuggestions}
                    disabled={status !== 'ready' || loadingSuggestions}
                  >
                    <SparklesIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Generate suggestions
                </TooltipContent>
              </Tooltip>
              {suggestionsVisible && (
                loadingSuggestions ? (
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-40 rounded-full" />
                    <Skeleton className="h-8 w-32 rounded-full" />
                    <Skeleton className="h-8 w-48 rounded-full" />
                    <Skeleton className="h-8 w-36 rounded-full" />
                  </div>
                ) : (
                  (dynamicSuggestions.length > 0 ? dynamicSuggestions : staticSuggestions).map((s, i) => (
                    <Suggestion
                      key={`${s}-${i}`}
                      suggestion={s}
                      disabled={status !== 'ready'}
                      onClick={() => {
                        onSubmitAI({ text: s })
                      }}
                    />
                  ))
                )
              )}
            </Suggestions>
            <PromptInput className="px-4 pb-4 w-full" globalDrop multiple onSubmit={onSubmitAI}>
              <PromptInputBody>
                <PromptInputTextarea ref={textareaRef} placeholder="Ask about your courses, assignments, modules..." className="w-full" />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools className="flex flex-wrap md:flex-nowrap gap-1">
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments disabled />
                      <PromptInputActionMenuItem onSelect={(e) => { e.preventDefault(); setWebSearch(v => !v) }}>
                        {webSearch ? 'Disable Web Search' : 'Enable Web Search'}
                      </PromptInputActionMenuItem>
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                  <PromptInputSpeechButton textareaRef={textareaRef} />
                  <PromptInputButton type="button" onClick={() => setWebSearch(v => !v)}>
                    <GlobeIcon className="size-4" />
                    <span className="ml-1">{webSearch ? 'Search: On' : 'Search: Off'}</span>
                  </PromptInputButton>
                  <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
                    <ModelSelectorTrigger asChild>
                      <PromptInputButton type="button">
                        <ModelSelectorLogo provider={selectedModel.startsWith('anthropic') ? 'anthropic' : selectedModel.startsWith('openai') ? 'openai' : 'google'} />
                        <ModelSelectorName>{selectedModel}</ModelSelectorName>
                      </PromptInputButton>
                    </ModelSelectorTrigger>
                    <ModelSelectorContent>
                      <ModelSelectorInput placeholder="Search models..." />
                      <ModelSelectorList>
                        <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                        {[...new Set(openRouterModels.map((m) => m.chef))].map((chef) => (
                          <ModelSelectorGroup heading={chef} key={chef}>
                            {openRouterModels
                              .filter((m) => m.chef === chef)
                              .map((m) => (
                                <ModelSelectorItem key={m.id} value={m.id} onSelect={() => { setSelectedModel(m.id); setModelSelectorOpen(false); }}>
                                  <ModelSelectorLogo provider={m.chefSlug} />
                                  <ModelSelectorName>{m.name}</ModelSelectorName>
                                  <ModelSelectorLogoGroup>
                                    {m.providers.map((p) => (
                                      <ModelSelectorLogo key={p} provider={p} />
                                    ))}
                                  </ModelSelectorLogoGroup>
                                  {selectedModel === m.id ? (
                                    <CheckIcon className="ml-auto size-4" />
                                  ) : (
                                    <div className="ml-auto size-4" />
                                  )}
                                </ModelSelectorItem>
                              ))}
                          </ModelSelectorGroup>
                        ))}
                      </ModelSelectorList>
                    </ModelSelectorContent>
                  </ModelSelector>
                </PromptInputTools>
                <PromptInputSubmit status={status === 'streaming' ? 'streaming' : status === 'submitted' ? 'submitted' : status === 'error' ? 'error' : 'ready'} />
              </PromptInputFooter>
            </PromptInput>
          </PromptInputProvider>
        </div>
      </div>
    </div>
  )
}
