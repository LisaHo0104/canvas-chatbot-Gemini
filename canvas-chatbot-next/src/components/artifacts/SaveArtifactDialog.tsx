'use client'

import { useState, useEffect } from 'react'
import { Loader2, FileQuestion, FileText, StickyNote, Library } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { getModeFromArtifactType, getModeBadgeColors } from '@/lib/mode-colors'

interface SaveArtifactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifactType: 'quiz' | 'rubric_analysis' | 'note' | 'flashcard'
  artifactData: any
  onSave: () => void
}

export function SaveArtifactDialog({
  open,
  onOpenChange,
  artifactType,
  artifactData,
  onSave,
}: SaveArtifactDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate title from artifact data when dialog opens
  useEffect(() => {
    if (open && !title) {
      if (artifactType === 'quiz' && artifactData?.title) {
        setTitle(artifactData.title)
      } else if (artifactType === 'rubric_analysis' && artifactData?.assignmentName) {
        setTitle(`Rubric Analysis: ${artifactData.assignmentName}`)
      } else if (artifactType === 'note' && artifactData?.title) {
        setTitle(artifactData.title)
      } else if (artifactType === 'flashcard') {
        setTitle(artifactData?.title?.trim() || 'Flashcards')
        if (artifactData?.description) setDescription(artifactData.description)
      }
    }
  }, [open, artifactType, artifactData, title])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setTags('')
      setError(null)
    }
  }, [open])

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

      const payload =
        artifactType === 'flashcard'
          ? {
              title: title.trim(),
              description: description.trim() || null,
              tags: tagsArray,
              artifact_type: artifactType,
              artifact_data: {
                title: title.trim(),
                description: description.trim() || undefined,
                cards: Array.isArray(artifactData?.cards) ? artifactData.cards : [],
                ...(artifactData?.metadata && { metadata: artifactData.metadata }),
              },
            }
          : {
              title: title.trim(),
              description: description.trim() || null,
              tags: tagsArray,
              artifact_type: artifactType,
              artifact_data: artifactData,
            }

      const response = await fetch('/api/artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        let message = 'Failed to save artifact'
        try {
          const data = await response.json()
          if (data?.error && typeof data.error === 'string') message = data.error
        } catch {
          message = response.statusText || message
        }
        throw new Error(message)
      }

      onSave()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save artifact')
    } finally {
      setSaving(false)
    }
  }

  const getArtifactTypeLabel = () => {
    if (artifactType === 'quiz') return 'Quiz'
    if (artifactType === 'rubric_analysis') return 'Rubric Analysis'
    if (artifactType === 'note') return 'Note'
    if (artifactType === 'flashcard') return 'Flashcard'
    return 'Artifact'
  }

  const getArtifactTypeIcon = () => {
    if (artifactType === 'quiz') return <FileQuestion className="size-4" />
    if (artifactType === 'rubric_analysis') return <FileText className="size-4" />
    if (artifactType === 'note') return <StickyNote className="size-4" />
    if (artifactType === 'flashcard') return <Library className="size-4" />
    return <FileText className="size-4" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save to Artifactory</DialogTitle>
          <DialogDescription>
            Save this {getArtifactTypeLabel().toLowerCase()} to your artifacts for later review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="artifact-type">Type</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`flex items-center gap-1 border ${getModeBadgeColors(getModeFromArtifactType(artifactType))}`}>
                {getArtifactTypeIcon()}
                {getArtifactTypeLabel()}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="artifact-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="artifact-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this artifact"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artifact-description">Description (optional)</Label>
            <Textarea
              id="artifact-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description or notes..."
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="artifact-tags">Tags (optional)</Label>
            <Input
              id="artifact-tags"
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
              'Save Artifact'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
