'use client'

import { useState } from 'react'
import { ChevronDown, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Criterion } from './interactive-checklist'

interface CriterionCardProps {
  criterion: Criterion
  messageId: string
  onGetExamples?: (criterionName: string) => void
}

export function CriterionCard({ criterion, messageId, onGetExamples }: CriterionCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-slate-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h4 className="font-semibold text-sm">{criterion.name}</h4>
        <ChevronDown
          className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
              {criterion.explanation}
            </p>
          </div>
          {criterion.hdRequirements.length > 0 && (
            <div>
              <strong className="text-sm font-semibold">HD Requirements:</strong>
              <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                {criterion.hdRequirements.map((req, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {criterion.commonMistakes.length > 0 && (
            <div>
              <strong className="text-sm font-semibold">Common Mistakes:</strong>
              <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                {criterion.commonMistakes.map((mistake, i) => (
                  <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                    {mistake}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {onGetExamples && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onGetExamples(criterion.name)
              }}
              className="mt-2"
            >
              <Lightbulb className="size-4 mr-2" />
              Get Examples
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

