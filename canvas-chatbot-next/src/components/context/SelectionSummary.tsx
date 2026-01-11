'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Loader2, Save, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Profile } from './ProfileSelector'
import { SaveProfileDialog } from './SaveProfileDialog'
import { ProfileManager } from './ProfileManager'
import { ExportImportButtons } from './ExportImportButtons'

interface SelectionSummaryProps {
  currentProfileId: string | null
  onProfileApplied: (profileId: string | null, selections: {
    courses: number[]
    assignments: number[]
    modules: number[]
  }) => void
  onProfileIdChange: (profileId: string | null) => void
  selections: {
    courses: number[]
    assignments: number[]
    modules: number[]
  }
  onProfileSaved: () => void
  onImportComplete: () => void
  hideCard?: boolean
}

export function SelectionSummary({
  currentProfileId,
  onProfileApplied,
  onProfileIdChange,
  selections,
  onProfileSaved,
  onImportComplete,
  hideCard = false,
}: SelectionSummaryProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)
  const [lastAppliedAt, setLastAppliedAt] = useState<Date | null>(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/context/profiles')
      if (!response.ok) {
        throw new Error('Failed to load profiles')
      }
      const data = await response.json()
      setProfiles(data.profiles || [])
    } catch (error) {
      console.error('Error loading profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileChange = async (profileId: string) => {
    if (profileId === 'default') {
      // Default profile: pass empty arrays, parent will handle selecting all courses
      onProfileIdChange(null)
      onProfileApplied(null, {
        courses: [],
        assignments: [],
        modules: [],
      })
      setLastAppliedAt(new Date())
      return
    }

    try {
      setApplying(true)
      const response = await fetch(`/api/context/profiles/${profileId}/apply`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to apply profile')
      }

      const data = await response.json()
      onProfileIdChange(profileId)
      onProfileApplied(profileId, {
        courses: data.courses || [],
        assignments: data.assignments || [],
        modules: data.modules || [],
      })
      setLastAppliedAt(new Date())
      await loadProfiles()
    } catch (error) {
      console.error('Error applying profile:', error)
      alert('Failed to apply profile. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    return `${Math.floor(diffMs / 86400000)} day${Math.floor(diffMs / 86400000) !== 1 ? 's' : ''} ago`
  }

  const currentProfile = profiles.find(p => p.id === currentProfileId)

  const actionButtonsContent = (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Profile Selector */}
      <Select
        value={currentProfileId || 'default'}
        onValueChange={handleProfileChange}
        disabled={loading || applying}
      >
        <SelectTrigger className="w-[180px] sm:w-[200px]">
          {applying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Applying...</span>
            </>
          ) : loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Loading...</span>
            </>
          ) : (
            <SelectValue>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="truncate">{currentProfile ? currentProfile.name : 'Default'}</span>
              </div>
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default</SelectItem>
          {profiles.length > 0 && (
            <>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {profile.name}
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      <Button
        onClick={() => setSaveDialogOpen(true)}
        variant="outline"
        size="sm"
        disabled={selections.courses.length === 0 && selections.assignments.length === 0 && selections.modules.length === 0}
      >
        <Save className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Save as Profile</span>
        <span className="sm:hidden">Save</span>
      </Button>
      <Button
        onClick={() => setManagerOpen(true)}
        variant="outline"
        size="sm"
      >
        <Settings className="w-4 h-4 mr-2" />
        Manage
      </Button>
      <ExportImportButtons onImportComplete={onImportComplete} />
    </div>
  )

  if (hideCard) {
    return (
      <>
        {actionButtonsContent}
        <SaveProfileDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          selections={selections}
          onSave={() => {
            onProfileSaved()
            loadProfiles()
          }}
        />
        <ProfileManager
          open={managerOpen}
          onOpenChange={setManagerOpen}
          onProfileApplied={async (profileId) => {
            try {
              const response = await fetch(`/api/context/profiles/${profileId}/apply`, {
                method: 'POST',
              })

              if (!response.ok) {
                throw new Error('Failed to apply profile')
              }

              const data = await response.json()
              onProfileIdChange(profileId)
              onProfileApplied(profileId, {
                courses: data.courses || [],
                assignments: data.assignments || [],
                modules: data.modules || [],
              })
              setLastAppliedAt(new Date())
              await loadProfiles()
              setManagerOpen(false)
            } catch (error) {
              console.error('Error applying profile:', error)
              alert('Failed to apply profile. Please try again.')
            }
          }}
          onProfileCreated={() => {
            setManagerOpen(false)
            setSaveDialogOpen(true)
          }}
          currentProfileId={currentProfileId}
        />
      </>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Selection Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-semibold">{selections.courses.length}</div>
              <div className="text-sm text-muted-foreground">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{selections.assignments.length}</div>
              <div className="text-sm text-muted-foreground">Assignments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{selections.modules.length}</div>
              <div className="text-sm text-muted-foreground">Modules</div>
            </div>
          </div>

          {/* Action Buttons with Profile Selector */}
          {actionButtonsContent}
        </CardContent>
      </Card>

      <SaveProfileDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        selections={selections}
        onSave={() => {
          onProfileSaved()
          loadProfiles()
        }}
      />

      <ProfileManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        onProfileApplied={async (profileId) => {
          try {
            const response = await fetch(`/api/context/profiles/${profileId}/apply`, {
              method: 'POST',
            })

            if (!response.ok) {
              throw new Error('Failed to apply profile')
            }

            const data = await response.json()
            onProfileIdChange(profileId)
            onProfileApplied(profileId, {
              courses: data.courses || [],
              assignments: data.assignments || [],
              modules: data.modules || [],
            })
            setLastAppliedAt(new Date())
            await loadProfiles()
            setManagerOpen(false)
          } catch (error) {
            console.error('Error applying profile:', error)
            alert('Failed to apply profile. Please try again.')
          }
        }}
        onProfileCreated={() => {
          setManagerOpen(false)
          setSaveDialogOpen(true)
        }}
        currentProfileId={currentProfileId}
      />
    </>
  )
}
