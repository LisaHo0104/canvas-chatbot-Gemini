'use client'

import { Download, Lightbulb } from 'lucide-react'
import { MessageActions, MessageAction } from '@/components/ai-elements/message'
import { Criterion } from './interactive-checklist'

interface RubricData {
  criteria: Criterion[]
  summary: string
}

interface RubricActionsProps {
  rubricData: RubricData
  messageId: string
  onGetExamples?: () => void
}

export function RubricActions({
  rubricData,
  messageId,
  onGetExamples,
}: RubricActionsProps) {
  const exportChecklist = () => {
    const checklist = rubricData.criteria
      .flatMap((c) => c.hdRequirements)
      .map((req, i) => `${i + 1}. ${req}`)
      .join('\n')

    const blob = new Blob([checklist], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rubric-checklist.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <MessageActions>
      <MessageAction
        tooltip="Export Checklist"
        onClick={exportChecklist}
      >
        <Download className="size-4" />
      </MessageAction>
      {onGetExamples && (
        <MessageAction
          tooltip="Get Examples"
          onClick={onGetExamples}
        >
          <Lightbulb className="size-4" />
        </MessageAction>
      )}
    </MessageActions>
  )
}

