'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { CanvasModule } from '@/lib/canvas-api'
// removed Next.js Link to avoid nested anchor hydration issues
import { Card } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, FileText, Link as LinkIcon, CheckSquare, MessageSquare, File } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function QuizCourseModulesPage() {
  const params = useParams<{ courseId: string }>()
  const router = useRouter()
  const courseId = Number(params?.courseId)
  const [modules, setModules] = useState<CanvasModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openModules, setOpenModules] = useState<Record<number, boolean>>({})

  const loadModules = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('[DEBUG] Fetching modules (server API)', { courseId })
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

  const toggleModule = (id: number) => {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getItemIcon = (type: string) => {
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

  return (
    <div className="min-h-[calc(100vh-3rem)] w-full px-4 py-4">
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Modules</h1>
          <p className="text-sm text-muted-foreground">Course ID: {courseId}</p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading modules…</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : modules.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No modules found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <div
                key={module.id}
                className="block"
                onClick={(e) => { e.preventDefault(); console.log('[DEBUG] Navigate to module', { courseId, moduleId: module.id }); router.push(`/protected/quiz/${courseId}/module/${module.id}`) }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { console.log('[DEBUG] Navigate to module (keyboard)', { courseId, moduleId: module.id }); router.push(`/protected/quiz/${courseId}/module/${module.id}`) } }}
              >
                <Card 
                  className={cn(
                    "flex flex-col transition-all hover:shadow-md",
                    "bg-background hover:bg-accent/5"
                  )}
                >
                  <Collapsible
                    open={!!openModules[module.id]}
                    onOpenChange={() => toggleModule(module.id)}
                    className="w-full flex flex-col h-full"
                  >
                    <div 
                      className="flex items-start justify-between p-3 hover:bg-muted/50 gap-2 border-b border-border/50 min-h-[60px]"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-sm font-semibold leading-tight line-clamp-2 whitespace-normal" title={module.name}>
                          {module.name}
                        </h4>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{module.items?.length || 0} items</Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-6 h-6 p-0 shrink-0"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleModule(module.id) }}
                      >
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", openModules[module.id] ? "transform rotate-180" : "")} />
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </div>
                    <CollapsibleContent className="flex-1 bg-muted/20">
                      <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
                        {module.items && module.items.length > 0 ? (
                          module.items.map((item) => (
                            <a
                              key={item.id}
                              href={item.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-2 p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-xs group transition-colors"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(item.html_url, '_blank') }}
                            >
                              <span className="mt-0.5 flex-shrink-0">{getItemIcon(item.type)}</span>
                              <span className="flex-1 line-clamp-2 whitespace-normal font-medium text-muted-foreground group-hover:text-foreground leading-tight" title={item.title}>
                                {item.title}
                              </span>
                            </a>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground p-2 italic">Empty module</div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
