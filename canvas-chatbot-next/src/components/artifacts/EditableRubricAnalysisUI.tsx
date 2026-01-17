'use client'

import { useState, useEffect } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RubricAnalysisUI, RubricAnalysisOutput } from '@/components/rubric-interpreter/rubric-analysis-ui'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditableRubricAnalysisUIProps {
  data: RubricAnalysisOutput
  artifactId: string
  onSave: (updatedData: RubricAnalysisOutput) => Promise<void>
  showEditButton?: boolean
}

export function EditableRubricAnalysisUI({ data, artifactId, onSave, showEditButton = true }: EditableRubricAnalysisUIProps) {
  const [isEditing, setIsEditing] = useState(!showEditButton) // Start in edit mode if no edit button
  const [editedData, setEditedData] = useState<RubricAnalysisOutput>(data)
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
      console.error('Error saving rubric analysis:', error)
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
        <RubricAnalysisUI data={data} compact={false} />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      {showEditButton && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Editing Rubric Analysis</h3>
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
          <Label>Summary Overview</Label>
          <Textarea
            value={editedData.summary.overview}
            onChange={(e) => setEditedData({
              ...editedData,
              summary: { ...editedData.summary, overview: e.target.value }
            })}
            rows={4}
          />
        </div>

        <div>
          <Label>How to Get HD</Label>
          <Textarea
            value={editedData.summary.howToGetHD}
            onChange={(e) => setEditedData({
              ...editedData,
              summary: { ...editedData.summary, howToGetHD: e.target.value }
            })}
            rows={6}
          />
        </div>

        <div>
          <Label>Criteria</Label>
          <div className="space-y-4 mt-2">
            {editedData.criteria.map((criterion, index) => (
              <div key={criterion.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Criterion {index + 1}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newCriteria = editedData.criteria.filter((_, i) => i !== index)
                      setEditedData({ ...editedData, criteria: newCriteria })
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <Input
                  placeholder="Criterion name"
                  value={criterion.name}
                  onChange={(e) => {
                    const newCriteria = [...editedData.criteria]
                    newCriteria[index] = { ...criterion, name: e.target.value }
                    setEditedData({ ...editedData, criteria: newCriteria })
                  }}
                />
                <Textarea
                  placeholder="Description"
                  value={criterion.description}
                  onChange={(e) => {
                    const newCriteria = [...editedData.criteria]
                    newCriteria[index] = { ...criterion, description: e.target.value }
                    setEditedData({ ...editedData, criteria: newCriteria })
                  }}
                  rows={3}
                />
                <div className="text-sm text-muted-foreground">
                  Points: {criterion.pointsPossible} | Common Mistakes: {criterion.commonMistakes.length}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Action Checklist</Label>
          <div className="space-y-2 mt-2">
            {editedData.actionChecklist.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <Input
                  value={item.item}
                  onChange={(e) => {
                    const newChecklist = [...editedData.actionChecklist]
                    newChecklist[index] = { ...item, item: e.target.value }
                    setEditedData({ ...editedData, actionChecklist: newChecklist })
                  }}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newChecklist = editedData.actionChecklist.filter((_, i) => i !== index)
                    setEditedData({ ...editedData, actionChecklist: newChecklist })
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
