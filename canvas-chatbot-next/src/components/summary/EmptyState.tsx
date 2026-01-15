'use client'

import { Badge } from '@/components/ui/badge'

export function EmptyState({ title, reason, nextSteps, alternatives }: { title: string; reason?: string; nextSteps?: string[]; alternatives?: string[] }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="text-sm font-semibold">{title}</div>
      {reason && <div className="text-xs text-muted-foreground mt-1">{reason}</div>}
      {Array.isArray(nextSteps) && nextSteps.length > 0 && (
        <div className="mt-2">
          <Badge variant="outline" className="text-[10px] mr-2">Suggested next steps</Badge>
          <ul className="list-disc list-inside text-xs space-y-1">
            {nextSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      {Array.isArray(alternatives) && alternatives.length > 0 && (
        <div className="mt-2">
          <Badge variant="outline" className="text-[10px] mr-2">Alternatives</Badge>
          <ul className="list-disc list-inside text-xs space-y-1">
            {alternatives.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
