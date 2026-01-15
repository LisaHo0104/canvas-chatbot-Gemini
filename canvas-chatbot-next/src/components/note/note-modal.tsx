'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NoteUI, type NoteOutput } from './note-ui'
import { SaveArtifactDialog } from '@/components/artifacts/SaveArtifactDialog'
import { useState } from 'react'

interface NoteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: NoteOutput
  messageId?: string
}

export function NoteModal({ open, onOpenChange, data, messageId }: NoteModalProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-[90vw] md:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{data.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <NoteUI
              data={data}
              messageId={messageId}
              compact={false}
              onSaveClick={() => setSaveDialogOpen(true)}
            />
          </div>
        </DialogContent>
      </Dialog>
      <SaveArtifactDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        artifactType="note"
        artifactData={data}
        onSave={() => {
          // Optionally show a success message or refresh
        }}
      />
    </>
  )
}
