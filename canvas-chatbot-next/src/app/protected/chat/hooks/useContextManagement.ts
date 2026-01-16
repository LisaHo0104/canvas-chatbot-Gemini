import { useCallback } from 'react'
import type { AvailableContext } from '../types'

export function useContextManagement(
  availableContext: AvailableContext,
  canvasStatus: 'connected' | 'missing' | 'error'
) {
  const loadAvailableContext = useCallback(async () => {
    if (canvasStatus !== 'connected') return
    try {
      const res = await fetch('/api/context/selection')
      if (res.ok) {
        const data = await res.json()
        return {
          courses: data.courses || [],
          assignments: data.assignments || [],
          modules: data.modules || [],
        }
      } else {
        console.error('[DEBUG] Failed to load available context, status:', res.status)
        return null
      }
    } catch (e) {
      console.error('Failed to load available context', e)
      return null
    }
  }, [canvasStatus])

  const getCourseName = useCallback((courseId: number, availableContext: AvailableContext): string => {
    const course = availableContext.courses.find(c => c.id === courseId)
    return course?.name || `Course ${courseId}`
  }, [])

  const getCourseCode = useCallback((courseId: number, availableContext: AvailableContext): string | undefined => {
    const course = availableContext.courses.find(c => c.id === courseId)
    return course?.code
  }, [])

  const getAssignmentName = useCallback((assignmentId: number, availableContext: AvailableContext): string => {
    const assignment = availableContext.assignments.find(a => a.id === assignmentId)
    return assignment?.name || `Assignment ${assignmentId}`
  }, [])

  const getModuleName = useCallback((moduleId: number, availableContext: AvailableContext): string => {
    const module = availableContext.modules.find(m => m.id === moduleId)
    return module?.name || `Module ${moduleId}`
  }, [])

  return {
    loadAvailableContext,
    getCourseName,
    getCourseCode,
    getAssignmentName,
    getModuleName,
  }
}
