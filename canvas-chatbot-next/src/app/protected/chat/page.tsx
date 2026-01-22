'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { X, CopyIcon, RefreshCcwIcon, GlobeIcon, CheckIcon, SparklesIcon, FolderIcon, LayersIcon, FileText, BookOpen, GraduationCap, FileQuestion, Info, History, StickyNote } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { getModeColors, getModeBadgeColors, type ModeType } from '@/lib/mode-colors'
import { TextSelector } from '@/components/ai-editing/text-selector'
import { FloatingToolbar } from '@/components/ai-editing/floating-toolbar'
import { ComparisonView } from '@/components/ai-editing/comparison-view'
import { ResizableSplitPane } from '@/components/ui/resizable-split-pane'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
// Import extracted types, hooks, components, and utilities
import type { ChatSession } from './types'
import { MODE_TO_TEMPLATE_TYPE, TEMPLATE_TYPE_TO_MODE, formatDate, formatTime } from './utils'
import { useChatState } from './hooks/useChatState'
import { useSuggestions } from './hooks/useSuggestions'
import { useContextManagement } from './hooks/useContextManagement'
import { useSessionManagement } from './hooks/useSessionManagement'
import { useTitleAndSuggestions } from './hooks/useTitleAndSuggestions'
import { createChatHandlers } from './handlers/chatHandlers'
import { ChatHeader } from './components/ChatHeader'

let supabase: any = null

try {
  supabase = createSupabaseClient()
} catch (error) {
  console.error('Error creating Supabase client:', error)
}

export default function ChatPage() {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Use extracted hooks for state management
  const chatState = useChatState()
  const {
    user, setUser,
    loading, setLoading,
    aiProviders, setAiProviders,
    activeProvider, setActiveProvider,
    selectedModel, setSelectedModel,
    canvasInstitution, setCanvasInstitution,
    canvasUrl, setCanvasUrl,
    canvasToken, setCanvasToken,
    canvasStatus, setCanvasStatus,
    mobileMenuOpen, setMobileMenuOpen,
    historyDrawerOpen, setHistoryDrawerOpen,
    webSearch, setWebSearch,
    mode, setMode,
    modeOpen, setModeOpen,
    modelSelectorOpen, setModelSelectorOpen,
    fetchingModels, setFetchingModels,
    openRouterModels, setOpenRouterModels,
    titleGenerating, setTitleGenerating,
    availableContext, setAvailableContext,
    selectedContext, setSelectedContext,
    contextSelectorOpen, setContextSelectorOpen,
    selectedSystemPromptIds, setSelectedSystemPromptIds,
    artifactPanelOpen, setArtifactPanelOpen,
    artifactPanelData, setArtifactPanelData,
    textSelection, setTextSelection,
    editingState, setEditingState,
    systemPromptTemplates, setSystemPromptTemplates,
    userPrompts, setUserPrompts,
    hasContext,
  } = chatState

  // Session management
  const sessionManagement = useSessionManagement()
  const {
    sessions,
    setSessions,
    currentSession,
    setCurrentSession,
    messages,
    setMessages,
    loadChatSessions,
    createNewSession,
    startEphemeralSession,
    handleSessionSelect: sessionSelectHandler,
    handleSessionDelete: sessionDeleteHandler,
    handleSessionRename: sessionRenameHandler,
  } = sessionManagement

  // Suggestions management
  const suggestions = useSuggestions(hasContext, selectedContext)
  const {
    dynamicSuggestions,
    setDynamicSuggestions,
    loadingSuggestions,
    setLoadingSuggestions,
    suggestionsVisible,
    setSuggestionsVisible,
    lastAssistantIdRef,
    lastUpdatedAssistantIdRef,
    suppressAutoSuggestionsRef,
    staticSuggestions,
    rubricSuggestions,
    quizSuggestions,
    studyPlanSuggestions,
    regenerateAllSuggestions: regenerateSuggestions,
  } = suggestions

  // Context management
  const { loadAvailableContext: loadContext, getCourseName, getCourseCode, getAssignmentName, getModuleName } = useContextManagement(availableContext, canvasStatus)

  const { messages: uiMessages, sendMessage: sendChatMessage, status, regenerate, setMessages: setUIMessages, addToolApprovalResponse, error } = useChat({
    api: '/api/chat',
    experimental_throttle: 50,
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
    },
    onError: (error: Error) => {
      console.error('Chat error:', error)
    }
  } as any)

  // Use extracted hook for title and suggestions generation
  useTitleAndSuggestions(
    uiMessages,
    status,
    selectedModel,
    activeProvider,
    currentSession,
    selectedContext,
    mode,
    setTitleGenerating,
    setLoadingSuggestions,
    setSuggestionsVisible,
    setDynamicSuggestions,
    setSessions,
    setCurrentSession,
    lastAssistantIdRef,
    lastUpdatedAssistantIdRef,
    suppressAutoSuggestionsRef
  )

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

  // Load available context
  useEffect(() => {
    const loadContextData = async () => {
      const data = await loadContext()
      if (data) {
        setAvailableContext(data)
      }
    }
    loadContextData()
  }, [loadContext, canvasStatus])

  // Reload available context when context selector popover opens to ensure latest data
  useEffect(() => {
    if (contextSelectorOpen && canvasStatus === 'connected') {
      const loadContextData = async () => {
        const data = await loadContext()
        if (data) {
          setAvailableContext(data)
        }
      }
      loadContextData()
    }
  }, [contextSelectorOpen, canvasStatus, loadContext])

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

  // Update session ID in localStorage when current session changes
  useEffect(() => {
    try {
      const id = currentSession?.id
      if (typeof window !== 'undefined') {
        ; (window as any).__currentSessionId = id || undefined
        if (id) localStorage.setItem('currentSessionId', id)
      }
    } catch { }
  }, [currentSession])

  // Create chat handlers
  const { onSubmitAI, handleRegenerate, getSelectedContextItems } = createChatHandlers(
    user,
    currentSession,
    createNewSession,
    sendChatMessage,
    selectedModel,
    webSearch,
    mode,
    canvasStatus,
    canvasToken,
    canvasUrl,
    selectedContext,
    selectedSystemPromptIds,
    availableContext,
    setUIMessages,
    uiMessages
  )

  // Wrapper for startEphemeralSession to also reset suggestions
  const handleStartEphemeralSession = () => {
    suppressAutoSuggestionsRef.current = false
    startEphemeralSession()
    setSuggestionsVisible(true)
    setDynamicSuggestions([])
    setUIMessages([])
  }

  // Wrapper for handleSessionSelect to include suggestions reset
  const handleSessionSelect = async (session: ChatSession) => {
    await sessionSelectHandler(
      session,
      setUIMessages,
      setSuggestionsVisible,
      setDynamicSuggestions,
      suppressAutoSuggestionsRef,
      lastUpdatedAssistantIdRef,
      handleCloseArtifact
    )
    setHistoryDrawerOpen(false)
  }

  // Wrapper for handleSessionDelete
  const handleSessionDelete = async (sessionId: string) => {
    await sessionDeleteHandler(sessionId, setUIMessages)
  }

  // Handler to open artifact panel
  const handleOpenArtifact = useCallback((type: 'quiz' | 'rubric' | 'note', data: any, messageId?: string) => {
    setArtifactPanelData({ type, data, messageId })
    setArtifactPanelOpen(true)
  }, [])

  // Handler to close artifact panel
  const handleCloseArtifact = useCallback(() => {
    setArtifactPanelOpen(false)
    setArtifactPanelData(null)
  }, [])

  // Clear UI messages when session is cleared
  useEffect(() => {
    if (!currentSession) {
      setUIMessages([])
    }
  }, [currentSession, setUIMessages])

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
      <EnhancedSidebar
        sessions={sessions}
        currentSession={currentSession}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleStartEphemeralSession}
        onSessionDelete={handleSessionDelete}
        onSessionRename={sessionRenameHandler}
        status={status}
        titleGenerating={titleGenerating}
        open={historyDrawerOpen}
        onOpenChange={setHistoryDrawerOpen}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-x-hidden">
        {artifactPanelOpen && artifactPanelData ? (
          <ResizableSplitPane
            defaultSplit={50}
            minLeft={20}
            maxLeft={80}
            minRight={20}
            maxRight={80}
            left={
              <div className="flex flex-col h-full min-h-0">
        <Conversation className="h-full relative">
                  <ConversationContent className="chat-content relative">
            <ChatHeader
              currentSession={currentSession}
              titleGenerating={titleGenerating}
              status={status}
              onHistoryClick={() => setHistoryDrawerOpen(true)}
            />           {status === 'error' && (
              <Alert className="max-w-3xl mx-auto" variant="destructive">
                <AlertTitle>Message failed</AlertTitle>
                <AlertDescription>
                  {error?.message?.includes('No endpoints found that support tool use') || error?.message?.includes('does not support tool use') ? (
                    <>
                      The selected model does not support tool use, which is required for quiz generation and other advanced features. Please select a model that supports tool use, such as:
                      <ul className="list-disc list-inside mt-2">
                        <li>google/gemini-2.0-flash-exp</li>
                        <li>anthropic/claude-3.5-sonnet</li>
                        <li>openai/gpt-4o</li>
                      </ul>
                    </>
                  ) : (
                    <>There was an error sending your message. {error?.message || 'Please check your Canvas settings and try again.'}</>
                  )}
                </AlertDescription>
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
                              'get_module',
                              'get_calendar_events',
                              'get_page_contents',
                              'get_file',
                              'get_assignment_grade',
                              'get_assignment_feedback_and_rubric',
                              'analyze_rubric',
                              'provide_rubric_analysis',
                              'generate_quiz_plan',
                              'provide_quiz_output',
                              'provide_note_output',
                              'provide_note_markdown',
                              'webSearch'
                            ].includes(toolName)

                            // Handle UITools - show custom UI for these tools
                            if (isUITool) {
                              // For generate_quiz_plan, show in all states where we have input or output
                              // For other tools, only show when output is available
                              const hasData = toolName === 'generate_quiz_plan' 
                                ? (tp.input || tp.output)
                                : tp.output
                              
                              const shouldShow = 
                                (toolName === 'generate_quiz_plan' && hasData) ||
                                (toolName === 'provide_note_markdown' && tp.state === 'output-available') ||
                                (toolName !== 'generate_quiz_plan' && toolName !== 'provide_note_markdown' && tp.state === 'output-available')
                              
                              if (shouldShow) {
                                // For generate_quiz_plan, prefer output but fall back to input
                                // For other tools, use output
                                const result = toolName === 'generate_quiz_plan' 
                                  ? (tp.output || tp.input)
                                  : tp.output
                                
                              return (
                                <div className="mt-2 w-full max-w-full min-w-0 break-words" key={`${message.id}-tool-${idx}`}>
                                    <ToolRenderer 
                                      toolName={toolName} 
                                      result={result}
                                      toolPart={tp}
                                      onViewFull={(type: 'quiz' | 'rubric' | 'note', data: any, messageId?: string) => {
                                        handleOpenArtifact(type, data, messageId)
                                      }}
                                      onApprove={() => {
                                        // Simply send "approve" as a regular text message
                                        try {
                                          sendChatMessage({
                                            role: 'user',
                                            parts: [{ type: 'text', text: 'approve' }]
                                          } as any, {
                                            body: {
                                              model: selectedModel,
                                              webSearch,
                                              mode,
                                              canvas_token: canvasStatus === 'connected' ? canvasToken : undefined,
                                              canvas_url: canvasStatus === 'connected' ? canvasUrl : undefined,
                                              selected_context: selectedContext.courses.length > 0 || selectedContext.assignments.length > 0 || selectedContext.modules.length > 0 ? selectedContext : undefined,
                                              selected_system_prompt_ids: selectedSystemPromptIds.length > 0 ? selectedSystemPromptIds : undefined,
                                            },
                                            headers: currentSession?.id ? { 'X-Session-ID': currentSession.id } : undefined,
                                          })
                                        } catch (error) {
                                          console.error('Error sending approve message:', error)
                                        }
                                      }}
                                    />
                                </div>
                              )
                              }
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
                                        <ToolRenderer 
                                          toolName={toolName} 
                                          result={
                                            toolName === 'generate_quiz_plan' 
                                              ? (tp.output || tp.input)
                                              : ('output' in tp ? tp.output : (tp.state === 'approval-requested' || tp.state === 'input-available' ? tp.input : undefined))
                                          }
                                          toolPart={tp}
                                          onViewFull={(type: 'quiz' | 'rubric' | 'note', data: any, messageId?: string) => {
                                            handleOpenArtifact(type, data, messageId)
                                          }}
                                          onApprove={() => {
                                            // Simply send "approve" as a regular text message
                                            try {
                                              sendChatMessage({
                                                role: 'user',
                                                parts: [{ type: 'text', text: 'approve' }]
                                              } as any, {
                                                body: {
                                                  model: selectedModel,
                                                  webSearch,
                                                  mode,
                                                  canvas_token: canvasStatus === 'connected' ? canvasToken : undefined,
                                                  canvas_url: canvasStatus === 'connected' ? canvasUrl : undefined,
                                                  selected_context: selectedContext.courses.length > 0 || selectedContext.assignments.length > 0 || selectedContext.modules.length > 0 ? selectedContext : undefined,
                                                  selected_system_prompt_ids: selectedSystemPromptIds.length > 0 ? selectedSystemPromptIds : undefined,
                                                },
                                                headers: currentSession?.id ? { 'X-Session-ID': currentSession.id } : undefined,
                                              })
                                            } catch (error) {
                                              console.error('Error sending approve message:', error)
                                            }
                                          }}
                                        />
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
                              <MessageAction tooltip="Regenerate" onClick={handleRegenerate}>
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
            {canvasStatus === 'missing' && (
              <div className="px-4 pt-4">
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Canvas Integration Required</AlertTitle>
                  <AlertDescription>
                    Canvas token not configured. Set up your Canvas integration in Context to enable Canvas features.
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => router.push('/protected/context')}
                    >
                      Go to Context
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <Suggestions className="px-4 pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button aria-label="Generate suggestions" variant="outline" size="icon" type="button" onClick={() => regenerateSuggestions(uiMessages, activeProvider, selectedModel, selectedContext, mode)} disabled={status !== 'ready' || loadingSuggestions}>
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
                      : mode === 'quiz'
                        ? quizSuggestions
                        : mode === 'study-plan'
                          ? studyPlanSuggestions
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
                      <PromptInputButton type="button" className={mode ? `${getModeColors(mode as ModeType).text}` : ''}>
                        {mode === 'rubric' ? (
                          <FileText className="size-4" />
                        ) : mode === 'quiz' ? (
                          <FileQuestion className="size-4" />
                        ) : mode === 'study-plan' ? (
                          <BookOpen className="size-4" />
                        ) : mode === 'note' ? (
                          <StickyNote className="size-4" />
                        ) : (
                          <GraduationCap className="size-4" />
                        )}
                        <span className="ml-1 flex items-center gap-1.5">
                          {mode === 'rubric' ? 'Rubric' : mode === 'quiz' ? 'Quiz Generation' : mode === 'study-plan' ? 'Study Plan' : mode === 'note' ? 'Note Mode' : 'Generic'}
                          {(mode === 'rubric' || mode === 'quiz' || mode === 'study-plan' || mode === 'note') && (
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors(mode as ModeType)}`}>Beta</Badge>
                          )}
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
                              <FileText className={`size-4 ${getModeColors('rubric').text}`} />
                              <span className="flex items-center gap-1.5">
                                Rubric Analysis
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors('rubric')}`}>Beta</Badge>
                              </span>
                              {mode === 'rubric' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="quiz"
                              onSelect={() => {
                                handleModeChange('quiz')
                                setModeOpen(false)
                              }}
                            >
                              <FileQuestion className={`size-4 ${getModeColors('quiz').text}`} />
                              <span className="flex items-center gap-1.5">
                                Quiz Generation
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors('quiz')}`}>Beta</Badge>
                              </span>
                              {mode === 'quiz' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="study-plan"
                              onSelect={() => {
                                handleModeChange('study-plan')
                                setModeOpen(false)
                              }}
                            >
                              <BookOpen className={`size-4 ${getModeColors('study-plan').text}`} />
                              <span className="flex items-center gap-1.5">
                                Study Plan
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors('study-plan')}`}>Beta</Badge>
                              </span>
                              {mode === 'study-plan' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="note"
                              onSelect={() => {
                                handleModeChange('note')
                                setModeOpen(false)
                              }}
                            >
                              <StickyNote className={`size-4 ${getModeColors('note').text}`} />
                              <span className="flex items-center gap-1.5">
                                Note Mode
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors('note')}`}>Beta</Badge>
                              </span>
                              {mode === 'note' && <CheckIcon className="ml-auto size-4" />}
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
            }
            right={
              <ArtifactPanel
                open={artifactPanelOpen}
                onClose={handleCloseArtifact}
                artifactType={artifactPanelData.type}
                artifactData={artifactPanelData.data}
                messageId={artifactPanelData.messageId}
              />
            }
          />
        ) : (
          <>
            <Conversation className="h-full relative">
          <ConversationContent className="chat-content relative">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
              <div className="px-4 py-3 flex items-center justify-between gap-4">
              {/* Left: History Button and Title */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => setHistoryDrawerOpen(true)}
                      aria-label="Open conversation history"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Conversation History</p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Chat Title */}
                <div className="flex-1 min-w-0">
                  {titleGenerating ? (
                    <Skeleton className="h-5 w-48" />
                  ) : (status === 'streaming' || status === 'submitted') && currentSession?.id ? (
                    <Shimmer as="h2" duration={1} className="text-lg font-semibold truncate">
                      {currentSession.title}
                    </Shimmer>
                  ) : (
                    <h2 className="text-lg font-semibold truncate">
                      {currentSession?.title || 'New Chat'}
                    </h2>
                  )}
                </div>
              </div>

              {/* Right: Metadata */}
              {currentSession && (
                <div className="flex items-center gap-4 text-sm text-slate-500 shrink-0">
                  <div className="hidden sm:flex items-center gap-2">
                    <span>{formatDate(currentSession.lastMessage)}</span>
                    <span>•</span>
                    <span>{formatTime(currentSession.lastMessage)}</span>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <span>
                      {currentSession.messages?.length || uiMessages.length} {((currentSession.messages?.length || uiMessages.length) === 1) ? 'message' : 'messages'}
                    </span>
                  </div>
                  <div className="hidden lg:flex items-center gap-2">
                    <span>•</span>
                    <span>
                      Created {currentSession.created_at.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
              </div>
              {status === 'error' && (
              <Alert className="max-w-3xl mx-auto" variant="destructive">
                <AlertTitle>Message failed</AlertTitle>
                <AlertDescription>
                  {error?.message?.includes('No endpoints found that support tool use') || error?.message?.includes('does not support tool use') ? (
                    <>
                      The selected model does not support tool use, which is required for quiz generation and other advanced features. Please select a model that supports tool use, such as:
                      <ul className="list-disc list-inside mt-2">
                        <li>google/gemini-2.0-flash-exp</li>
                        <li>anthropic/claude-3.5-sonnet</li>
                        <li>openai/gpt-4o</li>
                      </ul>
                    </>
                  ) : (
                    <>There was an error sending your message. {error?.message || 'Please check your Canvas settings and try again.'}</>
                  )}
                </AlertDescription>
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
                              'get_module',
                              'get_calendar_events',
                              'get_page_contents',
                              'get_file',
                              'get_assignment_grade',
                              'get_assignment_feedback_and_rubric',
                              'analyze_rubric',
                              'provide_rubric_analysis',
                              'generate_quiz_plan',
                              'provide_quiz_output',
                              'provide_note_output',
                              'provide_note_markdown',
                              'webSearch'
                            ].includes(toolName)

                            // Handle UITools - show custom UI for these tools
                            if (isUITool) {
                              // For generate_quiz_plan, show in all states where we have input or output
                              // For other tools, only show when output is available
                              const hasData = toolName === 'generate_quiz_plan' 
                                ? (tp.input || tp.output)
                                : tp.output
                              
                              const shouldShow = 
                                (toolName === 'generate_quiz_plan' && hasData) ||
                                (toolName === 'provide_note_markdown' && tp.state === 'output-available') ||
                                (toolName !== 'generate_quiz_plan' && toolName !== 'provide_note_markdown' && tp.state === 'output-available')
                              
                              if (shouldShow) {
                                // For generate_quiz_plan, prefer output but fall back to input
                                // For other tools, use output
                                const result = toolName === 'generate_quiz_plan' 
                                  ? (tp.output || tp.input)
                                  : tp.output
                                
                              return (
                                <div className="mt-2 w-full max-w-full min-w-0 break-words" key={`${message.id}-tool-${idx}`}>
                                    <ToolRenderer 
                                      toolName={toolName} 
                                      result={result}
                                      toolPart={tp}
                                        onViewFull={(type: 'quiz' | 'rubric' | 'note', data: any, messageId?: string) => {
                                          handleOpenArtifact(type, data, messageId)
                                        }}
                                      onApprove={() => {
                                        // Simply send "approve" as a regular text message
                                        try {
                                          sendChatMessage({
                                            role: 'user',
                                            parts: [{ type: 'text', text: 'approve' }]
                                          } as any, {
                                            body: {
                                              model: selectedModel,
                                              webSearch,
                                              mode,
                                              canvas_token: canvasStatus === 'connected' ? canvasToken : undefined,
                                              canvas_url: canvasStatus === 'connected' ? canvasUrl : undefined,
                                              selected_context: selectedContext.courses.length > 0 || selectedContext.assignments.length > 0 || selectedContext.modules.length > 0 ? selectedContext : undefined,
                                              selected_system_prompt_ids: selectedSystemPromptIds.length > 0 ? selectedSystemPromptIds : undefined,
                                            },
                                            headers: currentSession?.id ? { 'X-Session-ID': currentSession.id } : undefined,
                                          })
                                        } catch (error) {
                                          console.error('Error sending approve message:', error)
                                        }
                                      }}
                                    />
                                </div>
                              )
                              }
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
                                        <ToolRenderer 
                                          toolName={toolName} 
                                          result={
                                            toolName === 'generate_quiz_plan' 
                                              ? (tp.output || tp.input)
                                              : ('output' in tp ? tp.output : (tp.state === 'approval-requested' || tp.state === 'input-available' ? tp.input : undefined))
                                          }
                                          toolPart={tp}
                                            onViewFull={(type: 'quiz' | 'rubric' | 'note', data: any, messageId?: string) => {
                                              handleOpenArtifact(type, data, messageId)
                                            }}
                                          onApprove={() => {
                                            // Simply send "approve" as a regular text message
                                            try {
                                              sendChatMessage({
                                                role: 'user',
                                                parts: [{ type: 'text', text: 'approve' }]
                                              } as any, {
                                                body: {
                                                  model: selectedModel,
                                                  webSearch,
                                                  mode,
                                                  canvas_token: canvasStatus === 'connected' ? canvasToken : undefined,
                                                  canvas_url: canvasStatus === 'connected' ? canvasUrl : undefined,
                                                  selected_context: selectedContext.courses.length > 0 || selectedContext.assignments.length > 0 || selectedContext.modules.length > 0 ? selectedContext : undefined,
                                                  selected_system_prompt_ids: selectedSystemPromptIds.length > 0 ? selectedSystemPromptIds : undefined,
                                                },
                                                headers: currentSession?.id ? { 'X-Session-ID': currentSession.id } : undefined,
                                              })
                                            } catch (error) {
                                              console.error('Error sending approve message:', error)
                                            }
                                          }}
                                        />
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
                              <MessageAction tooltip="Regenerate" onClick={handleRegenerate}>
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
            {canvasStatus === 'missing' && (
              <div className="px-4 pt-4">
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Canvas Integration Required</AlertTitle>
                  <AlertDescription>
                    Canvas token not configured. Set up your Canvas integration in Context to enable Canvas features.
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => router.push('/protected/context')}
                    >
                      Go to Context
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <Suggestions className="px-4 pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button aria-label="Generate suggestions" variant="outline" size="icon" type="button" onClick={() => regenerateSuggestions(uiMessages, activeProvider, selectedModel, selectedContext, mode)} disabled={status !== 'ready' || loadingSuggestions}>
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
                      : mode === 'quiz'
                        ? quizSuggestions
                        : mode === 'study-plan'
                          ? studyPlanSuggestions
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
                      <PromptInputButton type="button" className={mode ? `${getModeColors(mode as ModeType).text}` : ''}>
                        {mode === 'rubric' ? (
                          <FileText className="size-4" />
                        ) : mode === 'quiz' ? (
                          <FileQuestion className="size-4" />
                        ) : mode === 'study-plan' ? (
                          <BookOpen className="size-4" />
                        ) : mode === 'note' ? (
                          <StickyNote className="size-4" />
                        ) : (
                          <GraduationCap className="size-4" />
                        )}
                        <span className="ml-1 flex items-center gap-1.5">
                          {mode === 'rubric' ? 'Rubric' : mode === 'quiz' ? 'Quiz Generation' : mode === 'study-plan' ? 'Study Plan' : mode === 'note' ? 'Note Mode' : 'Generic'}
                          {(mode === 'rubric' || mode === 'quiz' || mode === 'study-plan' || mode === 'note') && (
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors(mode as ModeType)}`}>Beta</Badge>
                          )}
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
                              <FileText className={`size-4 ${getModeColors('rubric').text}`} />
                              <span className="flex items-center gap-1.5">
                                Rubric Analysis
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors('rubric')}`}>Beta</Badge>
                              </span>
                              {mode === 'rubric' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="quiz"
                              onSelect={() => {
                                handleModeChange('quiz')
                                setModeOpen(false)
                              }}
                            >
                              <FileQuestion className={`size-4 ${getModeColors('quiz').text}`} />
                              <span className="flex items-center gap-1.5">
                                Quiz Generation
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors('quiz')}`}>Beta</Badge>
                              </span>
                              {mode === 'quiz' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="study-plan"
                              onSelect={() => {
                                handleModeChange('study-plan')
                                setModeOpen(false)
                              }}
                            >
                              <BookOpen className={`size-4 ${getModeColors('study-plan').text}`} />
                              <span className="flex items-center gap-1.5">
                                Study Plan
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors('study-plan')}`}>Beta</Badge>
                              </span>
                              {mode === 'study-plan' && <CheckIcon className="ml-auto size-4" />}
                            </PromptInputCommandItem>
                            <PromptInputCommandItem
                              value="note"
                              onSelect={() => {
                                handleModeChange('note')
                                setModeOpen(false)
                              }}
                            >
                              <StickyNote className={`size-4 ${getModeColors('note').text}`} />
                              <span className="flex items-center gap-1.5">
                                Note Mode
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors('note')}`}>Beta</Badge>
                              </span>
                              {mode === 'note' && <CheckIcon className="ml-auto size-4" />}
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
          </>
        )}
      </div>
    </div>
  )
}
