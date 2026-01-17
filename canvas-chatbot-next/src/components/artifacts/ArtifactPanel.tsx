'use client'

import { useState, useEffect } from 'react'
import { X, Edit2, MessageSquare, Save } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { QuizUI } from '@/components/quiz/quiz-ui'
import { RubricAnalysisUI } from '@/components/rubric-interpreter/rubric-analysis-ui'
import { NoteUI } from '@/components/note/note-ui'
import { SaveArtifactDialog } from './SaveArtifactDialog'
import { EditableQuizUI } from './EditableQuizUI'
import { EditableRubricAnalysisUI } from './EditableRubricAnalysisUI'
import { EditableNoteUI } from './EditableNoteUI'
import { EditableAssignmentPlanUI } from './EditableAssignmentPlanUI'
import { AssignmentPlanUI } from '@/components/assignment-plan/assignment-plan-ui'
import { AssignmentSummaryUI } from './AssignmentSummaryUI'

interface ArtifactPanelProps {
  open: boolean
  onClose: () => void
  artifactType: 'quiz' | 'rubric' | 'note' | 'assignment_plan' | 'assignment_summary'
  artifactData: any
  messageId?: string
  artifactId?: string
  onDiscussWithAI?: (instruction: string) => void
  onArtifactDataChange?: (updatedData: any) => void
}

export function ArtifactPanel({
  open,
  onClose,
  artifactType,
  artifactData,
  messageId,
  artifactId,
  onDiscussWithAI,
  onArtifactDataChange,
}: ArtifactPanelProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localArtifactData, setLocalArtifactData] = useState(artifactData)

  // Sync local data with prop when it changes (but not when editing)
  useEffect(() => {
    if (artifactData && !isEditing) {
      setLocalArtifactData(artifactData)
    }
  }, [artifactData, isEditing])

  if (!open || !artifactData) return null

  const getTitle = () => {
    switch (artifactType) {
      case 'quiz':
        return artifactData?.title || 'Quiz'
      case 'rubric':
        return artifactData?.assignmentName || 'Rubric Analysis'
      case 'note':
        return artifactData?.title || 'Note'
      case 'assignment_plan':
        return artifactData?.metadata?.assignmentName || artifactData?.title || 'Assignment Plan'
      case 'assignment_summary':
        return artifactData?.metadata?.assignmentName || 'Assignment Summary'
      default:
        return 'Artifact'
    }
  }

  const getDescription = () => {
    switch (artifactType) {
      case 'quiz':
        return artifactData?.description || ''
      case 'rubric':
        return ''
      case 'note':
        return artifactData?.description || ''
      case 'assignment_plan':
        return artifactData?.metadata?.dueDate ? `Due: ${artifactData.metadata.dueDate}` : ''
      case 'assignment_summary':
        return artifactData?.metadata?.dueDate ? `Due: ${artifactData.metadata.dueDate}` : ''
      default:
        return ''
    }
  }

  const handleSave = async (updatedData: any) => {
    try {
      setSaving(true)
      
      if (artifactId) {
        // Update saved artifact
        const response = await fetch(`/api/artifacts/${artifactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artifact_data: updatedData }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save artifact')
        }
      } else {
        // Update local data for unsaved artifacts
        setLocalArtifactData(updatedData)
        // Notify parent component of the change
        if (onArtifactDataChange) {
          onArtifactDataChange(updatedData)
        }
      }

      setIsEditing(false)
    } catch (err) {
      console.error('Error saving artifact:', err)
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleDiscussWithAI = () => {
    if (!onDiscussWithAI) return
    
    const artifactTypeLabel = artifactType === 'rubric' ? 'rubric analysis' : artifactType
    const instruction = `I want to edit this ${artifactTypeLabel}. Can you help me modify it?`
    onDiscussWithAI(instruction)
  }

  const handleEditWithAI = () => {
    if (!onDiscussWithAI) return
    
    const artifactTypeLabel = artifactType === 'rubric' ? 'rubric analysis' : artifactType
    if (artifactId) {
      const instruction = `I want to edit my saved ${artifactTypeLabel} artifact (ID: ${artifactId}). Can you help me modify it?`
      onDiscussWithAI(instruction)
    } else {
      const instruction = `I want to edit this ${artifactTypeLabel}. Can you help me modify it?`
      onDiscussWithAI(instruction)
    }
  }

  return (
    <>
      <div className="h-full flex flex-col bg-background border-l">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b shrink-0 bg-background">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl lg:text-2xl font-semibold truncate">
                {getTitle()}
              </h2>
              {getDescription() && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {getDescription()}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
              aria-label="Close artifact panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={saving}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {isEditing ? 'View' : 'Edit'}
            </Button>
            {onDiscussWithAI && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditWithAI}
                disabled={saving}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {artifactId ? 'Edit with AI' : 'Discuss with AI'}
              </Button>
            )}
            {!artifactId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
              >
                <Save className="h-4 w-4 mr-2" />
                Save to Artifactory
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 lg:py-6">
            {artifactType === 'quiz' && (
              isEditing ? (
                <EditableQuizUI
                  data={localArtifactData}
                  artifactId={artifactId || 'unsaved'}
                  onSave={handleSave}
                  showEditButton={false}
                />
              ) : (
                <QuizUI
                  data={localArtifactData}
                  messageId={messageId}
                  compact={false}
                  artifactId={artifactId}
                  onSaveClick={artifactId ? undefined : () => setSaveDialogOpen(true)}
                />
              )
            )}
            {artifactType === 'rubric' && (
              isEditing ? (
                <EditableRubricAnalysisUI
                  data={localArtifactData}
                  artifactId={artifactId || 'unsaved'}
                  onSave={handleSave}
                  showEditButton={false}
                />
              ) : (
                <RubricAnalysisUI
                  data={localArtifactData}
                  messageId={messageId}
                  compact={false}
                  artifactId={artifactId}
                  onViewFull={artifactId ? undefined : () => {}}
                />
              )
            )}
            {artifactType === 'note' && (
              isEditing ? (
                <EditableNoteUI
                  data={localArtifactData}
                  artifactId={artifactId || 'unsaved'}
                  onSave={handleSave}
                  showEditButton={false}
                />
              ) : (
                <NoteUI
                  data={localArtifactData}
                  messageId={messageId}
                  compact={false}
                  artifactId={artifactId}
                  onSaveClick={artifactId ? undefined : () => setSaveDialogOpen(true)}
                />
              )
            )}
            {artifactType === 'assignment_plan' && (
              isEditing ? (
                <EditableAssignmentPlanUI
                  data={localArtifactData}
                  artifactId={artifactId || 'unsaved'}
                  onSave={handleSave}
                  showEditButton={false}
                />
              ) : (
                <AssignmentPlanUI
                  content={localArtifactData?.content || ''}
                  metadata={localArtifactData?.metadata}
                  compact={false}
                  artifactId={artifactId}
                  onSaveClick={artifactId ? undefined : () => setSaveDialogOpen(true)}
                />
              )
            )}
            {artifactType === 'assignment_summary' && (
              <AssignmentSummaryUI
                content={localArtifactData?.content || ''}
                metadata={localArtifactData?.metadata}
                compact={false}
                artifactId={artifactId}
                onSaveClick={artifactId ? undefined : () => setSaveDialogOpen(true)}
              />
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Save Dialog */}
      {!artifactId && (artifactType === 'quiz' || artifactType === 'note' || artifactType === 'rubric' || artifactType === 'assignment_plan' || artifactType === 'assignment_summary') && (
        <SaveArtifactDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          artifactType={artifactType === 'rubric' ? 'rubric_analysis' : artifactType}
          artifactData={localArtifactData}
          onSave={() => {
            // Optionally show a success message or refresh
          }}
        />
      )}
    </>
  )
}
