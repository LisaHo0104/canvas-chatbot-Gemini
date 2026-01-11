'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { RefreshCw, Search, ChevronDown, ChevronRight, BookOpen, FileText, Layers, CheckCircle2, Loader2, FileCode, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { SelectionSummary } from '@/components/context/SelectionSummary'
import { SystemPromptListInline } from '@/components/context/SystemPromptListInline'
import { toast } from 'sonner'

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

interface ContextItem {
  id: number
  name: string
  code?: string
  course_id?: number // Course ID for assignments and modules
}

interface ContextSelections {
  courses: number[] | ContextItem[]
  assignments: number[] | ContextItem[]
  modules: number[] | ContextItem[]
  last_synced_at: string | null
  current_profile_id: string | null
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
    current_profile_id: null,
  })
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)
  const [enabledSystemPromptIds, setEnabledSystemPromptIds] = useState<string[]>([])
  const [savingPrompts, setSavingPrompts] = useState(false)
  const [creatingNewPrompt, setCreatingNewPrompt] = useState(false)
  const hasAttemptedInitialAutoSelect = useRef(false)
  const hasLoadedSelections = useRef(false) // Track if we've loaded selections from DB
  const selectionsRef = useRef<ContextSelections>(selections) // Store latest selections for auto-save
  const hasCheckedNamesRef = useRef(false) // Track if we've checked and updated names

  const supabase = createSupabaseClient()
  
  // Keep ref in sync with state
  useEffect(() => {
    selectionsRef.current = selections
  }, [selections])

  // Debounced save function
  const saveSelections = useCallback(async (newSelections: ContextSelections) => {
    setSaving(true)
    setError(null)
    try {
      // Convert IDs to objects with names for saving
      const coursesWithNames: ContextItem[] = (newSelections.courses as number[]).map((id) => {
        const course = contextData?.courses.find(c => c.id === id)
        return {
          id,
          name: course?.name || `Course ${id}`,
          code: course?.code,
        }
      })

      const assignmentsWithNames: ContextItem[] = (newSelections.assignments as number[]).map((id) => {
        // Find assignment across all courses
        for (const course of contextData?.courses || []) {
          const assignment = course.assignments.find(a => a.id === id)
          if (assignment) {
            return {
              id,
              name: assignment.name,
              course_id: course.id, // Include course_id
            }
          }
        }
        return {
          id,
          name: `Assignment ${id}`,
        }
      })

      const modulesWithNames: ContextItem[] = (newSelections.modules as number[]).map((id) => {
        // Find module across all courses
        for (const course of contextData?.courses || []) {
          const module = course.modules.find(m => m.id === id)
          if (module) {
            return {
              id,
              name: module.name,
              course_id: course.id, // Include course_id
            }
          }
        }
        return {
          id,
          name: `Module ${id}`,
        }
      })

      const response = await fetch('/api/context/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courses: coursesWithNames,
          assignments: assignmentsWithNames,
          modules: modulesWithNames,
          current_profile_id: newSelections.current_profile_id, // Use profile ID from selections object
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save selections')
      }

      const data = await response.json()
      // Update profile ID from response - always sync with database
      const returnedProfileId = data.current_profile_id || null
      setCurrentProfileId(returnedProfileId)
      
      // Only update state if something actually changed to avoid triggering unnecessary re-renders
      setSelections(prev => {
        const newLastSynced = data.last_synced_at || prev.last_synced_at
        const newProfileId = returnedProfileId
        
        // Deep check if anything actually changed
        // Extract IDs from prev arrays (they might be ContextItem[] or number[])
        const extractIds = (items: (number | ContextItem)[]): number[] => {
          return items.map(item => typeof item === 'object' && item !== null ? item.id : item)
        }
        const prevCourseIds = extractIds(prev.courses)
        const prevAssignmentIds = extractIds(prev.assignments)
        const prevModuleIds = extractIds(prev.modules)
        
        const coursesChanged = prevCourseIds.length !== (newSelections.courses as number[]).length ||
          !(newSelections.courses as number[]).every(id => prevCourseIds.includes(id))
        const assignmentsChanged = prevAssignmentIds.length !== (newSelections.assignments as number[]).length ||
          !(newSelections.assignments as number[]).every(id => prevAssignmentIds.includes(id))
        const modulesChanged = prevModuleIds.length !== (newSelections.modules as number[]).length ||
          !(newSelections.modules as number[]).every(id => prevModuleIds.includes(id))
        const lastSyncedChanged = prev.last_synced_at !== newLastSynced
        const profileIdChanged = prev.current_profile_id !== newProfileId
        
        // If nothing changed, return previous state to avoid unnecessary updates
        if (!coursesChanged && !assignmentsChanged && !modulesChanged && !lastSyncedChanged && !profileIdChanged) {
          return prev
        }
        
        return {
          ...newSelections,
          last_synced_at: newLastSynced,
          current_profile_id: newProfileId,
        }
      })
      
      // Always set hasUnsavedChanges to false after saving
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selections')
      console.error('Error saving selections:', err)
    } finally {
      setSaving(false)
    }
  }, [contextData]) // Only depend on contextData, not on selections or profileId (we get those from the parameter)

  // Load context selections from database
  const loadSelections = useCallback(async () => {
    try {
      const response = await fetch('/api/context/selection')
      if (!response.ok) {
        throw new Error('Failed to load selections')
      }
      const data = await response.json()
      // Convert objects to IDs for internal state (backward compatible)
      const extractIds = (items: any[]): number[] => {
        return items.map(item => typeof item === 'object' && item !== null ? item.id : item)
      }
      const loadedCourses = extractIds(data.courses || [])
      const loadedAssignments = extractIds(data.assignments || [])
      const loadedModules = extractIds(data.modules || [])
      
      setSelections({
        courses: loadedCourses,
        assignments: loadedAssignments,
        modules: loadedModules,
        last_synced_at: data.last_synced_at || null,
        current_profile_id: data.current_profile_id || null,
      })
      // Set the current profile ID from the loaded data
      if (data.current_profile_id) {
        setCurrentProfileId(data.current_profile_id)
      } else {
        setCurrentProfileId(null)
      }
      // Set enabled system prompt IDs
      setEnabledSystemPromptIds(data.enabled_system_prompt_ids || [])
      
      // Mark that we've loaded data from the database
      hasLoadedSelections.current = true
      
      // If user has a last_synced_at, they've used the system before - don't auto-select
      // If no last_synced_at, it's a first-time user (no DB record) - allow auto-select
      if (data.last_synced_at !== null) {
        // User has used system before - never auto-select
        hasAttemptedInitialAutoSelect.current = true
      }
      // If last_synced_at is null, it's first time - allow auto-select to run
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

  // Auto-select all courses on initial load when no selections exist (default profile behavior)
  // Only runs once on initial load for first-time users, not when user manually deselects everything
  useEffect(() => {
    if (!contextData || !contextData.courses.length || loading || saving) return
    if (currentProfileId !== null) return // Don't auto-select if a profile is active
    if (hasAttemptedInitialAutoSelect.current) return // Only attempt once
    if (!hasLoadedSelections.current) return // Wait until we've loaded from DB to check
    
    // Use a function to get current selections state to avoid dependency issues
    setSelections(prev => {
      const hasNoSelections = prev.courses.length === 0 && 
                             prev.assignments.length === 0 && 
                             prev.modules.length === 0
      
      // Only auto-select if:
      // 1. No selections exist
      // 2. No last_synced_at (meaning no DB record exists - first-time user)
      const isFirstTimeUser = !prev.last_synced_at
      
      if (hasNoSelections && isFirstTimeUser && !hasAttemptedInitialAutoSelect.current) {
        hasAttemptedInitialAutoSelect.current = true // Mark as attempted
        
        const allCourseIds = contextData.courses.map(c => c.id)
        const allAssignmentIds = contextData.courses.flatMap(c => c.assignments.map(a => a.id))
        const allModuleIds = contextData.courses.flatMap(c => c.modules.map(m => m.id))
        
        if (allCourseIds.length > 0) {
          // Avoid infinite loop: only update if we don't already have all courses selected
          // Extract IDs from prev.courses (they might be ContextItem[] or number[])
          const prevCourseIds = prev.courses.map(item => typeof item === 'object' && item !== null ? item.id : item)
          if (prevCourseIds.length === allCourseIds.length && 
              allCourseIds.every(id => prevCourseIds.includes(id))) {
            return prev
          }
          
          setHasUnsavedChanges(true)
          return {
            ...prev,
            courses: allCourseIds,
            assignments: allAssignmentIds,
            modules: allModuleIds,
          }
        }
      } else if (prev.last_synced_at !== null) {
        // If user has used system before (has last_synced_at), mark as attempted
        // This prevents auto-select if user later deselects everything
        hasAttemptedInitialAutoSelect.current = true
      }
      
      return prev
    })
  }, [contextData, currentProfileId, loading, saving])

  // Auto-update selections with names when contextData is available
  // This ensures existing data without names gets updated
  useEffect(() => {
    if (!contextData || !contextData.courses.length || saving || loading) return
    if (hasCheckedNamesRef.current) return // Only check once
    
    // Only check once after contextData is loaded, not on every selection change
    const checkAndUpdateNames = async () => {
      try {
        const response = await fetch('/api/context/selection')
        if (!response.ok) return
        
        const data = await response.json()
        
        // Check if any items have placeholder names (like "Item X" or "Course X")
        const needsUpdate = 
          data.courses.some((c: any) => !c.name || c.name.startsWith('Item ') || c.name.startsWith('Course ')) ||
          data.assignments.some((a: any) => !a.name || a.name.startsWith('Item ') || a.name.startsWith('Assignment ')) ||
          data.modules.some((m: any) => !m.name || m.name.startsWith('Item ') || m.name.startsWith('Module '))
        
        if (needsUpdate && !saving) {
          hasCheckedNamesRef.current = true // Mark as checked before saving
          // Re-save selections with proper names using the ref
          // This will set hasUnsavedChanges to false after saving
          await saveSelections(selectionsRef.current)
        } else {
          hasCheckedNamesRef.current = true // Mark as checked even if no update needed
        }
      } catch (err) {
        console.error('Error checking names:', err)
        hasCheckedNamesRef.current = true // Mark as checked even on error to prevent retries
      }
    }
    
    // Only run this check once when contextData is first loaded
    const timeoutId = setTimeout(() => {
      checkAndUpdateNames()
    }, 2000) // Wait 2 seconds after contextData loads to avoid conflicts
    
    return () => clearTimeout(timeoutId)
  }, [contextData, saving, loading, saveSelections])

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
    if (!hasUnsavedChanges || saving) return

    const timeoutId = setTimeout(() => {
      // Use ref to get latest selections without adding it as dependency
      // Only save if we're not already saving and there are actually unsaved changes
      if (!saving && hasUnsavedChanges) {
        saveSelections(selectionsRef.current)
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [hasUnsavedChanges, saving, saveSelections])

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

  // Helper to extract IDs from arrays that might be number[] or ContextItem[]
  const extractIds = (items: (number | ContextItem)[]): number[] => {
    return items.map(item => typeof item === 'object' && item !== null ? item.id : item)
  }

  // Toggle selection handlers
  const toggleCourseSelection = (courseId: number) => {
    const course = contextData?.courses.find(c => c.id === courseId)
    if (!course) return

    setSelections(prev => {
      const prevCourseIds = extractIds(prev.courses)
      const prevAssignmentIds = extractIds(prev.assignments)
      const prevModuleIds = extractIds(prev.modules)
      
      const isSelected = prevCourseIds.includes(courseId)
      const courseAssignments = course.assignments || []
      const courseModules = course.modules || []
      const assignmentIds = courseAssignments.map(a => a.id)
      const moduleIds = courseModules.map(m => m.id)

      if (isSelected) {
        // Deselect course and all its assignments and modules
        return {
          ...prev,
          courses: prevCourseIds.filter(id => id !== courseId),
          assignments: prevAssignmentIds.filter(id => !assignmentIds.includes(id)),
          modules: prevModuleIds.filter(id => !moduleIds.includes(id)),
          // Preserve profile ID and last_synced_at
          last_synced_at: prev.last_synced_at,
          current_profile_id: prev.current_profile_id,
        }
      } else {
        // Select course and all its assignments and modules
        const newAssignmentIds = assignmentIds.filter(id => !prevAssignmentIds.includes(id))
        const newModuleIds = moduleIds.filter(id => !prevModuleIds.includes(id))
        return {
          ...prev,
          courses: [...prevCourseIds, courseId],
          assignments: [...prevAssignmentIds, ...newAssignmentIds],
          modules: [...prevModuleIds, ...newModuleIds],
          // Preserve profile ID and last_synced_at
          last_synced_at: prev.last_synced_at,
          current_profile_id: prev.current_profile_id,
        }
      }
    })
    // Keep profile ID when manually changing selections - allows auto-sync to active profile
    setHasUnsavedChanges(true)
  }

  const toggleAssignmentSelection = (assignmentId: number) => {
    setSelections(prev => {
      const prevAssignmentIds = extractIds(prev.assignments)
      return {
        ...prev,
        assignments: prevAssignmentIds.includes(assignmentId)
          ? prevAssignmentIds.filter(id => id !== assignmentId)
          : [...prevAssignmentIds, assignmentId],
      }
    })
    // Keep profile ID when manually changing selections - allows auto-sync to active profile
    setHasUnsavedChanges(true)
  }

  const toggleModuleSelection = (moduleId: number) => {
    setSelections(prev => {
      const prevModuleIds = extractIds(prev.modules)
      return {
        ...prev,
        modules: prevModuleIds.includes(moduleId)
          ? prevModuleIds.filter(id => id !== moduleId)
          : [...prevModuleIds, moduleId],
      }
    })
    // Keep profile ID when manually changing selections - allows auto-sync to active profile
    setHasUnsavedChanges(true)
  }

  // Toggle all assignments in a course
  const toggleAllAssignmentsInCourse = (courseId: number) => {
    const course = contextData?.courses.find(c => c.id === courseId)
    if (!course) return
    
    const courseAssignments = course.assignments || []
    const prevAssignmentIds = extractIds(selections.assignments)
    const allSelected = courseAssignments.every(a => prevAssignmentIds.includes(a.id))
    
    setSelections(prev => {
      const currentAssignmentIds = extractIds(prev.assignments)
      if (allSelected) {
        // Deselect all assignments in this course
        return {
          ...prev,
          assignments: currentAssignmentIds.filter(id => 
            !courseAssignments.some(a => a.id === id)
          ),
        }
      } else {
        // Select all assignments in this course
        const newAssignmentIds = courseAssignments
          .map(a => a.id)
          .filter(id => !currentAssignmentIds.includes(id))
        return {
          ...prev,
          assignments: [...currentAssignmentIds, ...newAssignmentIds],
        }
      }
    })
    // Keep profile ID when manually changing selections - allows auto-sync to active profile
    setHasUnsavedChanges(true)
  }

  // Toggle all modules in a course
  const toggleAllModulesInCourse = (courseId: number) => {
    const course = contextData?.courses.find(c => c.id === courseId)
    if (!course) return
    
    const courseModules = course.modules || []
    const prevModuleIds = extractIds(selections.modules)
    const allSelected = courseModules.every(m => prevModuleIds.includes(m.id))
    
    setSelections(prev => {
      const currentModuleIds = extractIds(prev.modules)
      if (allSelected) {
        // Deselect all modules in this course
        return {
          ...prev,
          modules: currentModuleIds.filter(id => 
            !courseModules.some(m => m.id === id)
          ),
        }
      } else {
        // Select all modules in this course
        const newModuleIds = courseModules
          .map(m => m.id)
          .filter(id => !currentModuleIds.includes(id))
        return {
          ...prev,
          modules: [...currentModuleIds, ...newModuleIds],
        }
      }
    })
    // Keep profile ID when manually changing selections - allows auto-sync to active profile
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
    // Keep profile ID when manually changing selections - allows auto-sync to active profile
    setHasUnsavedChanges(true)
  }

  const deselectAllCourses = () => {
    setSelections({
      ...selections,
      courses: [],
      assignments: [],
      modules: [],
    })
    // Keep profile ID when manually changing selections - allows auto-sync to active profile
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

  // Extract IDs from selections for render (selections can be number[] or ContextItem[])
  const selectionIds = useMemo(() => ({
    courses: extractIds(selections.courses),
    assignments: extractIds(selections.assignments),
    modules: extractIds(selections.modules),
  }), [selections.courses, selections.assignments, selections.modules])


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
            Manage system prompts and Canvas context for chat sessions
          </p>
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

        {/* System Prompt Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              System Prompts
            </CardTitle>
            <CardDescription>
              Select which system prompts are available for chat sessions. Click Edit to modify a prompt.
            </CardDescription>
            <CardAction>
              <Button
                variant="default"
                size="sm"
                onClick={async () => {
                  setCreatingNewPrompt(true)
                  try {
                    const response = await fetch('/api/system-prompts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: 'New Prompt',
                        description: 'A new custom system prompt',
                        prompt_text: 'You are a helpful assistant.',
                      }),
                    })

                    if (!response.ok) {
                      const errorData = await response.json().catch(() => ({}))
                      throw new Error(errorData.error || 'Failed to create prompt')
                    }

                    const data = await response.json()
                    
                    // Auto-enable the new prompt
                    const newEnabledIds = [...enabledSystemPromptIds, data.prompt.id]
                    setEnabledSystemPromptIds(newEnabledIds)
                    
                    try {
                      await fetch('/api/context/selection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          courses: selections.courses,
                          assignments: selections.assignments,
                          modules: selections.modules,
                          enabled_system_prompt_ids: newEnabledIds,
                        }),
                      })
                    } catch (error) {
                      console.error('Error enabling new prompt:', error)
                      // Don't fail the whole operation if enabling fails
                    }
                    
                    toast.success('New prompt created!')
                    router.push(`/protected/context/system-prompts?id=${data.prompt.id}`)
                  } catch (error) {
                    console.error('Error creating new prompt:', error)
                    toast.error(error instanceof Error ? error.message : 'Failed to create prompt')
                  } finally {
                    setCreatingNewPrompt(false)
                  }
                }}
                disabled={creatingNewPrompt}
              >
                {creatingNewPrompt ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Prompt
                  </>
                )}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <SystemPromptListInline
              enabledPromptIds={enabledSystemPromptIds}
              onToggleEnabled={async (promptId, enabled) => {
                const newEnabledIds = enabled
                  ? [...enabledSystemPromptIds, promptId]
                  : enabledSystemPromptIds.filter((id) => id !== promptId)
                
                setEnabledSystemPromptIds(newEnabledIds)
                setSavingPrompts(true)
                
                try {
                  const response = await fetch('/api/context/selection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      courses: selections.courses,
                      assignments: selections.assignments,
                      modules: selections.modules,
                      enabled_system_prompt_ids: newEnabledIds,
                    }),
                  })
                  
                  if (!response.ok) {
                    throw new Error('Failed to save enabled prompts')
                  }
                } catch (error) {
                  console.error('Error saving enabled prompts:', error)
                  // Revert on error
                  setEnabledSystemPromptIds(enabledSystemPromptIds)
                } finally {
                  setSavingPrompts(false)
                }
              }}
            />
            {savingPrompts && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving changes...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Merged Canvas Context Card with Selection Summary */}
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
            <div className="flex items-center gap-2 mt-2">
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
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Compact Stats Bar */}
            <div className="flex items-center gap-4 py-3 border-b flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Courses:</span>
                <span className="text-lg font-semibold">{selections.courses.length}</span>
              </div>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Assignments:</span>
                <span className="text-lg font-semibold">{selections.assignments.length}</span>
              </div>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Modules:</span>
                <span className="text-lg font-semibold">{selections.modules.length}</span>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <SelectionSummary
                currentProfileId={selections.current_profile_id || currentProfileId}
                onProfileIdChange={(profileId) => {
                  setCurrentProfileId(profileId)
                  // Also update in selections object to keep in sync
                  setSelections(prev => ({
                    ...prev,
                    current_profile_id: profileId,
                  }))
                }}
                onProfileApplied={(profileId, newSelections) => {
                  // If default profile (null) and no selections provided, clear all selections
                  if (profileId === null && newSelections.courses.length === 0) {
                    setSelections({
                      courses: [],
                      assignments: [],
                      modules: [],
                      last_synced_at: selections.last_synced_at,
                      current_profile_id: null,
                    })
                  } else {
                    setSelections({
                      courses: newSelections.courses,
                      assignments: newSelections.assignments,
                      modules: newSelections.modules,
                      last_synced_at: selections.last_synced_at,
                      current_profile_id: profileId,
                    })
                  }
                  setCurrentProfileId(profileId)
                  // Profile was already saved via API endpoint, so no need to save again
                  setHasUnsavedChanges(false)
                }}
                selections={{
                  courses: selectionIds.courses,
                  assignments: selectionIds.assignments,
                  modules: selectionIds.modules,
                }}
                onProfileSaved={() => {
                  loadSelections()
                  // Don't clear currentProfileId - let loadSelections set it from database
                }}
                onImportComplete={() => {
                  loadSelections()
                }}
                hideCard={true}
              />
            </div>

            {/* Search & Bulk Actions Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search courses, assignments, or modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
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
            </div>

            {/* Course Tree */}
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
              <div className="space-y-2 sm:space-y-3">
                {filteredCourses.map((course) => {
                  const isExpanded = expandedCourses.has(course.id)
                  const isCourseSelected = selectionIds.courses.includes(course.id)
                  const courseAssignments = course.assignments || []
                  const courseModules = course.modules || []
                  const selectedAssignmentsCount = courseAssignments.filter(a =>
                    selectionIds.assignments.includes(a.id)
                  ).length
                  const selectedModulesCount = courseModules.filter(m =>
                    selectionIds.modules.includes(m.id)
                  ).length

                  return (
                    <div key={course.id} className="border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                      {/* Course header */}
                      <div className="flex items-start gap-2 sm:gap-3">
                        <button
                          onClick={() => toggleCourse(course.id)}
                          className="mt-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          aria-label={isExpanded ? 'Collapse course' : 'Expand course'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
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
                          <div className="flex flex-col gap-1 sm:gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium break-words text-sm sm:text-base">{course.name}</span>
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
                        <div className="ml-6 sm:ml-8 space-y-3 sm:space-y-4">
                          {/* Assignments */}
                          {courseAssignments.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                  id={`assignments-all-${course.id}`}
                                  checked={courseAssignments.length > 0 && courseAssignments.every(a => selectionIds.assignments.includes(a.id))}
                                  onChange={() => toggleAllAssignmentsInCourse(course.id)}
                                />
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                  <FileText className="w-4 h-4" />
                                  Assignments ({courseAssignments.length})
                                </h4>
                              </div>
                              <div className="space-y-1.5 sm:space-y-2 ml-4 sm:ml-6">
                                {courseAssignments.map((assignment) => {
                                  const isSelected = selectionIds.assignments.includes(assignment.id)
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
                                  checked={courseModules.length > 0 && courseModules.every(m => selectionIds.modules.includes(m.id))}
                                  onChange={() => toggleAllModulesInCourse(course.id)}
                                />
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                  <Layers className="w-4 h-4" />
                                  Modules ({courseModules.length})
                                </h4>
                              </div>
                              <div className="space-y-1.5 sm:space-y-2 ml-4 sm:ml-6">
                                {courseModules.map((module) => {
                                  const isSelected = selectionIds.modules.includes(module.id)
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
                            <p className="text-sm text-muted-foreground ml-4 sm:ml-6">
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
