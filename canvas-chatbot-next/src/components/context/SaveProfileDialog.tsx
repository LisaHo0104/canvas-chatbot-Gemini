'use client'

import { useState } from 'react'
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

interface SaveProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selections: {
    courses: number[]
    assignments: number[]
    modules: number[]
  }
  onSave: () => void
}

export function SaveProfileDialog({
  open,
  onOpenChange,
  selections,
  onSave,
}: SaveProfileDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Profile name is required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/context/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          courses: selections.courses,
          assignments: selections.assignments,
          modules: selections.modules,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      onSave()
      onOpenChange(false)
      setName('')
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Profile</DialogTitle>
          <DialogDescription>
            Save your current context selections as a named profile for quick access later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">
              Profile Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Current Semester"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-description">Description (optional)</Label>
            <Textarea
              id="profile-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Fall 2024 courses and assignments"
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label>Summary</Label>
            <div className="rounded-md border bg-muted/50 p-3 space-y-1">
              <div className="text-sm">• {selections.courses.length} courses</div>
              <div className="text-sm">• {selections.assignments.length} assignments</div>
              <div className="text-sm">• {selections.modules.length} modules</div>
            </div>
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
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
