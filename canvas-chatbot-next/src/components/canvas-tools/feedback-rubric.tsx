import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, CheckCircle2, XCircle } from 'lucide-react'

interface RubricCriterion {
  id: string
  description: string | null
  long_description: string | null
  points_possible: number | null
  ratings: any[]
  assessed_points: number | null
  your_score: number | null
  assessed_comments: string | null
}

interface SubmissionComment {
  author_id: number
  author_name?: string
  comment: string
  created_at: string
}

interface FeedbackData {
  rubric: RubricCriterion[]
  submissionComments: SubmissionComment[]
  grade: string | null
  score: number | null
  totals: {
    points_possible: number | null
    points_earned: number | null
    percentage: number | null
  }
}

interface FeedbackRubricProps {
  data: FeedbackData
}

export function FeedbackRubric({ data }: FeedbackRubricProps) {
  if (!data) return null

  return (
    <div className="space-y-4 w-full">
      {/* Grade Summary */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Feedback Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm text-muted-foreground">Total Score</span>
            <span className="text-lg font-bold">
              {data.totals.points_earned} / {data.totals.points_possible}
              <span className="text-sm text-muted-foreground ml-1">
                ({data.totals.percentage?.toFixed(1)}%)
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      {data.submissionComments && data.submissionComments.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Comments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {data.submissionComments.map((comment, idx) => (
              <div key={idx} className="bg-muted/50 p-3 rounded-md text-sm">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{comment.author_name || 'Instructor'}</span>
                  <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p>{comment.comment}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rubric */}
      {data.rubric && data.rubric.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Rubric Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {data.rubric.map((criterion) => {
              const isFullPoints = criterion.assessed_points === criterion.points_possible
              return (
                <div key={criterion.id} className="border rounded-md p-3">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="font-medium text-sm">{criterion.description}</span>
                    <Badge variant={isFullPoints ? 'outline' : 'secondary'} className={isFullPoints ? 'text-green-600 border-green-200 bg-green-50' : ''}>
                      {criterion.assessed_points} / {criterion.points_possible}
                    </Badge>
                  </div>
                  {criterion.long_description && (
                    <p className="text-xs text-muted-foreground mb-2">{criterion.long_description}</p>
                  )}
                  {criterion.assessed_comments && (
                    <div className="text-xs bg-yellow-50 text-yellow-900 p-2 rounded border border-yellow-100 mt-2">
                      <strong>Feedback:</strong> {criterion.assessed_comments}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
