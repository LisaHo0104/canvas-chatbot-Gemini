'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { CanvasCourse, CanvasModule } from '@/lib/canvas-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { BookOpen, Calendar, Search, Loader2, FileText, Link as LinkIcon, CheckSquare, MessageSquare, File, ArrowLeft } from 'lucide-react'
import { ResizableSplitPane } from '@/components/ui/resizable-split-pane'
import { cn } from '@/lib/utils'

// Component for module checkbox with indeterminate state support
function ModuleCheckbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const checkboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <Checkbox
      ref={checkboxRef}
      checked={checked}
      onChange={onChange}
    />
  )
}

export default function StudyRoadmapPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<CanvasCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const enrollmentState: 'active' | 'completed' | 'all' = 'all'
  const [selectedCourse, setSelectedCourse] = useState<CanvasCourse | null>(null)
  const [modules, setModules] = useState<CanvasModule[]>([])
  const [modulesLoading, setModulesLoading] = useState(false)
  const [modulesError, setModulesError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set()) // Format: "moduleId-itemId"

  async function loadCourses(term?: string, state?: 'active' | 'completed' | 'all') {
    try {
      setLoading(true)
      setError(null)
      const qs = new URLSearchParams()
      if (term && term.trim()) qs.set('searchTerm', term.trim())
      qs.set('enrollmentState', state || enrollmentState)
      qs.set('perPage', '100')
      const res = await fetch(`/api/canvas/courses?${qs.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j?.error || `Failed to load courses (${res.status})`)
        setCourses([])
        return
      }
      const j = await res.json()
      const data: CanvasCourse[] = Array.isArray(j?.courses) ? j.courses : []
      setCourses(data)
    } catch (e: any) {
      console.error('Failed to load courses', e)
      setError('Failed to load courses')
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses(search, enrollmentState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = () => {
    loadCourses(search, enrollmentState)
  }

  const filteredCourses = courses.filter((course) => {
    if (!search.trim()) return true
    const searchLower = search.toLowerCase()
    return (
      course.name.toLowerCase().includes(searchLower) ||
      course.course_code.toLowerCase().includes(searchLower)
    )
  })

  async function loadModules(courseId: number) {
    try {
      setModulesLoading(true)
      setModulesError(null)
      const qs = new URLSearchParams()
      qs.set('courseId', String(courseId))
      qs.set('includeItems', 'true')
      qs.set('includeContentDetails', 'false')
      qs.set('perPage', '50')
      const res = await fetch(`/api/canvas/modules?${qs.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setModulesError(j?.error || `Failed to load modules (${res.status})`)
        setModules([])
        return
      }
      const j = await res.json()
      const data: CanvasModule[] = Array.isArray(j?.modules) ? j.modules : []
      setModules(data)
    } catch (e) {
      console.error('Failed to load modules', e)
      setModulesError('Failed to load modules')
      setModules([])
    } finally {
      setModulesLoading(false)
    }
  }

  function handleCourseClick(course: CanvasCourse) {
    setSelectedCourse(course)
    setSelectedItems(new Set())
    loadModules(course.id)
  }

  function handleItemToggle(moduleId: number, itemId: number) {
    const key = `${moduleId}-${itemId}`
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function isModuleFullySelected(module: CanvasModule): boolean {
    if (!Array.isArray(module.items) || module.items.length === 0) return false
    return module.items.every(item => selectedItems.has(`${module.id}-${item.id}`))
  }

  function isModulePartiallySelected(module: CanvasModule): boolean {
    if (!Array.isArray(module.items) || module.items.length === 0) return false
    const selectedCount = module.items.filter(item => selectedItems.has(`${module.id}-${item.id}`)).length
    return selectedCount > 0 && selectedCount < module.items.length
  }

  function handleModuleToggle(module: CanvasModule) {
    if (!Array.isArray(module.items) || module.items.length === 0) return
    
    const isFullySelected = isModuleFullySelected(module)
    
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (isFullySelected) {
        // Deselect all items in this module
        module.items.forEach(item => {
          next.delete(`${module.id}-${item.id}`)
        })
      } else {
        // Select all items in this module
        module.items.forEach(item => {
          next.add(`${module.id}-${item.id}`)
        })
      }
      return next
    })
  }

  function getItemIcon(type: string) {
    switch (type) {
      case 'Page': return <FileText className="w-4 h-4 text-blue-500" />
      case 'Assignment': return <CheckSquare className="w-4 h-4 text-green-500" />
      case 'Quiz': return <CheckSquare className="w-4 h-4 text-orange-500" />
      case 'Discussion': return <MessageSquare className="w-4 h-4 text-purple-500" />
      case 'File': return <File className="w-4 h-4 text-gray-500" />
      case 'ExternalUrl': return <LinkIcon className="w-4 h-4 text-sky-500" />
      default: return <File className="w-4 h-4" />
    }
  }

  function handleContinue() {
    if (!selectedCourse) return
    
    const selectedData = Array.from(selectedItems).map(key => {
      const [moduleId, itemId] = key.split('-')
      return { moduleId: Number(moduleId), itemId: Number(itemId) }
    })
    
    // Navigate to questions page with selected items and course info
    const params = new URLSearchParams({
      selectedItems: JSON.stringify(selectedData),
      courseId: String(selectedCourse.id),
      courseName: selectedCourse.name || '',
    })
    
    router.push(`/protected/study-roadmap/questions?${params.toString()}`)
  }

  const renderCoursesList = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-1">Study Roadmap</h1>
          <p className="text-sm text-muted-foreground">Select a course to view modules</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} size="sm">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading
              </>
            ) : (
              'Search'
            )}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No courses found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCourses.map((course) => {
              const status = course.workflow_state
              const isActive = status === 'available'
              const isCompleted = status === 'completed'
              const isSelected = selectedCourse?.id === course.id

              return (
                <Card
                  key={course.id}
                  className={cn(
                    "transition-all cursor-pointer h-full",
                    isSelected
                      ? "border-primary bg-accent shadow-md"
                      : "hover:shadow-md bg-background hover:bg-accent/5"
                  )}
                  onClick={() => handleCourseClick(course)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-sm font-semibold leading-tight line-clamp-2" title={course.name}>
                          {course.name}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono truncate" title={course.course_code}>
                          {course.course_code}
                        </p>
                      </div>
                      <Badge
                        variant={isActive ? 'default' : isCompleted ? 'secondary' : 'outline'}
                        className={`text-[10px] px-2 py-0.5 h-fit shrink-0 capitalize ${
                          isActive
                            ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700'
                            : isCompleted
                              ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
                              : ''
                        }`}
                      >
                        {status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const renderModulesList = () => (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold">{selectedCourse?.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedCourse?.course_code}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCourse(null)
              setModules([])
              setSelectedItems(new Set())
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Select modules and items to include in your roadmap</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {modulesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading modules...</span>
          </div>
        ) : modulesError ? (
          <div className="text-sm text-destructive">{modulesError}</div>
        ) : modules.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No modules found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((module) => {
              const moduleFullySelected = isModuleFullySelected(module)
              const modulePartiallySelected = isModulePartiallySelected(module)
              const moduleItemCount = Array.isArray(module.items) ? module.items.length : 0
              
              return (
              <Card 
                key={module.id} 
                className={cn(
                  "overflow-hidden transition-colors",
                  moduleFullySelected && "border-primary bg-accent/5"
                )}
              >
                <CardHeader 
                  className={cn(
                    "pb-3 cursor-pointer hover:bg-accent/50 transition-colors",
                    moduleFullySelected && "bg-accent/30"
                  )}
                  onClick={() => handleModuleToggle(module)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div onClick={(e) => e.stopPropagation()}>
                          <ModuleCheckbox
                            checked={moduleFullySelected}
                            indeterminate={modulePartiallySelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleModuleToggle(module)
                            }}
                          />
                        </div>
                        <CardTitle className="text-base">{module.name}</CardTitle>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        {moduleItemCount} item{moduleItemCount !== 1 ? 's' : ''}
                        {moduleFullySelected && (
                          <span className="ml-2 text-primary font-medium">• All selected</span>
                        )}
                        {modulePartiallySelected && (
                          <span className="ml-2 text-muted-foreground">• Partially selected</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {Array.isArray(module.items) && module.items.length > 0 ? (
                    module.items.map((item) => {
                      const key = `${module.id}-${item.id}`
                      const isSelected = selectedItems.has(key)
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-md border transition-colors cursor-pointer",
                            isSelected
                              ? "border-primary bg-accent"
                              : "border-border hover:bg-muted/50"
                          )}
                          onClick={() => handleItemToggle(module.id, item.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleItemToggle(module.id, item.id)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-shrink-0">
                            {getItemIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" title={item.title}>
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{item.type}</p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No items in this module</p>
                  )}
                </CardContent>
              </Card>
              )
            })}
          </div>
        )}
      </div>
      {selectedItems.size > 0 && (
        <div className="p-4 border-t bg-background">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </p>
            <Button onClick={handleContinue}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-3rem)] w-full px-4 py-6">
      <div className="max-w-7xl mx-auto w-full h-[calc(100vh-6rem)]">
        {selectedCourse ? (
          <ResizableSplitPane
            defaultSplit={40}
            minLeft={30}
            maxLeft={60}
            minRight={40}
            maxRight={70}
            className="h-full"
            left={renderCoursesList()}
            right={renderModulesList()}
          />
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Study Roadmap</h1>
              <p className="text-muted-foreground">View and manage all your Canvas courses</p>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search courses by name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading
                  </>
                ) : (
                  'Search'
                )}
              </Button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Loading courses...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="text-destructive">{error}</div>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => loadCourses(search, enrollmentState)}
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Courses Grid */}
            {!loading && !error && (
              <>
                {filteredCourses.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No courses found</p>
                        <p className="text-sm">
                          {search
                            ? 'Try adjusting your search or filter criteria'
                            : 'No courses available. Make sure your Canvas connection is configured.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCourses.map((course) => {
                      const status = course.workflow_state
                      const isActive = status === 'available'
                      const isCompleted = status === 'completed'

                      return (
                        <Card
                          key={course.id}
                          className="transition-all hover:shadow-lg bg-background hover:bg-accent/5 h-full cursor-pointer"
                          onClick={() => handleCourseClick(course)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0 space-y-1">
                                <h4 className="text-sm font-semibold leading-tight line-clamp-2" title={course.name}>
                                  {course.name}
                                </h4>
                                <p className="text-xs text-muted-foreground font-mono truncate" title={course.course_code}>
                                  {course.course_code}
                                </p>
                              </div>
                              <Badge
                                variant={isActive ? 'default' : isCompleted ? 'secondary' : 'outline'}
                                className={`text-[10px] px-2 py-0.5 h-fit shrink-0 capitalize ${
                                  isActive
                                    ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700'
                                    : isCompleted
                                      ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
                                      : ''
                                }`}
                              >
                                {status}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-1.5 pt-3 border-t border-border/50">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span className="font-mono">ID: {course.id}</span>
                              </div>
                              {course.start_at && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>
                                    Started: {new Date(course.start_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                              )}
                              {course.end_at && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>
                                    Ends: {new Date(course.end_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
