'use client'

import { useEffect, useState, useMemo } from 'react'
import type { CanvasCourse } from '@/lib/canvas-api'
import { CourseList } from '@/components/canvas-tools/course-list'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Calendar } from 'lucide-react'

export default function QuizPage() {
  const [courses, setCourses] = useState<CanvasCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const canFetch = true

  const loadCourses = async (term?: string) => {
    try {
      setLoading(true)
      setError(null)
      console.log('[DEBUG] Fetching courses (server API)', { term: term || '' })
      const qs = new URLSearchParams()
      if (term && term.trim()) qs.set('searchTerm', term.trim())
      qs.set('enrollmentState', 'active')
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
    console.log('[DEBUG] QuizPage mounted')
    loadCourses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-[calc(100vh-3rem)] w-full px-4 py-4">
      <div className="max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Quiz</h1>
            <p className="text-sm text-muted-foreground">Your enrolled courses</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses"
              className="w-56"
            />
            <Button onClick={() => loadCourses(search)} aria-label="Search courses">Search</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading courses…</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">No courses found.</div>
            ) : (
              courses.map((course) => (
                <Link key={course.id} href={`/protected/quiz/${course.id}`} className="block">
                  <Card
                    className="transition-all hover:shadow-md bg-background hover:bg-accent/5"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="text-sm font-semibold leading-tight truncate" title={course.name}>
                            {course.name}
                          </h4>
                        <p className="text-xs text-muted-foreground font-mono truncate" title={course.course_code}>
                          {course.course_code}
                        </p>
                      </div>
                      <Badge
                        variant={course.workflow_state === 'available' ? 'default' : 'secondary'}
                        className="text-[10px] px-2 py-0.5 h-fit shrink-0 capitalize"
                      >
                        {course.workflow_state}
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
                          <span>Started: {new Date(course.start_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
