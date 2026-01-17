'use client'

import { useState, useEffect } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AssignmentPlanUI } from '@/components/assignment-plan/assignment-plan-ui'

interface EditableAssignmentPlanUIProps {
  data: {
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
  }
  artifactId: string
  onSave: (updatedData: { content: string, metadata?: any }) => Promise<void>
  showEditButton?: boolean
}

export function EditableAssignmentPlanUI({
  data,
  artifactId,
  onSave,
  showEditButton = true,
}: EditableAssignmentPlanUIProps) {
  const [isEditing, setIsEditing] = useState(!showEditButton)
  const [editedContent, setEditedContent] = useState(data.content)
  const [editedMetadata, setEditedMetadata] = useState(data.metadata || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEditing) {
      setEditedContent(data.content)
      setEditedMetadata(data.metadata || {})
    }
  }, [data, isEditing])

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave({
        content: editedContent,
        metadata: editedMetadata,
      })
      if (showEditButton) {
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving assignment plan:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedContent(data.content)
    setEditedMetadata(data.metadata || {})
    setIsEditing(false)
  }

  if (!isEditing && showEditButton) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 right-4 z-10"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="size-4 mr-2" />
          Edit
        </Button>
        <AssignmentPlanUI
          content={data.content}
          metadata={data.metadata}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      {showEditButton && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Editing Assignment Plan</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              <X className="size-4 mr-2" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="size-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {!showEditButton && (
        <div className="flex items-center justify-end mb-4">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="plan-content">Plan Content (Markdown)</Label>
          <Textarea
            id="plan-content"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Enter markdown plan content..."
            className="min-h-[400px] font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="assignment-name">Assignment Name</Label>
            <Input
              id="assignment-name"
              value={editedMetadata.assignmentName || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, assignmentName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              value={editedMetadata.dueDate || ''}
              onChange={(e) => setEditedMetadata({ ...editedMetadata, dueDate: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
