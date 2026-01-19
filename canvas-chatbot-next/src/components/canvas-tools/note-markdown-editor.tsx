'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $convertToMarkdownString,
  $convertFromMarkdownString,
} from '@lexical/markdown'
import { $getRoot } from 'lexical'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
} from '@lexical/markdown'
import { TABLE } from '@/components/editor/transformers/markdown-table-transformer'
import { parseMarkdownToNoteOutput } from '@/lib/note-markdown-parser'
import { NoteOutput } from '@/components/note/note-ui'

interface NoteMarkdownEditorProps {
  initialMarkdown: string
  title?: string
  description?: string
  onApprove: (noteOutput: NoteOutput) => void
  messageId?: string
}

const transformers = [
  ...TEXT_FORMAT_TRANSFORMERS,
  ...ELEMENT_TRANSFORMERS,
  CHECK_LIST,
  TABLE,
]

export function NoteMarkdownEditor({
  initialMarkdown,
  title,
  description,
  onApprove,
  messageId,
}: NoteMarkdownEditorProps) {
  const [editor] = useLexicalComposerContext()
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize editor with markdown content
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
          setError(null)
        } catch (err) {
          console.error('Error initializing editor with markdown:', err)
          setError('Failed to load markdown content')
        }
      }, { discrete: true })
    }
  }, [editor, initialMarkdown, isInitialized])

  const handleApprove = useCallback(() => {
    editor.getEditorState().read(() => {
      try {
        const root = $getRoot()
        const markdownString = $convertToMarkdownString(
          transformers,
          undefined,
          false
        )

        // Parse markdown to NoteOutput
        const noteOutput = parseMarkdownToNoteOutput(
          markdownString,
          title,
          description
        )

        // Call approval callback
        onApprove(noteOutput)
      } catch (err) {
        console.error('Error converting markdown to note output:', err)
        setError('Failed to convert markdown. Please check the format.')
      }
    })
  }, [editor, title, description, onApprove])

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Edit the markdown content below, then click Approve to convert to structured format.
          </p>
        </div>
        <Button
          onClick={handleApprove}
          size="sm"
          className="gap-2"
        >
          <CheckCircle2 className="size-4" />
          Approve & Convert
        </Button>
      </div>
      {error && (
        <div className="border-b bg-destructive/10 px-4 py-2 flex items-center gap-2 shrink-0">
          <AlertCircle className="size-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}
