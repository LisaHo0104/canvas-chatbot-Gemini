'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { RefreshCw, Search, ChevronDown, ChevronRight, BookOpen, FileText, Layers, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { SelectionSummary } from '@/components/context/SelectionSummary'

interface Course {
  id: number
  name: string
  code: string
  assignments: Array<{ id: number; name: string }>
  modules: Array<{ id: number; name: string }>
}

interface ContextData {
  courses: Course[]
  last_synced_at: string | null
}

interface ContextSelections {
  courses: number[]
  assignments: number[]
  modules: number[]
  last_synced_at: string | null
  current_preset_id: string | null
}

export default function ContextPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextData, setContextData] = useState<ContextData | null>(null)
  const [selections, setSelections] = useState<ContextSelections>({
    courses: [],
    assignments: [],
    modules: [],
    last_synced_at: null,
    current_preset_id: null,
  })
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null)

  const supabase = createSupabaseClient()

  // Debounced save function
  const saveSelections = useCallback(async (newSelections: ContextSelections) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/context/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courses: newSelections.courses,
          assignments: newSelections.assignments,
          modules: newSelections.modules,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save selections')
      }

      const data = await response.json()
      setSelections({
        ...newSelections,
        last_synced_at: data.last_synced_at || selections.last_synced_at,
        current_preset_id: data.current_preset_id || null,
      })
      // Clear preset ID when manually changing selections
      if (data.current_preset_id === null) {
        setCurrentPresetId(null)
      }
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selections')
      console.error('Error saving selections:', err)
    } finally {
      setSaving(false)
    }
  }, [selections.last_synced_at])

  // Load context selections from database
  const loadSelections = useCallback(async () => {
    try {
      const response = await fetch('/api/context/selection')
      if (!response.ok) {
        throw new Error('Failed to load selections')
      }
      const data = await response.json()
      setSelections({
        courses: data.courses || [],
        assignments: data.assignments || [],
        modules: data.modules || [],
        last_synced_at: data.last_synced_at || null,
        current_preset_id: data.current_preset_id || null,
      })
      // Set the current preset ID from the loaded data
      if (data.current_preset_id) {
        setCurrentPresetId(data.current_preset_id)
      }
    } catch (err) {
      console.error('Error loading selections:', err)
    }
  }, [])

  // Load Canvas context data
  const loadContextData = useCallback(async () => {
    try {
      const response = await fetch('/api/canvas/prefetch')
      if (!response.ok) {
        throw new Error('Failed to load Canvas data')
      }
      const data = await response.json()
      setContextData({
        courses: data.courses || [],
        last_synced_at: selections.last_synced_at,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Canvas data')
      console.error('Error loading context data:', err)
    }
  }, [selections.last_synced_at])

  // Sync Canvas data
  const syncCanvas = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const response = await fetch('/api/context/sync', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to sync Canvas data')
      }

      const data = await response.json()
      setContextData({
        courses: data.courses || [],
        last_synced_at: data.last_synced_at,
      })
      setSelections(prev => ({
        ...prev,
        last_synced_at: data.last_synced_at,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync Canvas data')
      console.error('Error syncing Canvas:', err)
    } finally {
      setSyncing(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      setLoading(true)
      try {
        // Check authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError || !session) {
          router.push('/auth/login')
          return
        }

        // Load selections and context data
        await Promise.all([loadSelections(), loadContextData()])
      } catch (err) {
        console.error('Error initializing:', err)
      } finally {
        setLoading(false)
      }
    }
    initialize()
  }, [router, supabase, loadSelections, loadContextData])

  // Auto-save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const timeoutId = setTimeout(() => {
      saveSelections(selections)
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [selections, hasUnsavedChanges, saveSelections])

  // Toggle course expansion
  const toggleCourse = (courseId: number) => {
    setExpandedCourses(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) {
        next.delete(courseId)
      } else {
        next.add(courseId)
      }
      return next
    })
  }

  // Toggle selection handlers
  const toggleCourseSelection = (courseId: number) => {
    const course = contextData?.courses.find(c => c.id === courseId)
    if (!course) return

    setSelections(prev => {
      const isSelected = prev.courses.includes(courseId)
      const courseAssignments = course.assignments || []
      const courseModules = course.modules || []
      const assignmentIds = courseAssignments.map(a => a.id)
      const moduleIds = courseModules.map(m => m.id)

      if (isSelected) {
        // Deselect course and all its assignments and modules
        return {
          ...prev,
          courses: prev.courses.filter(id => id !== courseId),
          assignments: prev.assignments.filter(id => !assignmentIds.includes(id)),
          modules: prev.modules.filter(id => !moduleIds.includes(id)),
        }
      } else {
        // Select course and all its assignments and modules
        const newAssignmentIds = assignmentIds.filter(id => !prev.assignments.includes(id))
        const newModuleIds = moduleIds.filter(id => !prev.modules.includes(id))
        return {
          ...prev,
          courses: [...prev.courses, courseId],
          assignments: [...prev.assignments, ...newAssignmentIds],
          modules: [...prev.modules, ...newModuleIds],
        }
      }
    })
    setCurrentPresetId(null) // Clear preset when manually changing selections
    setHasUnsavedChanges(true)
  }

  const toggleAssignmentSelection = (assignmentId: number) => {
    setSelections(prev => ({
      ...prev,
      assignments: prev.assignments.includes(assignmentId)
        ? prev.assignments.filter(id => id !== assignmentId)
        : [...prev.assignments, assignmentId],
    }))
    setCurrentPresetId(null) // Clear preset when manually changing selections
    setHasUnsavedChanges(true)
  }

  const toggleModuleSelection = (moduleId: number) => {
    setSelections(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter(id => id !== moduleId)
        : [...prev.modules, moduleId],
    }))
    setCurrentPresetId(null) // Clear preset when manually changing selections
    setHasUnsavedChanges(true)
  }

  // Toggle all assignments in a course
  const toggleAllAssignmentsInCourse = (courseId: number) => {
    const course = contextData?.courses.find(c => c.id === courseId)
    if (!course) return
    
    const courseAssignments = course.assignments || []
    const allSelected = courseAssignments.every(a => selections.assignments.includes(a.id))
    
    setSelections(prev => {
      if (allSelected) {
        // Deselect all assignments in this course
        return {
          ...prev,
          assignments: prev.assignments.filter(id => 
            !courseAssignments.some(a => a.id === id)
          ),
        }
      } else {
        // Select all assignments in this course
        const newAssignmentIds = courseAssignments
          .map(a => a.id)
          .filter(id => !prev.assignments.includes(id))
        return {
          ...prev,
          assignments: [...prev.assignments, ...newAssignmentIds],
        }
      }
    })
    setCurrentPresetId(null) // Clear preset when manually changing selections
    setHasUnsavedChanges(true)
  }

  // Toggle all modules in a course
  const toggleAllModulesInCourse = (courseId: number) => {
    const course = contextData?.courses.find(c => c.id === courseId)
    if (!course) return
    
    const courseModules = course.modules || []
    const allSelected = courseModules.every(m => selections.modules.includes(m.id))
    
    setSelections(prev => {
      if (allSelected) {
        // Deselect all modules in this course
        return {
          ...prev,
          modules: prev.modules.filter(id => 
            !courseModules.some(m => m.id === id)
          ),
        }
      } else {
        // Select all modules in this course
        const newModuleIds = courseModules
          .map(m => m.id)
          .filter(id => !prev.modules.includes(id))
        return {
          ...prev,
          modules: [...prev.modules, ...newModuleIds],
        }
      }
    })
    setCurrentPresetId(null) // Clear preset when manually changing selections
    setHasUnsavedChanges(true)
  }

  // Bulk actions
  const selectAllCourses = () => {
    if (!contextData) return
    const allCourseIds = contextData.courses.map(c => c.id)
    const allAssignmentIds = contextData.courses.flatMap(c => c.assignments.map(a => a.id))
    const allModuleIds = contextData.courses.flatMap(c => c.modules.map(m => m.id))
    
    setSelections({
      ...selections,
      courses: allCourseIds,
      assignments: allAssignmentIds,
      modules: allModuleIds,
    })
    setCurrentPresetId(null) // Clear preset when manually changing selections
    setHasUnsavedChanges(true)
  }

  const deselectAllCourses = () => {
    setSelections({
      ...selections,
      courses: [],
      assignments: [],
      modules: [],
    })
    setCurrentPresetId(null) // Clear preset when manually changing selections
    setHasUnsavedChanges(true)
  }

  // Filter courses based on search
  const filteredCourses = useMemo(() => {
    if (!contextData) return []
    if (!searchQuery.trim()) return contextData.courses

    const query = searchQuery.toLowerCase()
    return contextData.courses.filter(course => {
      const courseMatch = course.name.toLowerCase().includes(query) || 
                         course.code.toLowerCase().includes(query)
      const assignmentMatch = course.assignments.some(a => 
        a.name.toLowerCase().includes(query)
      )
      const moduleMatch = course.modules.some(m => 
        m.name.toLowerCase().includes(query)
      )
      return courseMatch || assignmentMatch || moduleMatch
    })
  }, [contextData, searchQuery])


  // Format last sync time
  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading context...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="mb-4">
            <Image
              src="/dog_magnify.png"
              alt="Context Management"
              width={120}
              height={120}
              className="object-contain"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Context Management</h1>
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            Select courses, assignments, and modules to include in your chat context
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Button
              onClick={syncCanvas}
              disabled={syncing}
              variant="outline"
              size="sm"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
            {selections.last_synced_at && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Last synced: {formatLastSync(selections.last_synced_at)}
              </span>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Saving indicator */}
        {saving && (
          <Card className="border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving changes...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selection Summary with Integrated Presets */}
        <SelectionSummary
          currentPresetId={currentPresetId}
          onPresetIdChange={setCurrentPresetId}
          onPresetApplied={(presetId, newSelections) => {
            setSelections({
              courses: newSelections.courses,
              assignments: newSelections.assignments,
              modules: newSelections.modules,
              last_synced_at: selections.last_synced_at,
              current_preset_id: presetId,
            })
            setCurrentPresetId(presetId)
            setHasUnsavedChanges(false)
          }}
          selections={{
            courses: selections.courses,
            assignments: selections.assignments,
            modules: selections.modules,
          }}
          onPresetSaved={() => {
            loadSelections()
            setCurrentPresetId(null)
          }}
          onImportComplete={() => {
            loadSelections()
          }}
        />

        {/* Context tree */}
        <Card>
          <CardHeader>
            <CardTitle>
              Canvas Context
              {contextData && (
                <Badge variant="secondary" className="ml-2">
                  {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Select items to make available in chat sessions. Changes are saved automatically.
            </CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search courses, assignments, or modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button
                onClick={selectAllCourses}
                variant="outline"
                size="sm"
                disabled={!contextData || contextData.courses.length === 0}
              >
                Select All
              </Button>
              <Button
                onClick={deselectAllCourses}
                variant="outline"
                size="sm"
                disabled={selections.courses.length === 0 && selections.assignments.length === 0 && selections.modules.length === 0}
              >
                Deselect All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!contextData || filteredCourses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {!contextData ? (
                  <>
                    <p className="mb-2">No Canvas data available</p>
                    <Button onClick={syncCanvas} variant="outline" size="sm" className="mt-4">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync from Canvas
                    </Button>
                  </>
                ) : (
                  <p>No courses found matching your search.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCourses.map((course) => {
                  const isExpanded = expandedCourses.has(course.id)
                  const isCourseSelected = selections.courses.includes(course.id)
                  const courseAssignments = course.assignments || []
                  const courseModules = course.modules || []
                  const selectedAssignmentsCount = courseAssignments.filter(a =>
                    selections.assignments.includes(a.id)
                  ).length
                  const selectedModulesCount = courseModules.filter(m =>
                    selections.modules.includes(m.id)
                  ).length

                  return (
                    <div key={course.id} className="border rounded-lg p-4 space-y-3">
                      {/* Course header */}
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleCourse(course.id)}
                          className="mt-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          aria-label={isExpanded ? 'Collapse course' : 'Expand course'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                        <Checkbox
                          id={`course-${course.id}`}
                          checked={isCourseSelected}
                          onChange={() => toggleCourseSelection(course.id)}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <label
                          htmlFor={`course-${course.id}`}
                          className="flex-1 cursor-pointer min-w-0"
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium break-words">{course.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {course.code}
                              </Badge>
                              {(selectedAssignmentsCount > 0 || selectedModulesCount > 0) && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  {selectedAssignmentsCount} assignments, {selectedModulesCount} modules
                                </Badge>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>

                      {/* Course content (assignments and modules) */}
                      {isExpanded && (
                        <div className="ml-8 space-y-4">
                          {/* Assignments */}
                          {courseAssignments.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  id={`assignments-all-${course.id}`}
                                  checked={courseAssignments.length > 0 && courseAssignments.every(a => selections.assignments.includes(a.id))}
                                  onChange={() => toggleAllAssignmentsInCourse(course.id)}
                                />
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Assignments ({courseAssignments.length})
                                </h4>
                              </div>
                              <div className="space-y-2 ml-6">
                                {courseAssignments.map((assignment) => {
                                  const isSelected = selections.assignments.includes(assignment.id)
                                  return (
                                    <div key={assignment.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`assignment-${assignment.id}`}
                                        checked={isSelected}
                                        onChange={() => toggleAssignmentSelection(assignment.id)}
                                      />
                                      <label
                                        htmlFor={`assignment-${assignment.id}`}
                                        className="flex-1 cursor-pointer text-sm"
                                      >
                                        {assignment.name}
                                      </label>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Modules */}
                          {courseModules.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  id={`modules-all-${course.id}`}
                                  checked={courseModules.length > 0 && courseModules.every(m => selections.modules.includes(m.id))}
                                  onChange={() => toggleAllModulesInCourse(course.id)}
                                />
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                  <Layers className="w-4 h-4" />
                                  Modules ({courseModules.length})
                                </h4>
                              </div>
                              <div className="space-y-2 ml-6">
                                {courseModules.map((module) => {
                                  const isSelected = selections.modules.includes(module.id)
                                  return (
                                    <div key={module.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`module-${module.id}`}
                                        checked={isSelected}
                                        onChange={() => toggleModuleSelection(module.id)}
                                      />
                                      <label
                                        htmlFor={`module-${module.id}`}
                                        className="flex-1 cursor-pointer text-sm"
                                      >
                                        {module.name}
                                      </label>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {courseAssignments.length === 0 && courseModules.length === 0 && (
                            <p className="text-sm text-muted-foreground ml-6">
                              No assignments or modules available for this course.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
