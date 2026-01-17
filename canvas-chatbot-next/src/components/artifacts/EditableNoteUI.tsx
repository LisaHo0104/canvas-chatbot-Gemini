'use client'

import { useState, useEffect } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NoteUI, NoteOutput } from '@/components/note/note-ui'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditableNoteUIProps {
  data: NoteOutput
  artifactId: string
  onSave: (updatedData: NoteOutput) => Promise<void>
  showEditButton?: boolean
}

export function EditableNoteUI({ data, artifactId, onSave, showEditButton = true }: EditableNoteUIProps) {
  const [isEditing, setIsEditing] = useState(!showEditButton) // Start in edit mode if no edit button
  const [editedData, setEditedData] = useState<NoteOutput>(data)
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
      console.error('Error saving note:', error)
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
        <NoteUI data={data} compact={false} />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      {showEditButton && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Editing Note</h3>
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
          <Label htmlFor="note-title">Title</Label>
          <Input
            id="note-title"
            value={editedData.title}
            onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="note-description">Description (optional)</Label>
          <Textarea
            id="note-description"
            value={editedData.description || ''}
            onChange={(e) => setEditedData({ ...editedData, description: e.target.value || undefined })}
            rows={2}
          />
        </div>

        <div>
          <Label>Sections</Label>
          <div className="space-y-4 mt-2">
            {editedData.sections.map((section, index) => (
              <div key={section.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Section {index + 1}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newSections = editedData.sections.filter((_, i) => i !== index)
                      setEditedData({ ...editedData, sections: newSections })
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <Input
                  placeholder="Section heading"
                  value={section.heading}
                  onChange={(e) => {
                    const newSections = [...editedData.sections]
                    newSections[index] = { ...section, heading: e.target.value }
                    setEditedData({ ...editedData, sections: newSections })
                  }}
                />
                <Textarea
                  placeholder="Section content (markdown supported)"
                  value={section.content}
                  onChange={(e) => {
                    const newSections = [...editedData.sections]
                    newSections[index] = { ...section, content: e.target.value }
                    setEditedData({ ...editedData, sections: newSections })
                  }}
                  rows={6}
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                const newSection = {
                  id: `section-${Date.now()}`,
                  heading: 'New Section',
                  content: '',
                  level: 2 as const,
                }
                setEditedData({ ...editedData, sections: [...editedData.sections, newSection] })
              }}
            >
              Add Section
            </Button>
          </div>
        </div>

        <div>
          <Label>Key Takeaways (optional)</Label>
          <Textarea
            value={editedData.keyTakeaways?.join('\n') || ''}
            onChange={(e) => {
              const takeaways = e.target.value.split('\n').filter((t) => t.trim())
              setEditedData({ ...editedData, keyTakeaways: takeaways.length > 0 ? takeaways : undefined })
            }}
            placeholder="One per line"
            rows={4}
          />
        </div>
      </div>
    </div>
  )
}
