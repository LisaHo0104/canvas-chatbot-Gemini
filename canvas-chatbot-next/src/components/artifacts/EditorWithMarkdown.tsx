'use client'

import { useEffect, useState } from 'react'
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
import { MarkdownView } from "./MarkdownView"

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

interface EditorWithMarkdownProps {
  editorState?: EditorState
  editorSerializedState?: SerializedEditorState
  initialMarkdown?: string
  onChange?: (editorState: EditorState) => void
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void
}

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

export function EditorWithMarkdown({
  editorState,
  editorSerializedState,
  initialMarkdown,
  onChange,
  onSerializedChange,
}: EditorWithMarkdownProps) {
  return (
    <LexicalComposer
      initialConfig={{
        ...editorConfig,
        ...(editorState ? { editorState } : {}),
        ...(editorSerializedState
          ? { editorState: JSON.stringify(editorSerializedState) }
          : {}),
      }}
    >
      <TooltipProvider>
        <MarkdownInitializer initialMarkdown={initialMarkdown} />
        <MarkdownView shouldPreserveNewLinesInMarkdown={false} />

        <OnChangePlugin
          ignoreSelectionChange={true}
          onChange={(editorState) => {
            onChange?.(editorState)
            onSerializedChange?.(editorState.toJSON())
          }}
        />
      </TooltipProvider>
    </LexicalComposer>
  )
}
