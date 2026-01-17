'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { CheckCircle2, Circle, Clock, HelpCircle, FileText, MessageSquare, ChevronDown } from 'lucide-react'
import { DraftEditor } from './DraftEditor'
import { FeedbackView } from './FeedbackView'
import { MessageResponse } from '@/components/ai-elements/message'

interface StepCardProps {
  step: {
    id: string
    title: string
    order: number
    objectives?: string[]
    tasks?: Array<{ id: string, text: string, completed?: boolean }>
    resources?: Array<{ name: string, url?: string }>
    deliverables?: string[]
    successCriteria?: string[]
    estimatedTime?: string
    status?: 'pending' | 'in_progress' | 'completed'
    draft?: string
    feedback?: Array<{ id: string, timestamp: string, content: string }>
  }
  onGetHelp?: (stepId: string) => void
  onGenerateDraft?: (stepId: string) => void
  onGetFeedback?: (stepId: string) => void
  onSaveDraft?: (stepId: string, content: string) => void
  onMarkComplete?: (stepId: string) => void
}

export function StepCard({
  step,
  onGetHelp,
  onGenerateDraft,
  onGetFeedback,
  onSaveDraft,
  onMarkComplete,
}: StepCardProps) {
  const [showDraftEditor, setShowDraftEditor] = useState(false)

  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = () => {
    switch (step.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">In Progress</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const handleSaveDraft = async (content: string) => {
    if (onSaveDraft) {
      await onSaveDraft(step.id, content)
      setShowDraftEditor(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-muted-foreground">Step {step.order}:</span>
                {step.title}
              </CardTitle>
              {step.estimatedTime && (
                <p className="text-sm text-muted-foreground mt-1">
                  Estimated time: {step.estimatedTime}
                </p>
              )}
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Objectives */}
        {step.objectives && step.objectives.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Objectives</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {step.objectives.map((obj, idx) => (
                <li key={idx}>{obj}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tasks */}
        {step.tasks && step.tasks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Tasks</h4>
            <div className="space-y-2">
              {step.tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed || false}
                    readOnly
                    className="mt-1"
                  />
                  <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resources */}
        {step.resources && step.resources.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="resources">
              <AccordionTrigger className="text-sm font-semibold">
                Resources ({step.resources.length})
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {step.resources.map((resource, idx) => (
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
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Deliverables */}
        {step.deliverables && step.deliverables.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Deliverables</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {step.deliverables.map((deliverable, idx) => (
                <li key={idx}>{deliverable}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Success Criteria */}
        {step.successCriteria && step.successCriteria.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Success Criteria</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {step.successCriteria.map((criterion, idx) => (
                <li key={idx}>{criterion}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
          {onGetHelp && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGetHelp(step.id)}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Get Help
            </Button>
          )}
          {onGenerateDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onGenerateDraft(step.id)
                setShowDraftEditor(true)
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Draft
            </Button>
          )}
          {step.draft && onGetFeedback && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGetFeedback(step.id)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Get Feedback
            </Button>
          )}
          {onMarkComplete && step.status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkComplete(step.id)}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
        </div>

        {/* Draft Editor */}
        {showDraftEditor && (
          <div className="pt-4 border-t">
            <DraftEditor
              draft={step.draft}
              onSave={handleSaveDraft}
              onCancel={() => setShowDraftEditor(false)}
              placeholder={`Start working on ${step.title}...`}
            />
          </div>
        )}

        {/* Draft Display */}
        {step.draft && !showDraftEditor && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Your Draft</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDraftEditor(true)}
              >
                Edit
              </Button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none p-3 bg-muted rounded-lg">
              <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
                {step.draft}
              </MessageResponse>
            </div>
          </div>
        )}

        {/* Feedback */}
        {step.feedback && step.feedback.length > 0 && (
          <div className="pt-4 border-t">
            <FeedbackView feedback={step.feedback} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
