import React from 'react'
import { CourseList } from './course-list'
import { AssignmentList } from './assignment-list'
import { ModuleList } from './module-list'
import { CalendarEvents } from './calendar-events'
import { PageContent } from './page-content'
import { FileCard } from './file-card'
import { GradeCard } from './grade-card'
import { FeedbackRubric } from './feedback-rubric'
import { RubricAnalysisUI } from '@/components/rubric-interpreter/rubric-analysis-ui'
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

    case 'get_assignment_rubric':
      // Hide raw rubric data when it's being interpreted by RubricInterpretation component
      // The rubric interpretation UI provides a better experience
      return null

    case 'analyze_rubric':
      // This tool returns raw rubric data - show loading/processing state
      // The AI will analyze it and call provide_rubric_analysis with the full analysis
      if (result?.error) {
        return (
          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {result.error}
            </p>
            {result.assignmentName && (
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                Assignment: {result.assignmentName}
              </p>
            )}
          </div>
        )
      }
      // Show that rubric data was retrieved and analysis is in progress
      if (result && typeof result === 'object' && 'rubric' in result && Array.isArray(result.rubric)) {
        return (
          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              <strong>📋 Rubric Retrieved</strong>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Assignment: {result.assignmentName || 'Unknown'}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              {result.rubric.length} criteria found. Analyzing rubric systematically...
            </p>
          </div>
        )
      }
      // Fallback: show raw data if structure doesn't match
      return (
        <ScrollArea className="max-h-60 w-full rounded-md border bg-muted/50 p-4">
          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(result, null, 2)}
          </pre>
        </ScrollArea>
      )

    case 'provide_rubric_analysis':
      // This tool provides the fully analyzed rubric data for rendering
      // Check if result has error
      if (result?.error) {
        return (
          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {result.error}
            </p>
          </div>
        )
      }
      // Check if result has the expected structure for RubricAnalysisUI
      if (result && typeof result === 'object' && 'criteria' in result && Array.isArray(result.criteria)) {
        // Verify it has the full analysis structure
        const firstCriterion = result.criteria[0]
        if (firstCriterion && 'gradeLevels' in firstCriterion && 'commonMistakes' in firstCriterion) {
          // Fully analyzed data - render with RubricAnalysisUI
          return <RubricAnalysisUI data={result as any} />
        }
      }
      // If structure is incomplete, show a message
      return (
        <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Incomplete Analysis Data</strong>
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
            The analysis data structure is incomplete. Expected full RubricAnalysisOutput format.
          </p>
        </div>
      )

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
