import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface GradeInfo {
  grade: string | null
  score: number | null
  pointsPossible: number | null
  gradedAt: string | null
  workflowState: string
  submittedAt: string | null
}

interface GradeCardProps {
  data: GradeInfo
}

export function GradeCard({ data }: GradeCardProps) {
  if (!data) return null

  const percentage =
    data.score !== null && data.pointsPossible
      ? (data.score / data.pointsPossible) * 100
      : 0

  return (
    <Card className="w-full max-w-sm border-l-4 border-l-green-500/50">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Assignment Grade</CardTitle>
          <Badge variant={data.workflowState === 'graded' ? 'default' : 'secondary'}>
            {data.workflowState}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">
            {data.score ?? '-'}
            <span className="text-sm text-muted-foreground font-normal ml-1">
              / {data.pointsPossible ?? '-'}
            </span>
          </div>
          <div className="text-xl font-semibold text-primary">
            {data.grade ?? ''}
          </div>
        </div>

        {data.pointsPossible && (
          <Progress value={percentage} className="h-2" />
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          {data.submittedAt && (
            <div>Submitted: {new Date(data.submittedAt).toLocaleString()}</div>
          )}
          {data.gradedAt && (
            <div>Graded: {new Date(data.gradedAt).toLocaleString()}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
