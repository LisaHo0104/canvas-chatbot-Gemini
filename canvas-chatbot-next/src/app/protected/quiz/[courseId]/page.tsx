'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { CanvasModule } from '@/lib/canvas-api'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, FileText, Link as LinkIcon, CheckSquare, MessageSquare, File } from 'lucide-react'

export default function CourseModulesPage() {
  const params = useParams<{ courseId: string }>()
  const router = useRouter()
  const courseId = Number(params?.courseId)
  const [modules, setModules] = useState<CanvasModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openModules, setOpenModules] = useState<Record<number, boolean>>({})
  const [selectedItemByModule, setSelectedItemByModule] = useState<Record<number, number | null>>({})

  function getItemIcon(type: string) {
    switch (type) {
      case 'Page': return <FileText className="w-3 h-3 text-blue-500" />
      case 'Assignment': return <CheckSquare className="w-3 h-3 text-green-500" />
      case 'Quiz': return <CheckSquare className="w-3 h-3 text-orange-500" />
      case 'Discussion': return <MessageSquare className="w-3 h-3 text-purple-500" />
      case 'File': return <File className="w-3 h-3 text-gray-500" />
      case 'ExternalUrl': return <LinkIcon className="w-3 h-3 text-sky-500" />
      default: return <File className="w-3 h-3" />
    }
  }

  async function loadModules() {
    try {
      setLoading(true)
      setError(null)
      console.debug('[DEBUG] Fetching modules (server API)', { courseId })
      const qs = new URLSearchParams()
      qs.set('courseId', String(courseId))
      qs.set('includeItems', 'true')
      qs.set('includeContentDetails', 'false')
      qs.set('perPage', '50')
      const res = await fetch(`/api/canvas/modules?${qs.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j?.error || `Failed to load modules (${res.status})`)
        setModules([])
        return
      }
      const j = await res.json()
      const data: CanvasModule[] = Array.isArray(j?.modules) ? j.modules : []
      setModules(data)
    } catch (e) {
      console.error('Failed to load modules', e)
      setError('Failed to load modules')
      setModules([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!courseId || Number.isNaN(courseId)) {
      setError('Invalid course')
      setLoading(false)
      return
    }
    loadModules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  function toggleModule(id: number) {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] w-full px-4 py-4">
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Modules</h1>
          <p className="text-sm text-muted-foreground">Course ID: {courseId}</p>
        </div>

        {loading && (
          <div className="text-sm text-muted-foreground">Loading modules…</div>
        )}

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <Card key={module.id} className="transition-all hover:shadow-md bg-background hover:bg-accent/5 h-full rounded-2xl overflow-hidden">
                <Collapsible
                  open={!!openModules[module.id]}
                  onOpenChange={() => toggleModule(module.id)}
                  className="w-full"
                >
                  <CollapsibleTrigger className="w-full flex justify-between text-left">
                    <div className="flex items-start justify-between p-4 w-full">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold leading-tight truncate" title={module.name}>
                          {module.name}
                        </h4>
                        <div className="mt-2">
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-fit shrink-0">
                            {Array.isArray(module.items) ? module.items.length : 0} items
                          </Badge>
                        </div>
                      </div>
                      <span className="inline-flex items-center justify-center size-8 rounded-full bg-muted">
                        <ChevronDown className={`w-4 h-4 transition-transform ${openModules[module.id] ? 'rotate-180' : ''}`} />
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <div className="border-t border-border/50" />
                  <CollapsibleContent>
                    <CardContent className="p-4 space-y-3 text-left">
                      {Array.isArray(module.items) && module.items.length > 0 ? (
                        <>
                          {module.items.map((item) => {
                            const sel = selectedItemByModule[module.id] === item.id
                            const isSelectable = item.type === 'Page'
                            const baseCls = "flex items-center gap-3 py-2 px-2 rounded-md cursor-pointer transition-colors"
                            const cls =
                              baseCls +
                              (sel
                                ? " border border-green-600 bg-green-50"
                                : " hover:bg-muted/40 border border-transparent")
                            return (
                              <div
                                key={item.id}
                                className={cls}
                                onClick={() => {
                                  if (!isSelectable) return
                                  setSelectedItemByModule((prev) => ({
                                    ...prev,
                                    [module.id]:
                                      prev[module.id] === item.id ? null : item.id,
                                  }))
                                  console.debug('[DEBUG] Module item selected', {
                                    courseId,
                                    moduleId: module.id,
                                    itemId: item.id,
                                    type: item.type,
                                  })
                                }}
                              >
                                <span className="flex-shrink-0 text-blue-600">
                                  {getItemIcon(item.type)}
                                </span>
                                <span className="flex-1 truncate text-sm" title={item.title}>
                                  {item.title}
                                </span>
                                {!isSelectable && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                    Not supported
                                  </span>
                                )}
                              </div>
                            )
                          })}
                          <div className="flex items-center gap-2 pt-3 flex-wrap">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                const itemId = selectedItemByModule[module.id]
                                if (!itemId) return
                                console.debug('[DEBUG] Generate item quiz', {
                                  courseId,
                                  moduleId: module.id,
                                  itemId,
                                })
                                router.push(
                                  `/protected/quiz/${courseId}/module/${module.id}?itemId=${itemId}`,
                                )
                              }}
                              disabled={!selectedItemByModule[module.id]}
                            >
                              Generate quiz for selected item
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault()
                                console.debug('[DEBUG] Generate module quiz', {
                                  courseId,
                                  moduleId: module.id,
                                })
                                router.push(`/protected/quiz/${courseId}/module/${module.id}`)
                              }}
                            >
                              Generate quiz for this module
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">Empty module</div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
