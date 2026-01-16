import { useState, useMemo } from 'react'
import type { AIProvider } from '@/types/ai-providers'
import type { AvailableContext, SelectedContext, ArtifactPanelData, EditingState, TextSelection } from '../types'

export function useChatState() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([])
  const [activeProvider, setActiveProvider] = useState<AIProvider | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [canvasInstitution, setCanvasInstitution] = useState('https://swinburne.instructure.com')
  const [canvasUrl, setCanvasUrl] = useState('https://swinburne.instructure.com')
  const [canvasToken, setCanvasToken] = useState('')
  const [canvasStatus, setCanvasStatus] = useState<'connected' | 'missing' | 'error'>('missing')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [mode, setMode] = useState<string | null>(null)
  const [modeOpen, setModeOpen] = useState(false)
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [openRouterModels, setOpenRouterModels] = useState<Array<{ id: string; name: string; chef: string; chefSlug: string; providers: string[] }>>([
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', chef: 'Anthropic', chefSlug: 'anthropic', providers: ['anthropic'] },
    { id: 'openai/gpt-4o', name: 'GPT-4o', chef: 'OpenAI', chefSlug: 'openai', providers: ['openai', 'azure'] },
    { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', chef: 'Google', chefSlug: 'google', providers: ['google'] },
  ])
  const [titleGenerating, setTitleGenerating] = useState(false)
  const [availableContext, setAvailableContext] = useState<AvailableContext>({
    courses: [],
    assignments: [],
    modules: []
  })
  const [selectedContext, setSelectedContext] = useState<SelectedContext>({
    courses: [],
    assignments: [],
    modules: []
  })
  const [contextSelectorOpen, setContextSelectorOpen] = useState(false)
  const [selectedSystemPromptIds, setSelectedSystemPromptIds] = useState<string[]>([])
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false)
  const [artifactPanelData, setArtifactPanelData] = useState<ArtifactPanelData | null>(null)
  const [textSelection, setTextSelection] = useState<TextSelection | null>(null)
  const [editingState, setEditingState] = useState<EditingState | null>(null)
  const [systemPromptTemplates, setSystemPromptTemplates] = useState<Array<{ id: string; template_type: string }>>([])
  const [userPrompts, setUserPrompts] = useState<Array<{ id: string; template_type: string | null }>>([])

  const hasContext = useMemo(() => 
    selectedContext.courses.length > 0 || 
    selectedContext.assignments.length > 0 || 
    selectedContext.modules.length > 0
  , [selectedContext])

  return {
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
  }
}
