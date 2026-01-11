'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Loader2, Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export interface Preset {
  id: string
  name: string
  description: string | null
  selected_courses: number[]
  selected_assignments: number[]
  selected_modules: number[]
  created_at: string
  updated_at: string
}

interface PresetSelectorProps {
  onPresetSelect: (presetId: string | null) => void
  onPresetApplied?: (presetId: string | null, selections: {
    courses: number[]
    assignments: number[]
    modules: number[]
  }) => void
  currentPresetId?: string | null
}

export function PresetSelector({ onPresetSelect, onPresetApplied, currentPresetId }: PresetSelectorProps) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    loadPresets()
  }, [])

  const loadPresets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/context/presets')
      if (!response.ok) {
        throw new Error('Failed to load presets')
      }
      const data = await response.json()
      setPresets(data.presets || [])
    } catch (error) {
      console.error('Error loading presets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePresetChange = async (presetId: string) => {
    if (presetId === 'no-preset') {
      onPresetSelect(null)
      if (onPresetApplied) {
        onPresetApplied(null, {
          courses: [],
          assignments: [],
          modules: [],
        })
      }
      return
    }

    try {
      setApplying(true)
      const response = await fetch(`/api/context/presets/${presetId}/apply`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to apply preset')
      }

      const data = await response.json()
      onPresetSelect(presetId)
      
      // Update selections without page refresh
      if (onPresetApplied) {
        onPresetApplied(presetId, {
          courses: data.courses || [],
          assignments: data.assignments || [],
          modules: data.modules || [],
        })
      } else {
        // Fallback to page reload if callback not provided
        window.location.reload()
      }
    } catch (error) {
      console.error('Error applying preset:', error)
      alert('Failed to apply preset. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  const currentPreset = presets.find(p => p.id === currentPresetId)

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentPresetId || 'no-preset'}
        onValueChange={handlePresetChange}
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
            <SelectValue placeholder="Presets">
              {currentPreset ? (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {currentPreset.name}
                </div>
              ) : (
                'No Preset'
              )}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no-preset">No Preset</SelectItem>
          {presets.length > 0 && (
            <>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {preset.name}
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
