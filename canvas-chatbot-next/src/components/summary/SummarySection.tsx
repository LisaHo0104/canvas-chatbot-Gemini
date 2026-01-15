'use client'

import { Badge } from '@/components/ui/badge'

type SummarySectionProps = {
  title: string
  description?: string
  successCriteria?: string[]
  contextInfo?: string[]
  confidence?: 'high' | 'medium' | 'low'
  children?: React.ReactNode
}

export function SummarySection({ title, description, successCriteria, contextInfo, confidence, children }: SummarySectionProps) {
  const borderClass =
    confidence === 'high'
      ? 'border-emerald-200 dark:border-emerald-800'
      : confidence === 'medium'
      ? 'border-amber-200 dark:border-amber-800'
      : confidence === 'low'
      ? 'border-red-200 dark:border-red-800'
      : 'border-border'

  return (
    <div className={`rounded-lg border ${borderClass} p-3 space-y-2`}>
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold">{title}</div>
        {confidence && (
          <Badge variant="outline" className="text-[10px] capitalize">
            {confidence} confidence
          </Badge>
        )}
      </div>
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
      {Array.isArray(successCriteria) && successCriteria.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1">Success Criteria</div>
          <ul className="list-disc list-inside text-xs space-y-1">
            {successCriteria.map((s, i) => (
              <li key={i}>{s.startsWith('You can') || s.startsWith('You are able to') ? s : `You can ${s}`}</li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(contextInfo) && contextInfo.length > 0 && (
        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2">
          {contextInfo.map((c, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">
              {c}
            </Badge>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}
