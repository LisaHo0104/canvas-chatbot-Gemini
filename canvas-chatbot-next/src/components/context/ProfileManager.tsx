'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Loader2, Edit2, Trash2, Play } from 'lucide-react'
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
import { Profile } from './ProfileSelector'

interface ProfileManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProfileApplied: (profileId: string) => void
  onProfileCreated: () => void
  currentProfileId?: string | null
}

export function ProfileManager({
  open,
  onOpenChange,
  onProfileApplied,
  onProfileCreated,
  currentProfileId,
}: ProfileManagerProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadProfiles()
    }
  }, [open])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/context/profiles')
      if (!response.ok) {
        throw new Error('Failed to load profiles')
      }
      const data = await response.json()
      setProfiles(data.profiles || [])
    } catch (error) {
      console.error('Error loading profiles:', error)
      setError('Failed to load profiles')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (profileId: string) => {
    try {
      setApplying(profileId)
      setError(null)
      const response = await fetch(`/api/context/profiles/${profileId}/apply`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to apply profile')
      }

      onProfileApplied(profileId)
      onOpenChange(false)
    } catch (error) {
      console.error('Error applying profile:', error)
      setError('Failed to apply profile')
    } finally {
      setApplying(null)
    }
  }

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile)
    setEditName(profile.name)
    setEditDescription(profile.description || '')
  }

  const handleSaveEdit = async () => {
    if (!editingProfile || !editName.trim()) {
      setError('Profile name is required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/context/profiles/${editingProfile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      await loadProfiles()
      setEditingProfile(null)
      setEditName('')
      setEditDescription('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(profileId)
      setError(null)
      const response = await fetch(`/api/context/profiles/${profileId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete profile')
      }

      await loadProfiles()
    } catch (error) {
      console.error('Error deleting profile:', error)
      setError('Failed to delete profile')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (editingProfile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update the name and description of your profile.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Profile Name <span className="text-destructive">*</span>
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

            <div className="space-y-2">
              <Label>Summary</Label>
              <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                <div className="text-sm">
                  • {editingProfile.selected_courses.length} courses
                </div>
                <div className="text-sm">
                  • {editingProfile.selected_assignments.length} assignments
                </div>
                <div className="text-sm">
                  • {editingProfile.selected_modules.length} modules
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingProfile(null)
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
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Profiles</DialogTitle>
          <DialogDescription>
            Create, edit, and manage your context selection profiles.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error && profiles.length === 0 ? (
            <div className="rounded-md border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">You don't have any profiles yet.</p>
              <p className="text-sm text-muted-foreground mb-6">
                Profiles allow you to quickly switch between different context selections. Save your
                current selections as a profile to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">
                My Profiles ({profiles.length})
              </div>
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-lg border p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <h4 className="font-medium">{profile.name}</h4>
                        {profile.id === currentProfileId && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      {profile.description && (
                        <p className="text-sm text-muted-foreground mb-2">{profile.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {profile.selected_courses.length} courses • {profile.selected_assignments.length}{' '}
                          assignments • {profile.selected_modules.length} modules
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created: {formatDate(profile.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApply(profile.id)}
                      disabled={applying === profile.id}
                    >
                      {applying === profile.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Apply
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(profile)}
                      disabled={applying !== null || deleting !== null}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(profile.id)}
                      disabled={applying !== null || deleting === profile.id}
                    >
                      {deleting === profile.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </>
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
