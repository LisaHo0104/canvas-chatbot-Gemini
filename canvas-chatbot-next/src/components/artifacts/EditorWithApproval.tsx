'use client'

import {
  InitialConfigType,
  LexicalComposer,
} from "@lexical/react/LexicalComposer"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { EditorState, SerializedEditorState } from "lexical"
import { editorTheme } from "@/components/editor/themes/editor-theme"
import { TooltipProvider } from "@/components/ui/tooltip"
import { nodes } from "@/components/blocks/editor-00/nodes"
import { Plugins } from "@/components/blocks/editor-00/plugins"
import { NoteEditorWithApproval } from "./NoteEditorWithApproval"
import { NoteOutput } from '@/components/note/note-ui'

const editorConfig: InitialConfigType = {
  namespace: "Editor",
  theme: editorTheme,
  nodes,
  onError: (error: Error) => {
    console.error(error)
  },
}

interface EditorWithApprovalProps {
  initialMarkdown: string
  title?: string
  description?: string
  onApprove: (noteOutput: NoteOutput) => void
  editorState?: EditorState
  editorSerializedState?: SerializedEditorState
  onChange?: (editorState: EditorState) => void
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void
}

export function EditorWithApproval({
  initialMarkdown,
  title,
  description,
  onApprove,
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
}: EditorWithApprovalProps) {
  return (
    <div className="bg-background rounded-lg border shadow flex flex-col h-full min-h-0">
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
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <Plugins />
            </div>
          </div>
          <NoteEditorWithApproval
            initialMarkdown={initialMarkdown}
            title={title}
            description={description}
            onApprove={onApprove}
          />

          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(editorState) => {
              onChange?.(editorState)
              onSerializedChange?.(editorState.toJSON())
            }}
          />
        </TooltipProvider>
      </LexicalComposer>
    </div>
  )
}
