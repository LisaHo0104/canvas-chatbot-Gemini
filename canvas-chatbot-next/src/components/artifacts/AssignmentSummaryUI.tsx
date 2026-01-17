'use client'

import { MessageResponse } from '@/components/ai-elements/message'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AssignmentSummaryUIProps {
  content: string
  metadata?: {
    assignmentId?: number
    courseId?: number
    assignmentName?: string
    dueDate?: string
    totalPoints?: number
  }
  compact?: boolean
  onViewFull?: () => void
  onSaveClick?: () => void
  artifactId?: string
}

export function AssignmentSummaryUI({
  content,
  metadata,
  compact = false,
  onViewFull,
  onSaveClick,
  artifactId,
}: AssignmentSummaryUIProps) {
  // Compact view
  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-base">
                {metadata?.assignmentName || 'Assignment Summary'}
              </CardTitle>
              {metadata?.dueDate && (
                <p className="text-sm text-muted-foreground mt-1">
                  Due: {metadata.dueDate}
                </p>
              )}
            </div>
            {onSaveClick && (
              <button
                onClick={onSaveClick}
                className="text-sm text-primary hover:underline"
              >
                Save
              </button>
            )}
          </div>
        </CardHeader>
        {onViewFull && (
          <CardContent>
            <button
              onClick={onViewFull}
              className="text-sm text-primary hover:underline"
            >
              View Full Summary
            </button>
          </CardContent>
        )}
      </Card>
    )
  }

  // Full view
  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {metadata?.assignmentName || 'Assignment Summary'}
          </CardTitle>
          {metadata && (
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {metadata.dueDate && <span>Due: {metadata.dueDate}</span>}
              {metadata.totalPoints && <span>{metadata.totalPoints} points</span>}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
              {content}
            </MessageResponse>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
