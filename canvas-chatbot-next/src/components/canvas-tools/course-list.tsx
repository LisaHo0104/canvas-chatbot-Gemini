import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Calendar } from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface CanvasCourse {
  id: number
  name: string
  course_code: string
  enrollment_term_id: number
  start_at: string | null
  end_at: string | null
  workflow_state: 'available' | 'completed' | 'deleted'
}

interface CourseListProps {
  courses: CanvasCourse[]
}

export function CourseList({ courses }: CourseListProps) {
  if (!courses || courses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No courses found.
      </div>
    )
  }

  return (
    <div className="w-full">
      <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-background/50">
        <div className="flex w-max space-x-4 p-4">
          {courses.map((course) => (
            <Card
              key={course.id}
              className={cn(
                "w-[280px] flex-shrink-0 transition-all hover:shadow-md",
                "bg-background hover:bg-accent/5"
              )}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-sm font-semibold leading-tight truncate" title={course.name}>
                      {course.name}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono truncate" title={course.course_code}>
                      {course.course_code}
                    </p>
                  </div>
                  <Badge
                    variant={course.workflow_state === 'available' ? 'default' : 'secondary'}
                    className="text-[10px] px-2 py-0.5 h-fit shrink-0 capitalize"
                  >
                    {course.workflow_state}
                  </Badge>
                </div>

                <div className="flex flex-col gap-1.5 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="font-mono">ID: {course.id}</span>
                  </div>
                  {course.start_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Started: {new Date(course.start_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
