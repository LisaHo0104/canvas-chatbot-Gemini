'use client'

import { Calendar, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TimelineViewProps {
  startDate?: string
  dueDate?: string
  milestones?: Array<{ date: string, stepId: string, description: string }>
}

export function TimelineView({ startDate, dueDate, milestones }: TimelineViewProps) {
  return (
    <div className="w-full space-y-4">
      <h3 className="text-lg font-semibold">Timeline</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {startDate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{startDate}</p>
            </CardContent>
          </Card>
        )}
        
        {dueDate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Due Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{dueDate}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {milestones && milestones.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Milestones</h4>
          <div className="space-y-2">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{milestone.date}</p>
                  <p className="text-sm text-muted-foreground">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
