'use client'

import { MessageResponse } from '@/components/ai-elements/message'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface FeedbackViewProps {
  feedback: Array<{ id: string, timestamp: string, content: string }>
}

export function FeedbackView({ feedback }: FeedbackViewProps) {
  if (!feedback || feedback.length === 0) {
    return null
  }

  // Sort by timestamp, most recent first
  const sortedFeedback = [...feedback].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="w-full space-y-4">
      <h4 className="text-sm font-semibold">Feedback History</h4>
      {sortedFeedback.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Feedback</CardTitle>
              <Badge variant="outline" className="text-xs">
                {format(new Date(item.timestamp), 'MMM d, yyyy HH:mm')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
                {item.content}
              </MessageResponse>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
