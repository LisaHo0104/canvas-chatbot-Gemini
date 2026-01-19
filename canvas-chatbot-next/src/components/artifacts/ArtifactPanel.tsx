'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { QuizUI } from '@/components/quiz/quiz-ui'
import { RubricAnalysisUI } from '@/components/rubric-interpreter/rubric-analysis-ui'
import { NoteUI } from '@/components/note/note-ui'
import { Editor } from '@/components/blocks/editor-00/editor'
import { SaveArtifactDialog } from './SaveArtifactDialog'
import { EditorWithApproval } from './EditorWithApproval'
import { NoteOutput } from '@/components/note/note-ui'

interface ArtifactPanelProps {
  open: boolean
  onClose: () => void
  artifactType: 'quiz' | 'rubric' | 'note'
  artifactData: any
  messageId?: string
}

export function ArtifactPanel({
  open,
  onClose,
  artifactType,
  artifactData,
  messageId,
}: ArtifactPanelProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [approvedNote, setApprovedNote] = useState<NoteOutput | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const isMarkdownDraft = artifactData?._isMarkdown === true
  const [activeTab, setActiveTab] = useState<'note' | 'editor'>(
    isMarkdownDraft ? 'editor' : 'note'
  )

  // When note is approved, show success overlay and transition to note tab
  useEffect(() => {
    if (approvedNote) {
      // Show success overlay
      setShowSuccessOverlay(true)
      
      // Start transition
      setIsTransitioning(true)
      
      // After a brief delay, switch to note tab
      const switchTabTimer = setTimeout(() => {
        setActiveTab('note')
      }, 300)

      // Hide overlay after 1.5 seconds
      const overlayTimer = setTimeout(() => {
        setShowSuccessOverlay(false)
        setIsTransitioning(false)
      }, 1500)

      return () => {
        clearTimeout(switchTabTimer)
        clearTimeout(overlayTimer)
      }
    }
  }, [approvedNote])

  const handleApprove = (noteOutput: NoteOutput) => {
    setApprovedNote(noteOutput)
  }

  if (!open || !artifactData) return null

  // Use approved note if available, otherwise use artifactData
  const displayData = approvedNote || artifactData

  const getTitle = () => {
    switch (artifactType) {
      case 'quiz':
        return displayData?.title || 'Quiz'
      case 'rubric':
        return displayData?.assignmentName || 'Rubric Analysis'
      case 'note':
        return displayData?.title || 'Note'
      default:
        return 'Artifact'
    }
  }

  const getDescription = () => {
    switch (artifactType) {
      case 'quiz':
        return displayData?.description || ''
      case 'rubric':
        return ''
      case 'note':
        return displayData?.description || ''
      default:
        return ''
    }
  }

  return (
    <>
      <div className="h-full flex flex-col bg-background border-l relative">
        {/* Success Overlay */}
        {showSuccessOverlay && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300">
            <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-lg border shadow-lg animate-in fade-in zoom-in-95 duration-300">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Note converted!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your note is ready to view
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b shrink-0 bg-background flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl lg:text-2xl font-semibold truncate">
              {getTitle()}
            </h2>
            {getDescription() && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {getDescription()}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0"
            aria-label="Close artifact panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content with Tabs for Note type */}
        {artifactType === 'note' ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'note' | 'editor')} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-4 pb-2 border-b shrink-0">
              <TabsList>
                <TabsTrigger value="editor">Text Editor</TabsTrigger>
                <TabsTrigger value="note">Full Note</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent 
                value="note" 
                className={`h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col transition-opacity duration-300 ${
                  isTransitioning && activeTab !== 'note' ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-6 py-4 lg:py-6">
                    {approvedNote ? (
                      <NoteUI
                        data={approvedNote}
                        messageId={messageId}
                        compact={false}
                        onSaveClick={() => setSaveDialogOpen(true)}
                      />
                    ) : !isMarkdownDraft ? (
                      <NoteUI
                        data={displayData}
                        messageId={messageId}
                        compact={false}
                        onSaveClick={() => setSaveDialogOpen(true)}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Please approve the markdown content in the Text Editor tab first.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent 
                value="editor" 
                className={`h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col transition-opacity duration-300 ${
                  isTransitioning && activeTab === 'note' ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <div className="flex-1 min-h-0 flex flex-col p-6">
                  {isMarkdownDraft ? (
                    <EditorWithApproval
                      initialMarkdown={artifactData.markdown}
                      title={artifactData.title}
                      description={artifactData.description}
                      onApprove={handleApprove}
                    />
                  ) : (
                    <Editor />
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-4 lg:py-6">
              {artifactType === 'quiz' && (
                <QuizUI
                  data={artifactData}
                  messageId={messageId}
                  compact={false}
                  onSaveClick={() => setSaveDialogOpen(true)}
                />
              )}
              {artifactType === 'rubric' && (
                <RubricAnalysisUI
                  data={artifactData}
                  messageId={messageId}
                  compact={false}
                />
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Save Dialog */}
      {(artifactType === 'quiz' || artifactType === 'note') && (
        <SaveArtifactDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          artifactType={artifactType}
          artifactData={approvedNote || displayData}
          onSave={() => {
            // Optionally show a success message or refresh
          }}
        />
      )}
    </>
  )
}
