'use client'

import { MessageResponse } from '@/components/ai-elements/message'
import { InteractiveChecklist, Criterion } from './interactive-checklist'
import { CriterionCard } from './criterion-card'
import { RubricProgress } from './rubric-progress'
import { RubricActions } from './rubric-actions'

export interface RubricInterpretationData {
  criteria: Criterion[]
  summary: string
}

interface RubricInterpretationProps {
  rubricData: RubricInterpretationData
  interpretationText: string
  messageId: string
  onGetExamples?: (criterionName?: string) => void
}

export function RubricInterpretation({
  rubricData,
  interpretationText,
  messageId,
  onGetExamples,
}: RubricInterpretationProps) {
  return (
    <div className="space-y-4">
      {/* AI Text Output */}
      <MessageResponse>{interpretationText}</MessageResponse>

      {/* Interactive Components (enhance, don't repeat) */}
      <RubricProgress criteria={rubricData.criteria} messageId={messageId} />
      <InteractiveChecklist criteria={rubricData.criteria} messageId={messageId} />
      <div className="space-y-2">
        {rubricData.criteria.map((criterion) => (
          <CriterionCard
            key={criterion.id}
            criterion={criterion}
            messageId={messageId}
            onGetExamples={onGetExamples}
          />
        ))}
      </div>
      <RubricActions
        rubricData={rubricData}
        messageId={messageId}
        onGetExamples={onGetExamples ? () => onGetExamples() : undefined}
      />
    </div>
  )
}

