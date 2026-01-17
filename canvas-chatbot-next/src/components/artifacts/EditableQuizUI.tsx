'use client'

import { useState, useEffect } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuizUI, QuizOutput } from '@/components/quiz/quiz-ui'

interface EditableQuizUIProps {
  data: QuizOutput
  artifactId: string
  onSave: (updatedData: QuizOutput) => Promise<void>
  showEditButton?: boolean
}

export function EditableQuizUI({ data, artifactId, onSave, showEditButton = true }: EditableQuizUIProps) {
  const [isEditing, setIsEditing] = useState(!showEditButton) // Start in edit mode if no edit button
  const [editedData, setEditedData] = useState<QuizOutput>(data)
  const [saving, setSaving] = useState(false)

  // Sync edited data when prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditedData(data)
    }
  }, [data, isEditing])

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave(editedData)
      if (showEditButton) {
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving quiz:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedData(data)
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
        <QuizUI data={data} compact={false} artifactId={artifactId} />
      </div>
    )
  }

  // For now, show a simple message that quiz editing is complex
  // Full quiz editing UI would be quite extensive
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      {showEditButton && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Editing Quiz</h3>
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

      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          Quiz editing is available. For now, you can use the agent edit feature to modify quizzes.
          Full inline editing UI will be available in a future update.
        </p>
      </div>
    </div>
  )
}
