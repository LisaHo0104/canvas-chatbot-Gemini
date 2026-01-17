'use client'

import { useEffect } from 'react'
import { parseAssignmentPlanWithError, type ParsedPlan } from '@/lib/assignment-plan-parser'
import { StepCard } from './StepCard'
import { ProgressTracker } from './ProgressTracker'
import { TimelineView } from './TimelineView'
import { MarkdownPlanView } from './MarkdownPlanView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface InteractivePlanViewProps {
  content: string
  onGetHelp?: (stepId: string) => void
  onGenerateDraft?: (stepId: string) => void
  onGetFeedback?: (stepId: string) => void
  onSaveDraft?: (stepId: string, content: string) => void
  onMarkComplete?: (stepId: string) => void
}

export function InteractivePlanView({
  content,
  onGetHelp,
  onGenerateDraft,
  onGetFeedback,
  onSaveDraft,
  onMarkComplete,
}: InteractivePlanViewProps) {
  const parseResult = parseAssignmentPlanWithError(content)
  const parsedPlan = parseResult.plan
  const parseError = parseResult.error

  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (parseError) {
        console.warn('[InteractivePlanView] Parsing failed:', {
          error: parseError.message,
          details: parseError.details,
          contentLength: content.length,
          contentPreview: content.substring(0, 200),
        })
      } else if (parsedPlan) {
        console.log('[InteractivePlanView] Parsing succeeded:', {
          title: parsedPlan.title,
          stepsCount: parsedPlan.steps.length,
          hasOverview: !!parsedPlan.overview,
          hasTimeline: !!parsedPlan.timeline,
        })
      }
    }
  }, [parseError, parsedPlan, content])

  if (!parsedPlan) {
    // Fallback: Show error message and render markdown view
    return (
      <div className="w-full space-y-4">
        <Alert variant="default" className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <AlertTriangle className="h-4 w-4 text-yellow-800 dark:text-yellow-200" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-200">
            Interactive View Unavailable
          </AlertTitle>
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <div className="space-y-2">
              <p>
                {parseError?.message || 'Could not parse plan structure for interactive view.'}
              </p>
              {parseError?.details && (
                <p className="text-xs opacity-80">
                  <strong>Details:</strong> {parseError.details}
                </p>
              )}
              <p className="text-xs opacity-80">
                The markdown content is shown below. Interactive features (step tracking, progress, etc.) are not available.
                {parseError?.message?.includes('assignment summary') ? (
                  <>
                    <br />
                    <strong>Note:</strong> This content appears to be an assignment summary. 
                    Assignment summaries are informational and don't have interactive steps. 
                    To create an interactive assignment plan, the content needs to include steps in the format "## Step X: Title".
                  </>
                ) : (
                  <>
                    <br />
                    Expected format: Title starting with "# " or "## ", and steps in format "## Step X: Title".
                  </>
                )}
              </p>
            </div>
          </AlertDescription>
        </Alert>
        
        {/* Fallback to markdown rendering */}
        <div className="border rounded-lg p-4 bg-card">
          <MarkdownPlanView content={content} />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Overview */}
      {parsedPlan.overview && (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {parsedPlan.overview}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progress Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressTracker
            steps={parsedPlan.steps}
            overallProgress={parsedPlan.progress?.overallProgress}
          />
        </CardContent>
      </Card>

      {/* Timeline */}
      {(parsedPlan.timeline?.startDate || parsedPlan.timeline?.dueDate || parsedPlan.timeline?.milestones) && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <TimelineView
              startDate={parsedPlan.timeline.startDate}
              dueDate={parsedPlan.timeline.dueDate}
              milestones={parsedPlan.timeline.milestones}
            />
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Steps</h3>
        {parsedPlan.steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            onGetHelp={onGetHelp}
            onGenerateDraft={onGenerateDraft}
            onGetFeedback={onGetFeedback}
            onSaveDraft={onSaveDraft}
            onMarkComplete={onMarkComplete}
          />
        ))}
      </div>

      {/* Resources */}
      {parsedPlan.resources && parsedPlan.resources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              {parsedPlan.resources.map((resource, idx) => (
                <li key={idx}>
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {resource.name}
                    </a>
                  ) : (
                    resource.name
                  )}
                  {resource.description && (
                    <span className="text-muted-foreground"> - {resource.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
