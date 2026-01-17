'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarkdownPlanView } from './MarkdownPlanView'
import { InteractivePlanView } from './InteractivePlanView'
import { FileText, Layout } from 'lucide-react'

interface AssignmentPlanUIProps {
  content: string
  metadata?: {
    assignmentId?: number
    courseId?: number
    assignmentName?: string
    dueDate?: string
    totalPoints?: number
    estimatedTotalTime?: string
    difficulty?: 'easy' | 'medium' | 'hard'
    topics?: string[]
    currentStepId?: string
    overallProgress?: number
  }
  onGetHelp?: (stepId: string) => void
  onGenerateDraft?: (stepId: string) => void
  onGetFeedback?: (stepId: string) => void
  onSaveDraft?: (stepId: string, content: string) => void
  onMarkComplete?: (stepId: string) => void
  onEdit?: () => void
  compact?: boolean
  onViewFull?: () => void
  onSaveClick?: () => void
  artifactId?: string
}

export function AssignmentPlanUI({
  content,
  metadata,
  onGetHelp,
  onGenerateDraft,
  onGetFeedback,
  onSaveDraft,
  onMarkComplete,
  onEdit,
  compact = false,
  onViewFull,
  onSaveClick,
  artifactId,
}: AssignmentPlanUIProps) {
  const [viewMode, setViewMode] = useState<'markdown' | 'interactive'>('interactive')

  // Compact view: Show only summary card with button
  if (compact) {
    return (
      <div className="w-full p-4 border rounded-lg bg-card">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">
              {metadata?.assignmentName || 'Assignment Plan'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {metadata?.dueDate && `Due: ${metadata.dueDate}`}
              {metadata?.totalPoints && ` • ${metadata.totalPoints} points`}
            </p>
            {metadata?.overallProgress !== undefined && (
              <div className="text-sm text-muted-foreground">
                Progress: {metadata.overallProgress}%
              </div>
            )}
          </div>
          {onSaveClick && (
            <button
              onClick={onSaveClick}
              className="text-sm text-primary hover:underline"
            >
              Save
            </button>
          )}
        </div>
        {onViewFull && (
          <button
            onClick={onViewFull}
            className="mt-4 text-sm text-primary hover:underline"
          >
            View Full Plan
          </button>
        )}
      </div>
    )
  }

  // Full view: Show complete plan interface
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {metadata?.assignmentName || 'Assignment Plan'}
          </h2>
          {metadata && (
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {metadata.dueDate && <span>Due: {metadata.dueDate}</span>}
              {metadata.totalPoints && <span>{metadata.totalPoints} points</span>}
              {metadata.estimatedTotalTime && <span>Est. time: {metadata.estimatedTotalTime}</span>}
              {metadata.difficulty && (
                <span className="capitalize">Difficulty: {metadata.difficulty}</span>
              )}
            </div>
          )}
        </div>
        {onSaveClick && (
          <button
            onClick={onSaveClick}
            className="text-sm text-primary hover:underline"
          >
            Save to Artifactory
          </button>
        )}
      </div>

      {/* View Mode Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'markdown' | 'interactive')}>
        <TabsList>
          <TabsTrigger value="interactive" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Interactive View
          </TabsTrigger>
          <TabsTrigger value="markdown" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Markdown View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interactive" className="mt-4">
          <InteractivePlanView
            content={content}
            onGetHelp={onGetHelp}
            onGenerateDraft={onGenerateDraft}
            onGetFeedback={onGetFeedback}
            onSaveDraft={onSaveDraft}
            onMarkComplete={onMarkComplete}
          />
        </TabsContent>

        <TabsContent value="markdown" className="mt-4">
          <MarkdownPlanView
            content={content}
            onEdit={onEdit}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
