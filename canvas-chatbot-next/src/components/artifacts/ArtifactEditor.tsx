'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Artifact {
  id: string
  title: string
  description: string | null
  tags: string[]
  artifact_type: 'quiz' | 'rubric_analysis' | 'note' | 'assignment_plan' | 'assignment_summary'
  created_at: string
  updated_at: string
}

interface ArtifactEditorProps {
  artifact: Artifact
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export function ArtifactEditor({
  artifact,
  open,
  onOpenChange,
  onUpdate,
}: ArtifactEditorProps) {
  const [title, setTitle] = useState(artifact.title)
  const [description, setDescription] = useState(artifact.description || '')
  const [tags, setTags] = useState(artifact.tags.join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens or artifact changes
  useEffect(() => {
    if (open) {
      setTitle(artifact.title)
      setDescription(artifact.description || '')
      setTags(artifact.tags.join(', '))
      setError(null)
    }
  }, [open, artifact])

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Parse tags (comma-separated)
      const tagsArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const response = await fetch(`/api/artifacts/${artifact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          tags: tagsArray,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update artifact')
      }

      onUpdate()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update artifact')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Artifact</DialogTitle>
          <DialogDescription>
            Update the title, description, and tags for this artifact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-artifact-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-artifact-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this artifact"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-artifact-description">Description (optional)</Label>
            <Textarea
              id="edit-artifact-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description or notes..."
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-artifact-tags">Tags (optional)</Label>
            <Input
              id="edit-artifact-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., exam, chapter-1, review"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
