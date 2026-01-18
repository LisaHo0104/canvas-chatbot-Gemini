'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { QuizUI } from '@/components/quiz/quiz-ui'
import { RubricAnalysisUI } from '@/components/rubric-interpreter/rubric-analysis-ui'
import { NoteUI } from '@/components/note/note-ui'
import { Editor } from '@/components/blocks/editor-00/editor'
import { SaveArtifactDialog } from './SaveArtifactDialog'

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
  const [activeTab, setActiveTab] = useState<'note' | 'editor'>('note')

  if (!open || !artifactData) return null

  const getTitle = () => {
    switch (artifactType) {
      case 'quiz':
        return artifactData?.title || 'Quiz'
      case 'rubric':
        return artifactData?.assignmentName || 'Rubric Analysis'
      case 'note':
        return artifactData?.title || 'Note'
      default:
        return 'Artifact'
    }
  }

  const getDescription = () => {
    switch (artifactType) {
      case 'quiz':
        return artifactData?.description || ''
      case 'rubric':
        return ''
      case 'note':
        return artifactData?.description || ''
      default:
        return ''
    }
  }

  return (
    <>
      <div className="h-full flex flex-col bg-background border-l">
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
                <TabsTrigger value="note">Full Note</TabsTrigger>
                <TabsTrigger value="editor">Text Editor</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <TabsContent value="note" className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-6 py-4 lg:py-6">
                    <NoteUI
                      data={artifactData}
                      messageId={messageId}
                      compact={false}
                      onSaveClick={() => setSaveDialogOpen(true)}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="editor" className="h-full m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
                <div className="flex-1 min-h-0 p-6 overflow-auto">
                  <Editor />
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
          artifactData={artifactData}
          onSave={() => {
            // Optionally show a success message or refresh
          }}
        />
      )}
    </>
  )
}
