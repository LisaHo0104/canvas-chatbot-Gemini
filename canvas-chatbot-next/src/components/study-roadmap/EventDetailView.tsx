'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Network, FileQuestion, BookOpen } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import {
  InitialConfigType,
  LexicalComposer,
} from "@lexical/react/LexicalComposer"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { EditorState, SerializedEditorState } from "lexical"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  $convertFromMarkdownString,
} from '@lexical/markdown'
import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
} from '@lexical/markdown'
import { TABLE } from '@/components/editor/transformers/markdown-table-transformer'
import { editorTheme } from "@/components/editor/themes/editor-theme"
import { TooltipProvider } from "@/components/ui/tooltip"
import { nodes } from "@/components/blocks/editor-00/nodes"
import { Plugins } from "@/components/blocks/editor-00/plugins"

const editorConfig: InitialConfigType = {
  namespace: "Editor",
  theme: editorTheme,
  nodes,
  onError: (error: Error) => {
    console.error(error)
  },
}

const transformers = [
  ...TEXT_FORMAT_TRANSFORMERS,
  ...ELEMENT_TRANSFORMERS,
  CHECK_LIST,
  TABLE,
]

function MarkdownInitializer({ initialMarkdown }: { initialMarkdown?: string }) {
  const [editor] = useLexicalComposerContext()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!isInitialized && initialMarkdown && editor) {
      editor.update(() => {
        try {
          $convertFromMarkdownString(
            initialMarkdown,
            transformers,
            undefined,
            false
          )
          setIsInitialized(true)
        } catch (err) {
          console.error('Error initializing editor with markdown:', err)
        }
      }, { discrete: true })
    }
  }, [editor, initialMarkdown, isInitialized])

  return null
}

interface EventDetailViewProps {
  event: {
    title: string
    description?: string
    type?: string
    date?: string
    dueDate?: string
    duration?: string
  }
  courseId?: number
  courseName?: string
  onClose?: () => void
}

type ContentType = 'summary' | 'mindmap' | 'quiz' | 'flashcard'

interface ContentCache {
  summary?: string
  mindmap?: string
  quiz?: string
  flashcard?: string
}

export function EventDetailView({ event, courseId, courseName, onClose }: EventDetailViewProps) {
  const [activeTab, setActiveTab] = useState<ContentType>('summary')
  const [loading, setLoading] = useState<Record<ContentType, boolean>>({
    summary: false,
    mindmap: false,
    quiz: false,
    flashcard: false,
  })
  const [error, setError] = useState<Record<ContentType, string | null>>({
    summary: null,
    mindmap: null,
    quiz: null,
    flashcard: null,
  })
  const [contentCache, setContentCache] = useState<ContentCache>({})
  const [selectedModel, setSelectedModel] = useState<string>('')

  // Fetch free model on mount
  useEffect(() => {
    const fetchFreeModel = async () => {
      try {
        const response = await fetch('/api/openrouter/models', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          const models = Array.isArray(data.models) ? data.models : []
          if (models.length > 0) {
            setSelectedModel(models[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch free model:', err)
      }
    }
    fetchFreeModel()
  }, [])

  const generateContent = async (contentType: ContentType) => {
    // Check cache first
    if (contentCache[contentType]) {
      return
    }

    if (!selectedModel) {
      setError(prev => ({ ...prev, [contentType]: 'Model not available' }))
      return
    }

    setLoading(prev => ({ ...prev, [contentType]: true }))
    setError(prev => ({ ...prev, [contentType]: null }))

    try {
      const response = await fetch('/api/study-roadmap/event-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          eventTitle: event.title,
          eventDescription: event.description || '',
          eventType: event.type || 'study_session',
          contentType,
          courseId,
          courseName,
          model: selectedModel,
          moduleId: (event as any).moduleId,
          itemId: (event as any).itemId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || errorData.details || `Failed to generate ${contentType} (${response.status})`
        console.error(`[EventDetailView] API error for ${contentType}:`, errorData)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.success || !data.content) {
        console.error(`[EventDetailView] Invalid response for ${contentType}:`, data)
        throw new Error(`Invalid response from server for ${contentType}`)
      }
      
      // Update cache with markdown content
      setContentCache(prev => ({
        ...prev,
        [contentType]: typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2),
      }))
    } catch (err) {
      console.error(`[EventDetailView] Error generating ${contentType}:`, err)
      const errorMessage = err instanceof Error 
        ? err.message 
        : `Failed to generate ${contentType}. Please check the console for details.`
      setError(prev => ({
        ...prev,
        [contentType]: errorMessage,
      }))
    } finally {
      setLoading(prev => ({ ...prev, [contentType]: false }))
    }
  }

  // Load content when tab changes
  useEffect(() => {
    if (activeTab && !contentCache[activeTab] && selectedModel) {
      generateContent(activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedModel])

  const renderContent = () => {
    if (loading[activeTab]) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Generating {activeTab}...</span>
        </div>
      )
    }

    if (error[activeTab]) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error[activeTab]}</AlertDescription>
        </Alert>
      )
    }

    const content = contentCache[activeTab]
    if (content) {
      return (
        <div className="h-full flex flex-col" id="radix-content-editor">
          <div className="flex-1 min-h-0 flex flex-col p-6">
            <div className="bg-background rounded-lg border shadow flex flex-col h-full min-h-0">
              <LexicalComposer initialConfig={editorConfig}>
                <TooltipProvider>
                  <MarkdownInitializer initialMarkdown={content} />
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <Plugins />
                    </div>
                  </div>
                  <OnChangePlugin ignoreSelectionChange={true} />
                </TooltipProvider>
              </LexicalComposer>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentType)} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-4 h-10 lg:h-11 gap-1 mb-4">
          <TabsTrigger value="summary" className="text-sm lg:text-base px-2 lg:px-3 flex items-center gap-2">
            <FileText className="size-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="mindmap" className="text-sm lg:text-base px-2 lg:px-3 flex items-center gap-2">
            <Network className="size-4" />
            Mind Map
          </TabsTrigger>
          <TabsTrigger value="quiz" className="text-sm lg:text-base px-2 lg:px-3 flex items-center gap-2">
            <FileQuestion className="size-4" />
            Quiz
          </TabsTrigger>
          <TabsTrigger value="flashcard" className="text-sm lg:text-base px-2 lg:px-3 flex items-center gap-2">
            <BookOpen className="size-4" />
            Flashcards
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="summary" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              {renderContent()}
            </div>
          </TabsContent>

          <TabsContent value="mindmap" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">
              {renderContent()}
            </div>
          </TabsContent>

          <TabsContent value="quiz" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              {renderContent()}
            </div>
          </TabsContent>

          <TabsContent value="flashcard" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              {renderContent()}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
