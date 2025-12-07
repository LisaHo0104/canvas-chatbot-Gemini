import React from 'react'
import { CourseList } from './course-list'
import { AssignmentList } from './assignment-list'
import { ModuleList } from './module-list'
import { CalendarEvents } from './calendar-events'
import { PageContent } from './page-content'
import { FileCard } from './file-card'
import { GradeCard } from './grade-card'
import { FeedbackRubric } from './feedback-rubric'
import { Sources, SourcesContent, SourcesTrigger, Source } from '@/components/ai-elements/sources'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ToolRendererProps {
  toolName: string
  result: any
}

export function ToolRenderer({ toolName, result }: ToolRendererProps) {
  if (!result) return null

  // Handle specific tools
  switch (toolName) {
    case 'list_courses':
      return <CourseList courses={Array.isArray(result) ? result : []} />

    case 'get_assignments':
      return <AssignmentList assignments={Array.isArray(result) ? result : []} />

    case 'get_modules':
      return <ModuleList modules={Array.isArray(result) ? result : []} />

    case 'get_calendar_events':
      return <CalendarEvents events={Array.isArray(result) ? result : []} />

    case 'get_page_content':
      return <PageContent page={result} />

    case 'get_file':
      return <FileCard file={result} />

    case 'get_assignment_grade':
      return <GradeCard data={result} />

    case 'get_assignment_feedback_and_rubric':
      return <FeedbackRubric data={result} />

    case 'webSearch':
      const results = result?.results || (Array.isArray(result) ? result : [])
      if (!results.length) return <div className="text-sm text-muted-foreground">No results found</div>
      
      return (
        <Sources className="not-prose w-full">
          <SourcesTrigger count={results.length} className="w-full justify-start" />
          {results.map((item: any, i: number) => (
            <SourcesContent key={i}>
              <Source href={item.url} title={item.title || item.url} />
            </SourcesContent>
          ))}
        </Sources>
      )

    default:
      // Fallback for unknown tools or raw data viewing
      return (
        <ScrollArea className="max-h-60 w-full rounded-md border bg-muted/50 p-4">
          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(result, null, 2)}
          </pre>
        </ScrollArea>
      )
  }
}
