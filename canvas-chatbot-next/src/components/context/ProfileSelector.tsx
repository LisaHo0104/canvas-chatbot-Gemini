'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Loader2, Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export interface Profile {
  id: string
  name: string
  description: string | null
  selected_courses: number[]
  selected_assignments: number[]
  selected_modules: number[]
  created_at: string
  updated_at: string
}

interface ProfileSelectorProps {
  onProfileSelect: (profileId: string | null) => void
  onProfileApplied?: (profileId: string | null, selections: {
    courses: number[]
    assignments: number[]
    modules: number[]
  }) => void
  currentProfileId?: string | null
}

export function ProfileSelector({ onProfileSelect, onProfileApplied, currentProfileId }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

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
    if (profileId === 'no-profile') {
      onProfileSelect(null)
      if (onProfileApplied) {
        onProfileApplied(null, {
          courses: [],
          assignments: [],
          modules: [],
        })
      }
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
      onProfileSelect(profileId)
      
      // Update selections without page refresh
      if (onProfileApplied) {
        onProfileApplied(profileId, {
          courses: data.courses || [],
          assignments: data.assignments || [],
          modules: data.modules || [],
        })
      } else {
        // Fallback to page reload if callback not provided
        window.location.reload()
      }
    } catch (error) {
      console.error('Error applying profile:', error)
      alert('Failed to apply profile. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  const currentProfile = profiles.find(p => p.id === currentProfileId)

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentProfileId || 'no-profile'}
        onValueChange={handleProfileChange}
        disabled={loading || applying}
      >
        <SelectTrigger size="sm" className="w-[180px]">
          {applying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Applying...</span>
            </>
          ) : loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <SelectValue placeholder="Profiles">
              {currentProfile ? (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {currentProfile.name}
                </div>
              ) : (
                'No Profile'
              )}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-profile">No Profile</SelectItem>
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
    </div>
  )
}
