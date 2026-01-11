'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RubricAnalysisUI, type RubricAnalysisOutput } from './rubric-analysis-ui'

interface RubricModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: RubricAnalysisOutput
  messageId?: string
}

export function RubricModal({ open, onOpenChange, data, messageId }: RubricModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[98vw] !w-[98vw] !max-h-[98vh] !h-[98vh] p-0 gap-0 overflow-hidden !flex !flex-col !rounded-lg sm:!max-w-[98vw] md:!max-w-[98vw] lg:!max-w-[98vw] xl:!max-w-[98vw] 2xl:!max-w-[98vw]"
        showCloseButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-background">
          <DialogTitle className="text-xl lg:text-2xl">{data.assignmentName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 lg:py-6">
            <RubricAnalysisUI data={data} messageId={messageId} compact={false} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
