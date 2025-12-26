import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, CheckCircle, FileText, AlertCircle } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface CanvasAssignment {
  id: number
  name: string
  description: string | null
  due_at: string | null
  points_possible: number
  course_id: number
  html_url: string
  submission: {
    score: number | null
    graded_at: string | null
    workflow_state: string
    missing?: boolean
  } | null
}

interface AssignmentListProps {
  assignments: CanvasAssignment[]
}

export function AssignmentList({ assignments }: AssignmentListProps) {
  if (!assignments || assignments.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No assignments found.
      </div>
    )
  }

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-background/50">
        <div className="flex w-max space-x-4 p-4">
          {assignments.map((assignment) => {
            const isSubmitted = assignment.submission?.workflow_state !== 'unsubmitted'
            const isGraded = assignment.submission?.workflow_state === 'graded'
            const isMissing = assignment.submission?.missing

            return (
              <Card
                key={assignment.id}
                className={cn(
                  "w-[280px] flex-shrink-0 overflow-hidden transition-all",
                  "bg-background hover:bg-accent/5"
                )}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <a
                        href={assignment.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <h4
                          className="text-sm font-semibold leading-tight line-clamp-2 whitespace-normal hover:underline"
                          title={assignment.name}
                        >
                          {assignment.name}
                        </h4>
                      </a>
                    </div>
                    <div className="flex-shrink-0">
                      {isMissing && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">Missing</Badge>}
                      {isGraded ? (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 bg-green-600 hover:bg-green-700">Graded</Badge>
                      ) : isSubmitted ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">Submitted</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">Pending</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        Due: {assignment.due_at ? new Date(assignment.due_at).toLocaleString() : 'No due date'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span>Points: {assignment.points_possible}</span>
                      {isGraded && (
                        <span className="font-semibold text-primary ml-1">
                          (Score: {assignment.submission?.score})
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
