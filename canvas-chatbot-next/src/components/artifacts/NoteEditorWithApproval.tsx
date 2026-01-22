'use client'

import { useState, useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $convertToMarkdownString,
  $convertFromMarkdownString,
} from '@lexical/markdown'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
} from '@lexical/markdown'
import { TABLE } from '@/components/editor/transformers/markdown-table-transformer'
import { parseMarkdownToNoteOutput } from '@/lib/note-markdown-parser'
import { NoteOutput } from '@/components/note/note-ui'

interface NoteEditorWithApprovalProps {
  initialMarkdown: string
  title?: string
  description?: string
  onApprove: (noteOutput: NoteOutput) => void
}

const transformers = [
  ...TEXT_FORMAT_TRANSFORMERS,
  ...ELEMENT_TRANSFORMERS,
  CHECK_LIST,
  TABLE,
]

export function NoteEditorWithApproval({
  initialMarkdown,
  title,
  description,
  onApprove,
}: NoteEditorWithApprovalProps) {
  const [editor] = useLexicalComposerContext()
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)

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

  const handleApprove = () => {
    if (isConverting) return

    setIsConverting(true)
    setError(null)

    try {
      let noteOutput: NoteOutput | null = null
      
      editor.getEditorState().read(() => {
        try {
          const markdownString = $convertToMarkdownString(
            transformers,
            undefined,
            false
          )

          // Parse markdown to NoteOutput
          noteOutput = parseMarkdownToNoteOutput(
            markdownString,
            title,
            description
          )
        } catch (err) {
          console.error('Error converting markdown to note output:', err)
          const errorMessage = err instanceof Error ? err.message : 'Failed to convert markdown. Please check the format.'
          setError(errorMessage)
          toast.error('Failed to convert note. Please check the format.')
          setIsConverting(false)
          return
        }
      })

      // If conversion was successful, show toast and call callback
      if (noteOutput) {
        toast.success('Note converted successfully!')
        onApprove(noteOutput)
        // Keep loading state briefly to show feedback, then reset
        setTimeout(() => {
          setIsConverting(false)
        }, 100)
      }
    } catch (err) {
      console.error('Error in approval handler:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(errorMessage)
      toast.error('Failed to convert note')
      setIsConverting(false)
    }
  }

  return (
    <div className="border-t bg-background px-4 py-2 flex items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-2 flex-1">
        {error ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Edit the content above, then click Approve to convert to structured format.
          </p>
        )}
      </div>
      <Button
        onClick={handleApprove}
        size="sm"
        className="gap-2 shrink-0"
        disabled={isConverting}
      >
        {isConverting ? (
          <>
            <Spinner className="size-4" />
            Converting...
          </>
        ) : (
          <>
            <CheckCircle2 className="size-4" />
            Approve & Convert
          </>
        )}
      </Button>
    </div>
  )
}
