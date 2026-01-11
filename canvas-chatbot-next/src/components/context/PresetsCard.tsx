'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Loader2, Save, Settings, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Preset } from './PresetSelector'
import { SavePresetDialog } from './SavePresetDialog'
import { PresetManager } from './PresetManager'
import { ExportImportButtons } from './ExportImportButtons'

interface PresetsCardProps {
  currentPresetId: string | null
  onPresetApplied: (presetId: string | null, selections: {
    courses: number[]
    assignments: number[]
    modules: number[]
  }) => void
  onPresetIdChange: (presetId: string | null) => void
  selections: {
    courses: number[]
    assignments: number[]
    modules: number[]
  }
  onPresetSaved: () => void
  onImportComplete: () => void
}

export function PresetsCard({
  currentPresetId,
  onPresetApplied,
  onPresetIdChange,
  selections,
  onPresetSaved,
  onImportComplete,
}: PresetsCardProps) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)
  const [lastAppliedAt, setLastAppliedAt] = useState<Date | null>(null)

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
      onPresetIdChange(null)
      onPresetApplied(null, {
        courses: [],
        assignments: [],
        modules: [],
      })
      setLastAppliedAt(null)
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
      onPresetIdChange(presetId)
      onPresetApplied(presetId, {
        courses: data.courses || [],
        assignments: data.assignments || [],
        modules: data.modules || [],
      })
      setLastAppliedAt(new Date())
      await loadPresets() // Refresh presets list
    } catch (error) {
      console.error('Error applying preset:', error)
      alert('Failed to apply preset. Please try again.')
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

  const selectionsMatchPreset = (preset: Preset, currentSelections: {
    courses: number[]
    assignments: number[]
    modules: number[]
  }) => {
    const presetCourses = new Set(preset.selected_courses)
    const presetAssignments = new Set(preset.selected_assignments)
    const presetModules = new Set(preset.selected_modules)
    
    const currentCourses = new Set(currentSelections.courses)
    const currentAssignments = new Set(currentSelections.assignments)
    const currentModules = new Set(currentSelections.modules)

    return (
      presetCourses.size === currentCourses.size &&
      presetAssignments.size === currentAssignments.size &&
      presetModules.size === currentModules.size &&
      [...presetCourses].every(id => currentCourses.has(id)) &&
      [...presetAssignments].every(id => currentAssignments.has(id)) &&
      [...presetModules].every(id => currentModules.has(id))
    )
  }

  const currentPreset = presets.find(p => p.id === currentPresetId)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Presets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset Selector and Info */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Preset:</span>
                <Select
                  value={currentPresetId || 'no-preset'}
                  onValueChange={handlePresetChange}
                  disabled={loading || applying}
                >
                  <SelectTrigger className="w-[200px]">
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
                              {preset.id === currentPresetId && (
                                <span className="ml-auto text-xs text-muted-foreground">✓</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {currentPreset && (
                <div className="space-y-1">
                  {currentPreset.description && (
                    <p className="text-sm text-muted-foreground">{currentPreset.description}</p>
                  )}
                  {lastAppliedAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RotateCcw className="w-3 h-3" />
                      <span>Applied {formatTimeAgo(lastAppliedAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSaveDialogOpen(true)}
                variant="outline"
                size="sm"
                disabled={selections.courses.length === 0 && selections.assignments.length === 0 && selections.modules.length === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Preset
              </Button>
              <Button
                onClick={() => setManagerOpen(true)}
                variant="outline"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </Button>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Current Selections</h3>
              <ExportImportButtons onImportComplete={onImportComplete} />
            </div>
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
            {currentPreset && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {selectionsMatchPreset(currentPreset, selections) ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Selections match preset
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Selections differ from preset
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SavePresetDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        selections={selections}
        onSave={() => {
          onPresetSaved()
          loadPresets()
        }}
      />

      <PresetManager
        open={managerOpen}
        onOpenChange={setManagerOpen}
        onPresetApplied={async (presetId) => {
          try {
            const response = await fetch(`/api/context/presets/${presetId}/apply`, {
              method: 'POST',
            })

            if (!response.ok) {
              throw new Error('Failed to apply preset')
            }

            const data = await response.json()
            onPresetIdChange(presetId)
            onPresetApplied(presetId, {
              courses: data.courses || [],
              assignments: data.assignments || [],
              modules: data.modules || [],
            })
            setLastAppliedAt(new Date())
            await loadPresets()
            setManagerOpen(false)
          } catch (error) {
            console.error('Error applying preset:', error)
            alert('Failed to apply preset. Please try again.')
          }
        }}
        onPresetCreated={() => {
          setManagerOpen(false)
          setSaveDialogOpen(true)
        }}
        currentPresetId={currentPresetId}
      />
    </>
  )
}
