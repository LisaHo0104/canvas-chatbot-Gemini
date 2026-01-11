'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { X, CopyIcon, RefreshCcwIcon, GlobeIcon, CheckIcon, SparklesIcon, FolderIcon, LayersIcon, FileText, BookOpen, GraduationCap, FileQuestion } from 'lucide-react'
import { useChat } from '@ai-sdk/react'
import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { Message as AIMessage, MessageContent as AIMessageContent, MessageAction, MessageActions, MessageResponse, MessageAttachments, MessageAttachment, MessageContextAttachment } from '@/components/ai-elements/message'
import { PromptInput, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputActionMenuItem, PromptInputActionAddAttachments, PromptInputBody, PromptInputFooter, PromptInputProvider, PromptInputSubmit, PromptInputTextarea, PromptInputTools, PromptInputButton, PromptInputSpeechButton, PromptInputAttachments, PromptInputAttachment, PromptInputCommand, PromptInputCommandInput, PromptInputCommandList, PromptInputCommandEmpty, PromptInputCommandGroup, PromptInputCommandItem, PromptInputCommandSeparator, PromptInputHeader, PromptInputContexts } from '@/components/ai-elements/prompt-input'
import { ModelSelector, ModelSelectorContent, ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorInput, ModelSelectorItem, ModelSelectorList, ModelSelectorLogo, ModelSelectorLogoGroup, ModelSelectorName, ModelSelectorTrigger } from '@/components/ai-elements/model-selector'
import { Sources, SourcesContent, SourcesTrigger, Source } from '@/components/ai-elements/sources'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning'
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import { ToolRenderer } from '@/components/canvas-tools/tool-renderer'
import type { ToolUIPart } from 'ai'
import { Shimmer } from '@/components/ai-elements/shimmer'
import EnhancedSidebar from '@/components/EnhancedSidebar'
import { AIProvider } from '@/types/ai-providers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

let supabase: any = null

try {
  supabase = createSupabaseClient()
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
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [canvasInstitution, setCanvasInstitution] = useState('https://swinburne.instructure.com')
  const [canvasUrl, setCanvasUrl] = useState('https://swinburne.instructure.com')
  const [canvasToken, setCanvasToken] = useState('')
  const [canvasStatus, setCanvasStatus] = useState<'connected' | 'missing' | 'error'>('missing')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [analysisMode, setAnalysisMode] = useState<string | null>(null)
  const [analysisModeOpen, setAnalysisModeOpen] = useState(false)
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [openRouterModels, setOpenRouterModels] = useState<Array<{ id: string; name: string; chef: string; chefSlug: string; providers: string[] }>>([
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', chef: 'Anthropic', chefSlug: 'anthropic', providers: ['anthropic'] },
    { id: 'openai/gpt-4o', name: 'GPT-4o', chef: 'OpenAI', chefSlug: 'openai', providers: ['openai', 'azure'] },
    { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', chef: 'Google', chefSlug: 'google', providers: ['google'] },
  ])
  const [titleGenerating, setTitleGenerating] = useState(false)
  const [canvasContext, setCanvasContext] = useState<any | null>(null)
  const [syncingCanvas, setSyncingCanvas] = useState(false)
  const [selectedContext, setSelectedContext] = useState<{ courses: number[]; assignments: number[]; modules: number[] }>({
    courses: [],
    assignments: [],
    modules: []
  })
  const [contextSelectorOpen, setContextSelectorOpen] = useState(false)
  const { messages: uiMessages, sendMessage: sendChatMessage, status, regenerate, setMessages: setUIMessages } = useChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onResponse: (response: Response) => {
      const sid = response.headers.get('x-session-id')
      if (sid && sid !== currentSession?.id) {
        const newSession: ChatSession = {
          id: sid,
          title: 'New Chat',
          messages: [],
          lastMessage: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }

        setCurrentSession(newSession)
        setSessions(prev => {
          if (prev.some(s => s.id === sid)) return prev
          return [newSession, ...prev]
        })

        if (typeof window !== 'undefined') {
          ; (window as any).__currentSessionId = sid
          localStorage.setItem('currentSessionId', sid)
        }
      }
    }
  } as any)

  const staticSuggestions = useMemo(() => [
    'Show my current courses',
    'List upcoming deadlines',
    'Summarize latest Canvas announcements',
    'What modules need attention this week?',
  ], [])

  const rubricSuggestions = useMemo(() => [
    'Analyze the rubric for my latest assignment',
    'What are the key criteria I need to meet?',
    'Help me understand the rubric requirements',
    'Show me examples for each criterion',
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
    setSuggestionsVisible(true)
    ; (async () => {
      try {
        const res = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: uiMessages,
            provider_id: activeProvider?.id,
            model: selectedModel,
            model_override: activeProvider?.provider_name === 'openrouter' ? selectedModel : selectedModel,
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
          model_override: activeProvider?.provider_name === 'openrouter' ? selectedModel : selectedModel,
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
                model: selectedModel,
                model_override: selectedModel,
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

  // Check authentication and load data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!supabase) {
          console.error('Supabase client not available')
          router.push('/auth/login')
          return
        }

        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          router.push('/auth/login')
          return
        }

        setUser(session.user)

        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name, canvas_institution, canvas_api_url')
          .eq('id', session.user.id)
          .single()

        if (userData) {
          setUser((prev: any) => ({ ...prev, user_name: userData.full_name }))

          if (userData.canvas_api_url) {
            setCanvasStatus('connected')
            try {
              const base = String(userData.canvas_api_url).replace(/\/?api\/v1$/, '')
              setCanvasInstitution(base)
              setCanvasUrl(base)
            } catch { }
          } else {
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

        await loadAIProviders()
        try {
          const savedModel = typeof window !== 'undefined' ? localStorage.getItem('preferredModel') : null
          if (savedModel && savedModel.trim()) {
            setSelectedModel(savedModel)
          }
        } catch { }
        await loadChatSessions(session.user.id)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    const prefetchCanvas = async () => {
      if (canvasStatus !== 'connected') return
      try {
        setSyncingCanvas(true)
        console.log('[DEBUG] Prefetching Canvas context')
        const res = await fetch('/api/canvas/prefetch', { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          setCanvasContext(data)
        }
      } catch (e) {
        console.error('Canvas prefetch failed', e)
      } finally {
        setSyncingCanvas(false)
      }
    }
    prefetchCanvas()
  }, [canvasStatus])

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
          if (models.length > 0) {
            setOpenRouterModels(models)
            try {
              const saved = typeof window !== 'undefined' ? localStorage.getItem('preferredModel') : null
              if (!saved) {
                const firstId = models[0]?.id
                if (typeof firstId === 'string' && firstId.trim()) {
                  setSelectedModel(firstId)
                }
              }
            } catch { }
          }
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
      console.log('[DEBUG] loadAIProviders disabled; returning empty providers')
      setAiProviders([])
      setActiveProvider(null)
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
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{ user_id: user.id, title: 'New Chat' }])
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

  // Helper functions to extract context item data
  const getCourseById = (courseId: number): any | null => {
    if (!canvasContext?.courses) return null
    return canvasContext.courses.find((c: any) => c.id === courseId) || null
  }

  const getAssignmentById = (assignmentId: number): { assignment: any; course: any } | null => {
    if (!canvasContext?.courses) return null
    for (const course of canvasContext.courses) {
      const assignment = (course.assignments || []).find((a: any) => a.id === assignmentId)
      if (assignment) {
        return { assignment, course }
      }
    }
    return null
  }

  const getModuleById = (moduleId: number): { module: any; course: any } | null => {
    if (!canvasContext?.courses) return null
    for (const course of canvasContext.courses) {
      const module = (course.modules || []).find((m: any) => m.id === moduleId)
      if (module) {
        return { module, course }
      }
    }
    return null
  }

  const getSelectedContextItems = (): Array<{ id: number; type: 'course' | 'assignment' | 'module'; name: string; code?: string }> => {
    const items: Array<{ id: number; type: 'course' | 'assignment' | 'module'; name: string; code?: string }> = []

    // Add courses
    selectedContext.courses.forEach((courseId) => {
      const course = getCourseById(courseId)
      if (course) {
        items.push({
          id: courseId,
          type: 'course',
          name: course.name || `Course ${courseId}`,
          code: course.code || course.course_code
        })
      }
    })

    // Add assignments
    selectedContext.assignments.forEach((assignmentId) => {
      const result = getAssignmentById(assignmentId)
      if (result) {
        items.push({
          id: assignmentId,
          type: 'assignment',
          name: result.assignment.name || `Assignment ${assignmentId}`,
          code: result.course.code || result.course.course_code
        })
      }
    })

    // Add modules
    selectedContext.modules.forEach((moduleId) => {
      const result = getModuleById(moduleId)
      if (result) {
        items.push({
          id: moduleId,
          type: 'module',
          name: result.module.name || `Module ${moduleId}`,
          code: result.course.code || result.course.course_code
        })
      }
    })

    return items
  }

  const filterCanvasContext = (context: any, selected: { courses: number[]; assignments: number[]; modules: number[] }): any | null => {
    if (!context || !context.courses || !Array.isArray(context.courses)) {
      return context
    }

    // If nothing is selected, return all context (default behavior)
    if (selected.courses.length === 0 && selected.assignments.length === 0 && selected.modules.length === 0) {
      return context
    }

    const filteredCourses: any[] = []

    // Process each course
    for (const course of context.courses) {
      const courseId = course.id
      const isCourseSelected = selected.courses.includes(courseId)

      // If entire course is selected, include it with all assignments/modules
      if (isCourseSelected) {
        filteredCourses.push({
          ...course,
          assignments: course.assignments || [],
          modules: course.modules || []
        })
        continue
      }

      // Check if any assignments from this course are selected
      const selectedAssignments = (course.assignments || []).filter((a: any) =>
        selected.assignments.includes(a.id)
      )

      // Check if any modules from this course are selected
      const selectedModules = (course.modules || []).filter((m: any) =>
        selected.modules.includes(m.id)
      )

      // If specific assignments or modules are selected, include the course with filtered items
      if (selectedAssignments.length > 0 || selectedModules.length > 0) {
        filteredCourses.push({
          ...course,
          assignments: selectedAssignments,
          modules: selectedModules
        })
      }
    }

    return filteredCourses.length > 0 ? { courses: filteredCourses } : null
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
    // Filter context based on selections
    const filteredContext = canvasContext
      ? filterCanvasContext(canvasContext, selectedContext)
      : null

    // Get selected context items to include in message parts
    const contextItems = getSelectedContextItems()
    const contextParts = contextItems.map((item) => ({
      type: 'context',
      context: item,
    }))

    await sendChatMessage(
      { 
        role: 'user', 
        parts: [
          { type: 'text', text: message.text }, 
          ...(Array.isArray(message.files) ? message.files : []),
          ...contextParts,
        ] 
      } as any,
      {
        body: {
          model: selectedModel,
          webSearch,
          analysisMode,
          canvas_token: canvasStatus === 'connected' ? canvasToken : undefined,
          canvas_url: canvasStatus === 'connected' ? canvasUrl : undefined,
          canvasContext: filteredContext || undefined,
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
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, role, ui_parts, metadata, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      const loadedMessages = data.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: Array.isArray(msg.ui_parts)
          ? msg.ui_parts
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => String(p.text || ''))
            .join('')
          : '',
        timestamp: new Date(msg.created_at),
        provider_type: msg.metadata?.provider_type,
        provider_id: msg.metadata?.provider_id,
      }))

      setMessages(loadedMessages)
      const uiHistory = data.map((msg: any) => ({ id: msg.id, role: msg.role, parts: Array.isArray(msg.ui_parts) ? msg.ui_parts : [] }))
      setUIMessages(uiHistory as any)
      try {
        const lastAssistantInHistory = [...uiHistory].reverse().find((m: any) => m.role === 'assistant')
        if (lastAssistantInHistory?.id) {
          lastUpdatedAssistantIdRef.current = String(lastAssistantInHistory.id)
        }
      } catch { }
      setCurrentSession({ ...session, messages: loadedMessages })
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
          <img src="/dog_logo.png" alt="Lulu logo" className="w-64 h-auto mb-4" />
          <Shimmer duration={1}>Loading workspace</Shimmer>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-x-hidden">
      <div className="hidden md:block flex-shrink-0">
        <EnhancedSidebar
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

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
          <Button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" variant="ghost" size="icon" className="absolute right-3 top-3 z-50">
            <X className="w-4 h-4" />
          </Button>
          <div className="absolute left-0 top-0 h-full w-80">
            <EnhancedSidebar
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
                  <img src="/dog_chat.png" alt="Lulu chat assistant illustration" className="w-full h-auto" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Start a conversation</h2>
                <p className="text-slate-600 mb-8">Ask about your courses, assignments, modules, or Canvas announcements. I’ll guide you.</p>
                {syncingCanvas && <p className="text-slate-500">Syncing Canvas data...</p>}
              </div>
            ) : (
              uiMessages.map((message) => {
                const fileParts = message.parts.filter((p) => p.type === 'file') as any[]
                const contextParts = message.parts.filter((p) => (p as any).type === 'context') as any[]
                const textParts = message.parts.filter((p) => p.type === 'text') as any[]
                const textDeltaParts = message.parts.filter((p) => (p as any).type === 'text-delta') as any[]
                const toolParts = message.parts.filter((p) => typeof (p as any).type === 'string' && (p as any).type.startsWith('tool-')) as ToolUIPart[]
                const reasoningParts = message.parts.filter((p) => (p as any).type === 'reasoning') as any[]
                const reasoningDeltaParts = message.parts.filter((p) => (p as any).type === 'reasoning-delta') as any[]

                const isMessageStreaming = message.role === 'assistant' && (textDeltaParts.length > 0 || reasoningDeltaParts.length > 0)

                return (
                  <div key={message.id}>
                    {message.role === 'assistant' && message.parts.filter((p) => p.type === 'source-url').length > 0 && (
                      <Sources>
                        <SourcesTrigger count={message.parts.filter((p) => p.type === 'source-url').length} />
                        {message.parts.filter((p) => p.type === 'source-url').map((part, i) => (
                          <SourcesContent key={`${message.id}-${i}`}>
                            <Source href={(part as any).url} title={(part as any).url} />
                          </SourcesContent>
                        ))}
                      </Sources>
                    )}
                    <AIMessage from={message.role}>
                      {(fileParts.length > 0 || contextParts.length > 0) && (
                        <MessageAttachments className="mb-2">
                          {fileParts.map((fp, idx) => (
                            <MessageAttachment key={`${message.id}-file-${idx}`} data={fp} />
                          ))}
                          {contextParts.map((cp, idx) => (
                            <MessageContextAttachment 
                              key={`${message.id}-context-${idx}`} 
                              context={cp.context} 
                            />
                          ))}
                        </MessageAttachments>
                      )}
                      <AIMessageContent className="w-fit max-w-[85%] min-w-0">
                        {message.parts.map((part, idx) => {
                          const type = part.type

                          if (type === 'text') {
                            return (
                              <MessageResponse key={`${message.id}-text-${idx}`}>
                                {part.text}
                              </MessageResponse>
                            )
                          }

                          if (type === 'reasoning') {
                            return (
                              <Reasoning
                                key={`${message.id}-reasoning-${idx}`}
                                isStreaming={isMessageStreaming && idx === message.parts.length - 1}
                                defaultOpen
                              >
                                <ReasoningTrigger />
                                <ReasoningContent>
                                  {part.text}
                                </ReasoningContent>
                              </Reasoning>
                            )
                          }

                          if (type.startsWith('tool-')) {
                            const tp = part as unknown as ToolUIPart
                            const toolName = tp.type.split('-').slice(1).join('-')
                            const isUITool = [
                              'list_courses',
                              'get_assignments',
                              'get_modules',
                              'get_calendar_events',
                              'get_page_content',
                              'get_file',
                              'get_assignment_grade',
                              'get_assignment_feedback_and_rubric',
                              'analyze_rubric',
                              'provide_rubric_analysis',
                              'webSearch'
                            ].includes(toolName)

                            if (isUITool && tp.state === 'output-available') {
                              return (
                                <div className="mt-2 w-full max-w-full min-w-0 break-words" key={`${message.id}-tool-${idx}`}>
                                  <ToolRenderer toolName={toolName} result={tp.output} />
                                </div>
                              )
                            }

                            return (
                              <div className="mt-2 w-full max-w-full min-w-0 overflow-x-auto break-words" key={`${message.id}-tool-${idx}`}>
                                <Tool key={`${message.id}-tool-${idx}-${(message.role === 'assistant' && (textDeltaParts.length > 0 || reasoningDeltaParts.length > 0 || textParts.length > 0)) ? 'collapsed' : 'open'}`} defaultOpen={!(message.role === 'assistant' && (textDeltaParts.length > 0 || reasoningDeltaParts.length > 0 || textParts.length > 0))}>
                                  <ToolHeader type={tp.type} state={tp.state} />
                                  <ToolContent>
                                    <ToolInput input={tp.input} />
                                    {'error' in tp && tp.error ? (
                                      <ToolOutput className="min-w-0" output={null} errorText={String(tp.error)} />
                                    ) : (
                                      <div className="mt-2 min-w-0">
                                        <ToolRenderer toolName={toolName} result={'output' in tp ? tp.output : undefined} />
                                      </div>
                                    )}
                                  </ToolContent>
                                </Tool>
                              </div>
                            )
                          }

                          return null
                        })}
                        {message.role === 'assistant' && !isMessageStreaming && status !== 'streaming' && status !== 'submitted' && (
                          <div className="mt-1">
                            <MessageActions>
                              <MessageAction tooltip="Copy" onClick={() => { const text = textParts.map((p: any) => String(p.text || '')).join(''); navigator.clipboard.writeText(text); }}>
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
                )
              })
            )}
            {(status === 'streaming' || status === 'submitted') && (
              <div className="flex flex-col items-start gap-2 p-2 rounded-md">
                <img src="/dog_thinking.png" alt="Lulu thinking" className="w-24 h-auto rounded" />
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
                  <Button aria-label="Generate suggestions" variant="outline" size="icon" type="button" onClick={regenerateAllSuggestions} disabled={status !== 'ready' || loadingSuggestions}>
                    <SparklesIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate suggestions</TooltipContent>
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
                  (dynamicSuggestions.length > 0 
                    ? dynamicSuggestions 
                    : analysisMode === 'rubric'
                      ? rubricSuggestions 
                      : staticSuggestions
                  ).map((s, i) => (
                    <Suggestion key={`${s}-${i}`} suggestion={s} disabled={status !== 'ready'} onClick={() => { onSubmitAI({ text: s }) }} />
                  ))
                )
              )}
            </Suggestions>
            <PromptInput
              className="px-4 pb-4 w-full"
              globalDrop
              multiple
              accept="application/pdf,image/*"
              maxFiles={4}
              maxFileSize={10 * 1024 * 1024}
              onSubmit={onSubmitAI}
            >
              <PromptInputHeader>
                {canvasContext && canvasContext.courses && (
                  <Popover open={contextSelectorOpen} onOpenChange={setContextSelectorOpen}>
                    <PopoverTrigger asChild>
                      <PromptInputButton type="button" size="sm" variant="outline">
                        <FolderIcon className="text-muted-foreground" size={12} />
                        <span>
                          {selectedContext.courses.length + selectedContext.assignments.length + selectedContext.modules.length > 0
                            ? `${selectedContext.courses.length + selectedContext.assignments.length + selectedContext.modules.length}`
                            : 'Context'}
                        </span>
                      </PromptInputButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <PromptInputCommand>
                        <PromptInputCommandInput placeholder="Search courses, assignments, modules..." />
                        <PromptInputCommandList>
                          <PromptInputCommandEmpty>No context found.</PromptInputCommandEmpty>
                          <PromptInputCommandGroup heading="Courses">
                            {canvasContext.courses.map((course: any) => {
                              const isSelected = selectedContext.courses.includes(course.id)
                              return (
                                <PromptInputCommandItem
                                  key={`course-${course.id}`}
                                  value={`course-${course.id}`}
                                  onSelect={() => {
                                    setSelectedContext(prev => ({
                                      ...prev,
                                      courses: isSelected
                                        ? prev.courses.filter(id => id !== course.id)
                                        : [...prev.courses, course.id]
                                    }))
                                  }}
                                >
                                  <FolderIcon className="size-4" />
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">{course.name}</span>
                                    <span className="text-muted-foreground text-xs">{course.code}</span>
                                  </div>
                                  {isSelected && <CheckIcon className="ml-auto size-4" />}
                                </PromptInputCommandItem>
                              )
                            })}
                          </PromptInputCommandGroup>
                          <PromptInputCommandSeparator />
                          <PromptInputCommandGroup heading="Assignments">
                            {canvasContext.courses.flatMap((course: any) =>
                              (course.assignments || []).map((assignment: any) => {
                                const isSelected = selectedContext.assignments.includes(assignment.id)
                                return (
                                  <PromptInputCommandItem
                                    key={`assignment-${assignment.id}`}
                                    value={`assignment-${assignment.id}`}
                                    onSelect={() => {
                                      setSelectedContext(prev => ({
                                        ...prev,
                                        assignments: isSelected
                                          ? prev.assignments.filter(id => id !== assignment.id)
                                          : [...prev.assignments, assignment.id]
                                      }))
                                    }}
                                  >
                                    <FileText className="size-4" />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm">{assignment.name}</span>
                                      <span className="text-muted-foreground text-xs">{course.code}</span>
                                    </div>
                                    {isSelected && <CheckIcon className="ml-auto size-4" />}
                                  </PromptInputCommandItem>
                                )
                              })
                            )}
                          </PromptInputCommandGroup>
                          <PromptInputCommandSeparator />
                          <PromptInputCommandGroup heading="Modules">
                            {canvasContext.courses.flatMap((course: any) =>
                              (course.modules || []).map((module: any) => {
                                const isSelected = selectedContext.modules.includes(module.id)
                                return (
                                  <PromptInputCommandItem
                                    key={`module-${module.id}`}
                                    value={`module-${module.id}`}
                                    onSelect={() => {
                                      setSelectedContext(prev => ({
                                        ...prev,
                                        modules: isSelected
                                          ? prev.modules.filter(id => id !== module.id)
                                          : [...prev.modules, module.id]
                                      }))
                                    }}
                                  >
                                    <LayersIcon className="size-4" />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm">{module.name}</span>
                                      <span className="text-muted-foreground text-xs">{course.code}</span>
                                    </div>
                                    {isSelected && <CheckIcon className="ml-auto size-4" />}
                                  </PromptInputCommandItem>
                                )
                              })
                            )}
                          </PromptInputCommandGroup>
                        </PromptInputCommandList>
                      </PromptInputCommand>
                    </PopoverContent>
                  </Popover>
                )}
                <PromptInputAttachments>
                  {(file) => (
                    <PromptInputAttachment data={file} />
                  )}
                </PromptInputAttachments>
                <PromptInputContexts
                  contexts={getSelectedContextItems()}
                  onRemove={(id, type) => {
                    setSelectedContext(prev => {
                      if (type === 'course') {
                        return { ...prev, courses: prev.courses.filter(cId => cId !== id) }
                      } else if (type === 'assignment') {
                        return { ...prev, assignments: prev.assignments.filter(aId => aId !== id) }
                      } else {
                        return { ...prev, modules: prev.modules.filter(mId => mId !== id) }
                      }
                    })
                  }}
                />
              </PromptInputHeader>
              <PromptInputBody>
                <PromptInputTextarea ref={textareaRef} placeholder="Ask about your courses, assignments, modules..." className="w-full" />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools className="flex flex-wrap md:flex-nowrap gap-1">
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                  <PromptInputSpeechButton textareaRef={textareaRef} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PromptInputButton 
                        type="button" 
                        onClick={() => setWebSearch(v => !v)}
                      >
                        <GlobeIcon className={`size-4 ${webSearch ? 'text-blue-500 dark:text-blue-400' : ''}`} />
                      </PromptInputButton>
                    </TooltipTrigger>
                    <TooltipContent>
                      {webSearch 
                        ? 'Web Search enabled - AI will search the web for current information'
                        : 'Enable Web Search to allow AI to search the web for current information'}
                    </TooltipContent>
                  </Tooltip>
                  <Popover open={analysisModeOpen} onOpenChange={setAnalysisModeOpen}>
                    <PopoverTrigger asChild>
                      <PromptInputButton type="button">
                        {analysisMode === 'rubric' ? (
                          <FileText className="size-4" />
                        ) : analysisMode === 'quiz' ? (
                          <FileQuestion className="size-4" />
                        ) : analysisMode === 'study-plan' ? (
                          <BookOpen className="size-4" />
                        ) : (
                          <GraduationCap className="size-4" />
                        )}
                        <span className="ml-1">
                          {analysisMode === 'rubric' ? 'Rubric' : analysisMode === 'quiz' ? 'Quiz' : analysisMode === 'study-plan' ? 'Study Plan' : 'Generic'}
                        </span>
                      </PromptInputButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <PromptInputCommand>
                        <PromptInputCommandInput placeholder="Search analysis modes..." />
                        <PromptInputCommandList>
                          <PromptInputCommandEmpty>No analysis mode found.</PromptInputCommandEmpty>
                          <PromptInputCommandGroup heading="Analysis Modes">
                            <PromptInputCommandItem
                              value="generic"
                              onSelect={() => {
                                setAnalysisMode(null)
                                setAnalysisModeOpen(false)
                              }}
                            >
                              <GraduationCap className="size-4" />
                              <span>Generic</span>
                              {analysisMode === null && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="rubric"
                              onSelect={() => {
                                setAnalysisMode('rubric')
                                setAnalysisModeOpen(false)
                              }}
                            >
                              <FileText className="size-4" />
                              <span>Rubric Analysis</span>
                              {analysisMode === 'rubric' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="quiz"
                              onSelect={() => {
                                setAnalysisMode('quiz')
                                setAnalysisModeOpen(false)
                              }}
                            >
                              <FileQuestion className="size-4" />
                              <span>Quiz Analysis</span>
                              {analysisMode === 'quiz' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="study-plan"
                              onSelect={() => {
                                setAnalysisMode('study-plan')
                                setAnalysisModeOpen(false)
                              }}
                            >
                              <BookOpen className="size-4" />
                              <span>Study Plan</span>
                              {analysisMode === 'study-plan' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                          </PromptInputCommandGroup>
                        </PromptInputCommandList>
                      </PromptInputCommand>
                    </PopoverContent>
                  </Popover>
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
