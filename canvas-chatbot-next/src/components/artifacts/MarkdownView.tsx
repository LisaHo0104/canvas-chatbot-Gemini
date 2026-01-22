'use client'

import { useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $convertToMarkdownString,
  $convertFromMarkdownString,
} from '@lexical/markdown'
import { $getRoot } from 'lexical'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  CHECK_LIST,
  ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
} from '@lexical/markdown'
import { TABLE } from '@/components/editor/transformers/markdown-table-transformer'

interface MarkdownViewProps {
  shouldPreserveNewLinesInMarkdown?: boolean
}

export function MarkdownView({
  shouldPreserveNewLinesInMarkdown = false,
}: MarkdownViewProps) {
  const [editor] = useLexicalComposerContext()
  const [markdown, setMarkdown] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedMarkdown, setEditedMarkdown] = useState('')

  const updateMarkdown = () => {
    editor.getEditorState().read(() => {
      const root = $getRoot()
      const markdownString = $convertToMarkdownString(
        [
          ...TEXT_FORMAT_TRANSFORMERS,
          ...ELEMENT_TRANSFORMERS,
          CHECK_LIST,
          TABLE,
        ],
        undefined,
        shouldPreserveNewLinesInMarkdown
      )
      setMarkdown(markdownString)
      setEditedMarkdown(markdownString)
    })
  }

  useEffect(() => {
    updateMarkdown()

    // Subscribe to editor updates
    const removeUpdateListener = editor.registerUpdateListener(() => {
      if (!isEditing) {
        updateMarkdown()
      }
    })

    return () => {
      removeUpdateListener()
    }
  }, [editor, isEditing, shouldPreserveNewLinesInMarkdown])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    // Convert edited markdown back to editor state
    editor.update(() => {
      $convertFromMarkdownString(
        editedMarkdown,
        [
          ...TEXT_FORMAT_TRANSFORMERS,
          ...ELEMENT_TRANSFORMERS,
          CHECK_LIST,
          TABLE,
        ],
        undefined,
        shouldPreserveNewLinesInMarkdown
      )
    })
    setIsEditing(false)
    updateMarkdown()
  }

  const handleCancel = () => {
    setEditedMarkdown(markdown)
    setIsEditing(false)
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editedMarkdown}
                onChange={(e) => setEditedMarkdown(e.target.value)}
                className="font-mono text-sm min-h-[400px]"
                placeholder="Enter markdown..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  size="sm"
                >
                  Save Changes
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Markdown Source
                </h3>
                <Button
                  onClick={handleEdit}
                  variant="ghost"
                  size="sm"
                >
                  Edit
                </Button>
              </div>
              <pre className="font-mono text-sm bg-muted/50 p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                {markdown || '(empty)'}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
