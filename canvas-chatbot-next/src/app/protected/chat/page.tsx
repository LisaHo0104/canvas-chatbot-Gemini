'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
import { SystemPromptSelector } from '@/components/chat/SystemPromptSelector'
import { AIProvider } from '@/types/ai-providers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'

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
  const [mode, setMode] = useState<string | null>(null)
  const [modeOpen, setModeOpen] = useState(false)
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [openRouterModels, setOpenRouterModels] = useState<Array<{ id: string; name: string; chef: string; chefSlug: string; providers: string[] }>>([
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', chef: 'Anthropic', chefSlug: 'anthropic', providers: ['anthropic'] },
    { id: 'openai/gpt-4o', name: 'GPT-4o', chef: 'OpenAI', chefSlug: 'openai', providers: ['openai', 'azure'] },
    { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', chef: 'Google', chefSlug: 'google', providers: ['google'] },
  ])
  const [titleGenerating, setTitleGenerating] = useState(false)
  // Items selected on context page (available pool) with names
  const [availableContext, setAvailableContext] = useState<{
    courses: Array<{ id: number; name: string; code?: string }>
    assignments: Array<{ id: number; name: string }>
    modules: Array<{ id: number; name: string }>
  }>({
    courses: [],
    assignments: [],
    modules: []
  })
  // Items selected for current chat session (just IDs for internal state)
  const [selectedContext, setSelectedContext] = useState<{ courses: number[]; assignments: number[]; modules: number[] }>({
    courses: [],
    assignments: [],
    modules: []
  })
  const [contextSelectorOpen, setContextSelectorOpen] = useState(false)
  // Selected system prompts for current chat session
  const [selectedSystemPromptIds, setSelectedSystemPromptIds] = useState<string[]>([])
  
  // Mapping between modes and system prompt template types
  const MODE_TO_TEMPLATE_TYPE: Record<string, string> = {
    'rubric': 'rubric_analysis',
    'quiz': 'quiz_generation',
    'study-plan': 'study_plan',
  }
  
  const TEMPLATE_TYPE_TO_MODE: Record<string, string | null> = {
    'rubric_analysis': 'rubric',
    'quiz_generation': 'quiz',
    'study_plan': 'study-plan',
    'default': null,
  }
  
  // Store system prompt templates and user prompts for sync logic
  const [systemPromptTemplates, setSystemPromptTemplates] = useState<Array<{ id: string; template_type: string }>>([])
  const [userPrompts, setUserPrompts] = useState<Array<{ id: string; template_type: string | null }>>([])
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

  // Load system prompt templates and user prompts for sync logic
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('/api/system-prompts')
        if (response.ok) {
          const data = await response.json()
          const templates = (data.templates || []).map((t: any) => ({
            id: t.id,
            template_type: t.template_type,
          }))
          const userPromptsData = (data.userPrompts || []).map((p: any) => ({
            id: p.id,
            template_type: p.template_type,
          }))
          setSystemPromptTemplates(templates)
          setUserPrompts(userPromptsData)
          
          // Ensure at least one prompt is selected on initial load
          setSelectedSystemPromptIds((currentIds) => {
            if (currentIds.length === 0 && templates.length > 0) {
              const defaultTemplate = templates.find((t: any) => t.template_type === 'default')
              if (defaultTemplate) {
                return [defaultTemplate.id]
              } else {
                // Fallback to first template if default not found
                return [templates[0].id]
              }
            }
            return currentIds
          })
        }
      } catch (error) {
        console.error('Failed to load system prompt templates:', error)
      }
    }
    loadTemplates()
  }, [selectedSystemPromptIds])

  // Wrapper for setMode that auto-syncs with system prompts
  const handleModeChange = useCallback((newMode: string | null) => {
    // Update mode state
    setMode(newMode)
    
    // Get template types to identify Lulu prompts
    const templateTypes = new Set(systemPromptTemplates.map(t => t.template_type).filter(Boolean))
    
    // Preserve custom user prompts (those without template_type or not matching a template)
    const customPromptIds = selectedSystemPromptIds.filter(id => {
      const userPrompt = userPrompts.find(p => p.id === id)
      if (!userPrompt) return false
      // It's a custom prompt if it doesn't have a template_type or the template_type doesn't match any template
      return !userPrompt.template_type || !templateTypes.has(userPrompt.template_type)
    })
    
    // Find the corresponding template for the new mode
    if (newMode === null) {
      // Generic mode - use default template, but preserve custom prompts
      const defaultTemplate = systemPromptTemplates.find(t => t.template_type === 'default')
      if (defaultTemplate) {
        setSelectedSystemPromptIds([defaultTemplate.id, ...customPromptIds])
      } else {
        setSelectedSystemPromptIds(customPromptIds)
      }
    } else {
      const templateType = MODE_TO_TEMPLATE_TYPE[newMode]
      if (templateType) {
        const template = systemPromptTemplates.find(t => t.template_type === templateType)
        if (template) {
          // Auto-select the corresponding Lulu template, but preserve custom prompts
          setSelectedSystemPromptIds([template.id, ...customPromptIds])
        } else {
          // Template not found, just preserve custom prompts
          setSelectedSystemPromptIds(customPromptIds)
        }
      } else {
        // Unknown mode, just preserve custom prompts
        setSelectedSystemPromptIds(customPromptIds)
      }
    }
  }, [systemPromptTemplates, userPrompts, selectedSystemPromptIds])

  // Wrapper for setSelectedSystemPromptIds that auto-syncs with mode
  const handleSystemPromptChange = useCallback((newPromptIds: string[]) => {
    // Ensure at least one prompt is always selected
    // If trying to deselect all, keep at least the default template
    let finalPromptIds = newPromptIds
    if (newPromptIds.length === 0) {
      const defaultTemplate = systemPromptTemplates.find(t => t.template_type === 'default')
      if (defaultTemplate) {
        finalPromptIds = [defaultTemplate.id]
      } else if (systemPromptTemplates.length > 0) {
        // Fallback to first template if default not found
        finalPromptIds = [systemPromptTemplates[0].id]
      }
    }
    
    // Update system prompt selection
    setSelectedSystemPromptIds(finalPromptIds)
    
    // Check if any selected prompt matches a mode template
    if (finalPromptIds.length === 0) {
      // No prompts selected, clear mode (shouldn't happen due to check above, but just in case)
      setMode(null)
      return
    }
    
    // Check the first selected prompt (we only sync single selections for modes)
    const firstPromptId = finalPromptIds[0]
    const template = systemPromptTemplates.find(t => t.id === firstPromptId)
    
    if (template && template.template_type in TEMPLATE_TYPE_TO_MODE) {
      // Auto-update mode to match
      const correspondingMode = TEMPLATE_TYPE_TO_MODE[template.template_type]
      setMode(correspondingMode)
    } else {
      // Custom prompt selected, clear mode
      setMode(null)
    }
  }, [systemPromptTemplates])

  // Load available context items from database (selected on context page)
  // These now include names stored in the database
  const loadAvailableContext = useCallback(async () => {
    if (canvasStatus !== 'connected') return
    try {
      const res = await fetch('/api/context/selection')
      if (res.ok) {
        const data = await res.json()
        // API now returns objects with {id, name, code?} format
        setAvailableContext({
          courses: data.courses || [],
          assignments: data.assignments || [],
          modules: data.modules || [],
        })
        
        console.log('[DEBUG] Loaded available context with names:', availableContext)
      } else {
        console.error('[DEBUG] Failed to load available context, status:', res.status)
      }
    } catch (e) {
      console.error('Failed to load available context', e)
    }
  }, [canvasStatus])

  // Helper functions to get names from stored context data
  const getCourseName = useCallback((courseId: number): string => {
    const course = availableContext.courses.find(c => c.id === courseId)
    return course?.name || `Course ${courseId}`
  }, [availableContext])

  const getCourseCode = useCallback((courseId: number): string | undefined => {
    const course = availableContext.courses.find(c => c.id === courseId)
    return course?.code
  }, [availableContext])

  const getAssignmentName = useCallback((assignmentId: number): string => {
    const assignment = availableContext.assignments.find(a => a.id === assignmentId)
    return assignment?.name || `Assignment ${assignmentId}`
  }, [availableContext])

  const getModuleName = useCallback((moduleId: number): string => {
    const module = availableContext.modules.find(m => m.id === moduleId)
    return module?.name || `Module ${moduleId}`
  }, [availableContext])

  useEffect(() => {
    loadAvailableContext()
  }, [loadAvailableContext])

  // Reload available context when context selector popover opens to ensure latest data
  useEffect(() => {
    if (contextSelectorOpen && canvasStatus === 'connected') {
      loadAvailableContext()
    }
  }, [contextSelectorOpen, canvasStatus, loadAvailableContext])

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

  // Helper function to get selected context items (using IDs from Supabase)
  const getSelectedContextItems = (): Array<{ id: number; type: 'course' | 'assignment' | 'module'; name: string; code?: string }> => {
    const items: Array<{ id: number; type: 'course' | 'assignment' | 'module'; name: string; code?: string }> = []

    // Add courses
    selectedContext.courses.forEach((courseId) => {
      items.push({
        id: courseId,
        type: 'course',
        name: getCourseName(courseId),
        code: getCourseCode(courseId),
      })
    })

    // Add assignments
    selectedContext.assignments.forEach((assignmentId) => {
      items.push({
        id: assignmentId,
        type: 'assignment',
        name: getAssignmentName(assignmentId),
      })
    })

    // Add modules
    selectedContext.modules.forEach((moduleId) => {
      items.push({
        id: moduleId,
        type: 'module',
        name: getModuleName(moduleId),
      })
    })

    return items
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
          mode,
          canvas_token: canvasStatus === 'connected' ? canvasToken : undefined,
          canvas_url: canvasStatus === 'connected' ? canvasUrl : undefined,
          selected_context: selectedContext.courses.length > 0 || selectedContext.assignments.length > 0 || selectedContext.modules.length > 0 ? selectedContext : undefined,
          selected_system_prompt_ids: selectedSystemPromptIds.length > 0 ? selectedSystemPromptIds : undefined,
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
                <p className="text-slate-600 mb-8">Ask about your courses, assignments, modules, or Canvas announcements. I'll guide you.</p>
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
                    : mode === 'rubric'
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
                <SystemPromptSelector
                  selectedPromptIds={selectedSystemPromptIds}
                  onSelectionChange={handleSystemPromptChange}
                  mode={mode}
                />
                {canvasStatus === 'connected' && (
                  <Popover open={contextSelectorOpen} onOpenChange={setContextSelectorOpen}>
                    <PopoverTrigger asChild>
                      <PromptInputButton 
                        type="button" 
                        size="sm" 
                        variant="outline"
                      >
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
                          {availableContext.courses.length === 0 && 
                           availableContext.assignments.length === 0 && 
                           availableContext.modules.length === 0 ? (
                            <PromptInputCommandEmpty>
                              No context available. Go to the Context page to select items.
                            </PromptInputCommandEmpty>
                          ) : (
                            <>
                              {availableContext.courses.length > 0 && (
                                <>
                                  <PromptInputCommandGroup heading="Courses">
                                    {availableContext.courses.map((course) => {
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
                                            {course.code && (
                                              <span className="text-xs text-muted-foreground">{course.code}</span>
                                            )}
                                          </div>
                                          {isSelected && <CheckIcon className="ml-auto size-4" />}
                                        </PromptInputCommandItem>
                                      )
                                    })}
                                  </PromptInputCommandGroup>
                                  {(availableContext.assignments.length > 0 || availableContext.modules.length > 0) && (
                                    <PromptInputCommandSeparator />
                                  )}
                                </>
                              )}
                              {availableContext.assignments.length > 0 && (
                                <>
                                  <PromptInputCommandGroup heading="Assignments">
                                    {availableContext.assignments.map((assignment) => {
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
                                          </div>
                                          {isSelected && <CheckIcon className="ml-auto size-4" />}
                                        </PromptInputCommandItem>
                                      )
                                    })}
                                  </PromptInputCommandGroup>
                                  {availableContext.modules.length > 0 && (
                                    <PromptInputCommandSeparator />
                                  )}
                                </>
                              )}
                              {availableContext.modules.length > 0 && (
                                <>
                                  <PromptInputCommandGroup heading="Modules">
                                    {availableContext.modules.map((module) => {
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
                                          </div>
                                          {isSelected && <CheckIcon className="ml-auto size-4" />}
                                        </PromptInputCommandItem>
                                      )
                                    })}
                                  </PromptInputCommandGroup>
                                </>
                              )}
                            </>
                          )}
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex">
                        <PromptInputSpeechButton textareaRef={textareaRef} disabled className="cursor-not-allowed" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      This feature will be ready soon
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex">
                        <PromptInputButton 
                          type="button" 
                          onClick={() => setWebSearch(v => !v)}
                          disabled
                          className="cursor-not-allowed"
                        >
                          <GlobeIcon className={`size-4 ${webSearch ? 'text-blue-500 dark:text-blue-400' : ''}`} />
                        </PromptInputButton>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      This feature will be ready soon
                    </TooltipContent>
                  </Tooltip>
                  <Popover open={modeOpen} onOpenChange={setModeOpen}>
                    <PopoverTrigger asChild>
                      <PromptInputButton type="button">
                        {mode === 'rubric' ? (
                          <FileText className="size-4" />
                        ) : mode === 'quiz' ? (
                          <FileQuestion className="size-4" />
                        ) : mode === 'study-plan' ? (
                          <BookOpen className="size-4" />
                        ) : (
                          <GraduationCap className="size-4" />
                        )}
                        <span className="ml-1">
                          {mode === 'rubric' ? 'Rubric' : mode === 'quiz' ? 'Quiz' : mode === 'study-plan' ? 'Study Plan' : 'Generic'}
                        </span>
                      </PromptInputButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <PromptInputCommand>
                        <PromptInputCommandInput placeholder="Search modes..." />
                        <PromptInputCommandList>
                          <PromptInputCommandEmpty>No mode found.</PromptInputCommandEmpty>
                          <PromptInputCommandGroup heading="Modes">
                            <PromptInputCommandItem
                              value="generic"
                              onSelect={() => {
                                handleModeChange(null)
                                setModeOpen(false)
                              }}
                            >
                              <GraduationCap className="size-4" />
                              <span>Generic</span>
                              {mode === null && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="rubric"
                              onSelect={() => {
                                handleModeChange('rubric')
                                setModeOpen(false)
                              }}
                            >
                              <FileText className="size-4" />
                              <span>Rubric Analysis</span>
                              {mode === 'rubric' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="quiz"
                              onSelect={() => {
                                handleModeChange('quiz')
                                setModeOpen(false)
                              }}
                            >
                              <FileQuestion className="size-4" />
                              <span>Quiz Analysis</span>
                              {mode === 'quiz' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="study-plan"
                              onSelect={() => {
                                handleModeChange('study-plan')
                                setModeOpen(false)
                              }}
                            >
                              <BookOpen className="size-4" />
                              <span>Study Plan</span>
                              {mode === 'study-plan' && <CheckIcon className="ml-auto size-4" />}
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
