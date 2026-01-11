import React, { useState } from 'react'
import { CourseList } from './course-list'
import { AssignmentList } from './assignment-list'
import { ModuleList } from './module-list'
import { CalendarEvents } from './calendar-events'
import { PageContents } from './page-contents'
import { FileCard } from './file-card'
import { GradeCard } from './grade-card'
import { FeedbackRubric } from './feedback-rubric'
import { RubricAnalysisUI } from '@/components/rubric-interpreter/rubric-analysis-ui'
import { RubricModal } from '@/components/rubric-interpreter/rubric-modal'
import { QuizUI } from '@/components/quiz/quiz-ui'
import { QuizModal } from '@/components/quiz/quiz-modal'
import { Plan, PlanHeader, PlanTitle, PlanDescription, PlanContent, PlanTrigger, PlanFooter, PlanAction } from '@/components/ai-elements/plan'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sources, SourcesContent, SourcesTrigger, Source } from '@/components/ai-elements/sources'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SaveArtifactDialog } from '@/components/artifacts/SaveArtifactDialog'
import type { ToolUIPart } from 'ai'

interface ToolRendererProps {
  toolName: string
  result: any
  toolPart?: ToolUIPart
  onApprove?: (approvalId: string) => void
  onReject?: (approvalId: string) => void
}

export function ToolRenderer({ toolName, result, toolPart, onApprove, onReject }: ToolRendererProps) {
  // For generate_quiz_plan, we need to show the plan even if result is null (use input instead)
  if (toolName === 'generate_quiz_plan') {
    // Use result if available, otherwise use input from toolPart
    const planData = result || (toolPart?.input as any)
    if (!planData && !toolPart) return null
  } else if (!result) {
    return null
  }

  // Handle specific tools
  switch (toolName) {
    case 'list_courses':
      return <CourseList courses={Array.isArray(result) ? result : []} />

    case 'get_assignments':
      return <AssignmentList assignments={Array.isArray(result) ? result : []} />

    case 'get_modules':
      return <ModuleList modules={Array.isArray(result) ? result : []} />

    case 'get_module':
      // get_module returns a single module, wrap it in an array for ModuleList
      return <ModuleList modules={result ? [result] : []} />

    case 'get_calendar_events':
      return <CalendarEvents events={Array.isArray(result) ? result : []} />

    case 'get_page_contents':
      return <PageContents pages={Array.isArray(result) ? result : []} />

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
          // Fully analyzed data - render with compact RubricAnalysisUI and modal
          return <RubricOutputRenderer rubricData={result as any} messageId={(toolPart as any)?.toolCallId} />
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

    case 'generate_quiz_plan':
      // This tool provides the quiz plan for user approval
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
      // When approval is requested, the output might not be available yet
      // In that case, use the input data to render the plan
      const planData = result || (toolPart?.input as any)
      // Check if planData has the expected structure for Plan component
      if (planData && typeof planData === 'object' && 'questionCount' in planData && 'questionTypes' in planData) {
        const sources = planData.sources || {}
        const sourcesList: string[] = []
        if (sources.courses && Array.isArray(sources.courses)) {
          sourcesList.push(...sources.courses.map((c: any) => `Course: ${c.name}`))
        }
        if (sources.modules && Array.isArray(sources.modules)) {
          sourcesList.push(...sources.modules.map((m: any) => `Module: ${m.name}`))
        }
        if (sources.assignments && Array.isArray(sources.assignments)) {
          sourcesList.push(...sources.assignments.map((a: any) => `Assignment: ${a.name}`))
        }

        const questionTypes = planData.questionTypes || {}
        const typeBreakdown = [
          questionTypes.multipleChoice > 0 && `${questionTypes.multipleChoice} multiple choice`,
          questionTypes.trueFalse > 0 && `${questionTypes.trueFalse} true/false`,
          questionTypes.shortAnswer > 0 && `${questionTypes.shortAnswer} short answer`,
        ].filter(Boolean).join(', ')

        return (
          <Plan defaultOpen className="w-full">
            <PlanHeader>
              <div className="flex items-start justify-between w-full">
                <div className="flex-1">
                  <PlanTitle>Quiz Generation Plan</PlanTitle>
                  <PlanDescription>
                    Review the plan below and approve to generate the quiz
                  </PlanDescription>
                </div>
                <PlanTrigger />
              </div>
            </PlanHeader>
            <PlanContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Question Count</h4>
                  <p className="text-sm text-muted-foreground">{planData.questionCount} questions total</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2">Question Types</h4>
                  <p className="text-sm text-muted-foreground">{typeBreakdown}</p>
                </div>

                {planData.topics && Array.isArray(planData.topics) && planData.topics.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Topics Covered</h4>
                    <div className="flex flex-wrap gap-2">
                      {planData.topics.map((topic: string, i: number) => (
                        <Badge key={i} variant="outline">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {planData.difficulty && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Difficulty Level</h4>
                    <Badge variant="outline" className="capitalize">{planData.difficulty}</Badge>
                  </div>
                )}

                {sourcesList.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Sources</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {sourcesList.map((source: string, i: number) => (
                        <li key={i}>{source}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {planData.userPrompt && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">User Requirements</h4>
                    <p className="text-sm text-muted-foreground">{planData.userPrompt}</p>
                  </div>
                )}
              </div>
            </PlanContent>
            {toolPart?.state === 'approval-requested' && toolPart.approval && 'id' in toolPart.approval && onApprove && (
              <PlanFooter>
                <div className="flex items-center justify-end gap-2 w-full">
                  <PlanAction>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onApprove(toolPart.approval.id);
                      }}
                    >
                      Approve
                    </Button>
                  </PlanAction>
                </div>
              </PlanFooter>
            )}
          </Plan>
        )
      }
      // If structure is incomplete but we have some data, try to show what we can
      if (planData && typeof planData === 'object') {
        return (
          <Plan defaultOpen className="w-full">
            <PlanHeader>
              <div className="flex items-start justify-between w-full">
                <div className="flex-1">
                  <PlanTitle>Quiz Generation Plan</PlanTitle>
                  <PlanDescription>
                    Review the plan below and approve to generate the quiz
                  </PlanDescription>
                </div>
                <PlanTrigger />
              </div>
            </PlanHeader>
            <PlanContent>
              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                  <strong>⚠️ Plan Data Available</strong>
                </p>
                <ScrollArea className="max-h-60 w-full rounded-md border bg-muted/50 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                    {JSON.stringify(planData, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </PlanContent>
            {toolPart?.state === 'approval-requested' && toolPart.approval && 'id' in toolPart.approval && onApprove && (
              <PlanFooter>
                <div className="flex items-center justify-end gap-2 w-full">
                  <PlanAction>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onApprove(toolPart.approval.id);
                      }}
                    >
                      Approve
                    </Button>
                  </PlanAction>
                </div>
              </PlanFooter>
            )}
          </Plan>
        )
      }
      // If no data at all, show a message
      return (
        <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ No Plan Data</strong>
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
            Waiting for quiz plan data...
          </p>
        </div>
      )

    case 'provide_quiz_output':
      // This tool provides the fully generated quiz data for rendering
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
      // Check if result has the expected structure for QuizUI
      if (result && typeof result === 'object' && 'questions' in result && Array.isArray(result.questions)) {
        // Verify it has the full quiz structure
        const firstQuestion = result.questions[0]
        if (firstQuestion && 'question' in firstQuestion && 'type' in firstQuestion && 'correctAnswer' in firstQuestion) {
          // Fully generated quiz data - render with compact QuizUI and modal
          return <QuizOutputRenderer quizData={result as any} />
        }
      }
      // If structure is incomplete, show a message
      return (
        <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Incomplete Quiz Data</strong>
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
            The quiz data structure is incomplete. Expected full QuizOutput format with questions array.
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

// Separate component for quiz output to manage modal state
function QuizOutputRenderer({ quizData }: { quizData: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  return (
    <>
      <div className="space-y-2">
        <QuizUI 
          data={quizData} 
          compact={true} 
          onViewFull={() => setIsModalOpen(true)}
          onSaveClick={() => setSaveDialogOpen(true)}
        />
      </div>
      <QuizModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        data={quizData}
      />
      <SaveArtifactDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        artifactType="quiz"
        artifactData={quizData}
        onSave={() => {
          // Optionally show a success message or refresh
        }}
      />
    </>
  )
}

// Separate component for rubric output to manage modal state
function RubricOutputRenderer({ rubricData, messageId }: { rubricData: any; messageId?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <RubricAnalysisUI 
        data={rubricData} 
        messageId={messageId}
        compact={true} 
        onViewFull={() => setIsModalOpen(true)} 
      />
      <RubricModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        data={rubricData}
        messageId={messageId}
      />
    </>
  )
}
