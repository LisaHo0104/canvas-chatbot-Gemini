'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SummaryUI, type SummaryNote } from './summary-ui'

export function SummaryModal({ open, onOpenChange, data }: { open: boolean; onOpenChange: (open: boolean) => void; data: SummaryNote }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Summary</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <SummaryUI data={data} compact={false} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
