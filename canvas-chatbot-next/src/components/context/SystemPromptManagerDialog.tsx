'use client'

import { useState, useEffect } from 'react'
import { Copy, Loader2, Edit2, Trash2, Play, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { SystemPrompt } from './SystemPromptManager'

interface SystemPromptManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPresetDeleted: () => void
  onPresetApplied: (promptId: string) => void
}

export function SystemPromptManagerDialog({
  open,
  onOpenChange,
  onPresetDeleted,
  onPresetApplied,
}: SystemPromptManagerDialogProps) {
  const [userPrompts, setUserPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadPrompts()
    }
  }, [open])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/system-prompts')
      if (!response.ok) {
        throw new Error('Failed to load prompts')
      }
      const data = await response.json()
      setUserPrompts(data.userPrompts || [])
    } catch (error) {
      console.error('Error loading prompts:', error)
      setError('Failed to load prompts')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (promptId: string) => {
    try {
      setApplying(promptId)
      setError(null)
      await onPresetApplied(promptId)
      onOpenChange(false)
    } catch (error) {
      console.error('Error applying prompt:', error)
      setError('Failed to apply prompt')
    } finally {
      setApplying(null)
    }
  }

  const handleEdit = (prompt: SystemPrompt) => {
    setEditingPrompt(prompt)
    setEditName(prompt.name)
    setEditDescription(prompt.description || '')
  }

  const handleSaveEdit = async () => {
    if (!editingPrompt || !editName.trim()) {
      setError('Prompt name is required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/system-prompts/${editingPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update prompt')
      }

      await loadPrompts()
      setEditingPrompt(null)
      setEditName('')
      setEditDescription('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update prompt')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(promptId)
      setError(null)
      const response = await fetch(`/api/system-prompts/${promptId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete prompt')
      }

      await loadPrompts()
      onPresetDeleted()
    } catch (error) {
      console.error('Error deleting prompt:', error)
      setError('Failed to delete prompt')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (editingPrompt) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
            <DialogDescription>Update the name and description of your prompt.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Prompt Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                disabled={saving}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingPrompt(null)
                setEditName('')
                setEditDescription('')
                setError(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage System Prompts</DialogTitle>
          <DialogDescription>
            View, edit, and delete your custom system prompt templates. System templates cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : userPrompts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Copy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No custom prompts yet.</p>
              <p className="text-sm mt-2">Create a prompt from a template to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <h4 className="font-medium truncate">{prompt.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        Custom
                      </Badge>
                    </div>
                    {prompt.description && (
                      <p className="text-sm text-muted-foreground mb-2">{prompt.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {formatDate(prompt.created_at)}</span>
                      {prompt.updated_at !== prompt.created_at && (
                        <span>Updated: {formatDate(prompt.updated_at)}</span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {prompt.prompt_text.length} characters
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApply(prompt.id)}
                      disabled={applying === prompt.id}
                    >
                      {applying === prompt.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(prompt)}
                      disabled={deleting === prompt.id}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(prompt.id)}
                      disabled={deleting === prompt.id}
                    >
                      {deleting === prompt.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
