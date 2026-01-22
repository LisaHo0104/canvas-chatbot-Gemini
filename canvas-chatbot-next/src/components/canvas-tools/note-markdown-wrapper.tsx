'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StickyNote, Maximize2, Save } from 'lucide-react'
import { NoteUI } from '@/components/note/note-ui'
import { NoteOutput } from '@/components/note/note-ui'
import { SaveArtifactDialog } from '@/components/artifacts/SaveArtifactDialog'

interface NoteMarkdownWrapperProps {
  markdown: string
  title?: string
  description?: string
  messageId?: string
  onViewFull?: (type: 'quiz' | 'rubric' | 'note', data: any, messageId?: string) => void
}

export function NoteMarkdownWrapper({
  markdown,
  title,
  description,
  messageId,
  onViewFull,
}: NoteMarkdownWrapperProps) {
  const [approvedNote, setApprovedNote] = useState<NoteOutput | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  const handleApprove = (noteOutput: NoteOutput) => {
    setApprovedNote(noteOutput)
    setIsApproved(true)
  }

  // If approved, show the compact NoteUI
  if (isApproved && approvedNote) {
    return (
      <>
        <div className="space-y-2">
          <NoteUI
            data={approvedNote}
            messageId={messageId}
            compact={true}
            onViewFull={() => onViewFull?.('note', approvedNote, messageId)}
            onSaveClick={() => setSaveDialogOpen(true)}
          />
        </div>
        <SaveArtifactDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          artifactType="note"
          artifactData={approvedNote}
          onSave={() => {
            // Optionally show a success message or refresh
          }}
        />
      </>
    )
  }

  // Show compact card view with markdown data
  // Parse a preview from markdown
  const previewText = markdown.split('\n').slice(0, 3).join(' ').substring(0, 150) + '...'
  const sectionCount = (markdown.match(/^#+\s/gm) || []).length

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="size-5" />
                {title || 'Note (Draft)'}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 flex-wrap">
                <span>{sectionCount} Sections</span>
                <span className="text-xs text-muted-foreground">Markdown Draft</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {description && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{description}</p>
          </CardContent>
        )}
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">{previewText}</p>
        </CardContent>
        <CardContent>
          <Button
            onClick={() => onViewFull?.('note', { markdown, title, description, _isMarkdown: true }, messageId)}
            variant="outline"
            className="w-full"
          >
            <Maximize2 className="size-4 mr-2" />
            View Full & Edit
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
