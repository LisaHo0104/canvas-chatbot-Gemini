'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { BookOpen, X, AlarmClock, CopyIcon, RefreshCcwIcon, GlobeIcon, CheckIcon } from 'lucide-react'
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

  useEffect(() => {
    const lastAssistant = [...uiMessages].reverse().find((m) => m.role === 'assistant')
    const isIdle = status !== 'streaming' && status !== 'submitted'
    if (!lastAssistant || !isIdle) return
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

  const scrollToBottom = () => {
    // messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
        try {
          if (typeof window !== 'undefined') {
            ; (window as any).__currentSessionId = newSession.id
            localStorage.setItem('currentSessionId', newSession.id)
          }
        } catch { }
        setMessages([])
        setUIMessages([])
        // setUploadedFile(null)
        return newSession
      }
    } catch (error) {
      console.error('Error creating session:', error)
    }
    return null
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
      setMessages([])
      setUIMessages([])
    }
  }

  const handleSessionDelete = async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
      setMessages([])
      setUIMessages([])
    }
  }

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
        <Shimmer duration={1}>Loading workspace</Shimmer>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Enhanced Sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <EnhancedSidebar
          user={user}
          sessions={sessions}
          currentSession={currentSession}
          onSessionSelect={handleSessionSelect}
          onNewSession={createNewSession}
          onSessionDelete={handleSessionDelete}
          onSessionRename={handleSessionRename}
          status={status}
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
              status={status}
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <Conversation className="h-full">
          <ConversationContent>
            {status === 'error' && (
              <Alert className="max-w-3xl mx-auto" variant="destructive">
                <AlertTitle>Message failed</AlertTitle>
                <AlertDescription>There was an error sending your message. Please check your Canvas settings and try again.</AlertDescription>
              </Alert>
            )}
            {uiMessages.length === 0 ? (
              <div className="max-w-3xl mx-auto text-center py-12">
                <div className="w-16 h-16 bg-linear-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Welcome to Canvas AI Assistant</h2>
                <p className="text-slate-600 mb-8">I can help you with your courses, assignments, modules, and answer questions about your learning materials.</p>
              </div>
            ) : (
              uiMessages.map((message) => {
                const fileParts = message.parts.filter((p) => p.type === 'file') as any[];
                const textParts = message.parts.filter((p) => p.type === 'text') as any[];
                const textDeltaParts = message.parts.filter((p) => (p as any).type === 'text-delta') as any[];
                const toolParts = message.parts.filter((p) => typeof (p as any).type === 'string' && (p as any).type.startsWith('tool-')) as ToolUIPart[];
                const reasoningParts = message.parts.filter((p) => (p as any).type === 'reasoning') as any[];
                const reasoningDeltaParts = message.parts.filter((p) => (p as any).type === 'reasoning-delta') as any[];

                const streamedText = textDeltaParts.map((tp: any) => String(tp.textDelta ?? tp.text ?? '')).join('');
                const finalText = textParts.map((p: any) => String(p.text || '')).join('');
                const textToRender = finalText || streamedText;

                const streamedReasoning = reasoningDeltaParts.map((rp: any) => String(rp.textDelta ?? rp.text ?? '')).join('');
                const finalReasoning = reasoningParts.map((rp: any) => String(rp.text || '')).join('');
                const reasoningToRender = finalReasoning || streamedReasoning;

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
                      <AIMessageContent>
                        {message.role === 'assistant' && toolParts.length > 0 && (
                          <div className="mt-2 w-full max-w-full min-w-0 overflow-x-auto break-words">
                            {toolParts.map((tp, i) => (
                              <Tool
                                key={`${message.id}-tool-${i}-${(message.role === 'assistant' && (textDeltaParts.length > 0 || reasoningDeltaParts.length > 0 || textParts.length > 0)) ? 'collapsed' : 'open'}`}
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
                                        <ConfirmationAction
                                          onClick={() => onApproveTool(tp)}
                                        >
                                          Approve
                                        </ConfirmationAction>
                                        <ConfirmationAction
                                          variant="outline"
                                          onClick={() => onDenyTool(tp)}
                                        >
                                          Deny
                                        </ConfirmationAction>
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
                            ))}
                          </div>
                        )}
                        {message.role === 'assistant' && (reasoningParts.length > 0 || reasoningDeltaParts.length > 0) && (
                          <Reasoning isStreaming={isMessageStreaming} defaultOpen>
                            <ReasoningTrigger />
                            <ReasoningContent>
                              {reasoningToRender}
                            </ReasoningContent>
                          </Reasoning>
                        )}
                        {textToRender && (
                          <MessageResponse>{textToRender}</MessageResponse>
                        )}
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
              <div className="flex justify-center py-2">
                <Shimmer duration={1}>Thinking...</Shimmer>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="grid shrink-0 gap-2">
          <PromptInputProvider>
            <Suggestions className="px-4 pt-2">
              {loadingSuggestions ? (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-40 rounded-full" />
                  <Skeleton className="h-8 w-32 rounded-full" />
                  <Skeleton className="h-8 w-48 rounded-full" />
                  <Skeleton className="h-8 w-36 rounded-full" />
                </div>
              ) : (
                (dynamicSuggestions.length > 0 ? dynamicSuggestions : staticSuggestions).map((s) => (
                  <Suggestion
                    key={s}
                    suggestion={s}
                    disabled={status !== 'ready'}
                    onClick={() => {
                      onSubmitAI({ text: s })
                    }}
                  />
                ))
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
