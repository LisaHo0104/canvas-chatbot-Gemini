'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SaveArtifactDialog } from '@/components/artifacts/SaveArtifactDialog'
import { getModeBadgeColors, getModeColors } from '@/lib/mode-colors'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { FileText, ListChecks, Link as LinkIcon, StickyNote, Target, Gauge, Clock, CalendarDays, PlayCircle, ClipboardList, CheckCircle2 } from 'lucide-react'
import { SummarySection } from './SummarySection'
import { EmptyState } from './EmptyState'
import { isValidSection, normalizeCriteria } from '@/lib/summary/validation'
import { trackSummaryEvent } from '@/lib/analytics/summary'

type Resource = { title?: string; url: string; type?: 'pdf' | 'video' | 'website' | 'page' | 'file'; description?: string; tags?: string[] }
type Section = { title: string; bullets?: string[]; paragraphs?: string[] }
type ChecklistItem = { text: string; priority?: 'high' | 'medium' | 'low'; dueDate?: string; done?: boolean }
type ActivityItem = { title: string; description?: string; successCriteria?: string[]; timeEstimate?: string; prerequisites?: string[]; ctaLabel?: string }
type AssessmentItem = { type?: 'assignment' | 'quiz' | 'project'; title: string; description?: string; successCriteria?: string[]; dueDate?: string; weight?: string; ctaLabel?: string }

export type SummaryPage = {
  id?: string
  title: string
  keyConcepts?: string[]
  successCriteria?: string[]
  sections: Section[]
  activities?: ActivityItem[]
  assessments?: AssessmentItem[]
  checklist?: ChecklistItem[]
  resources?: Resource[]
}

export type SummaryNote = {
  title: string
  subtitle?: string
  keyConcepts?: string[]
  meta?: { course?: string; module?: string; author?: string; date?: string }
  progress?: number
  successCriteria?: string[]
  sections?: Section[]
  pages?: SummaryPage[]
  activities?: ActivityItem[]
  assessments?: AssessmentItem[]
  checklist?: ChecklistItem[]
  resources?: Resource[]
}

function FloatingToolbar({ bounds, onAction, loading }: { bounds: DOMRect | null; onAction: (action: 'regenerate' | 'expand' | 'simplify' | 'rephrase') => void; loading: boolean }) {
  if (!bounds) return null
  const style = { position: 'fixed' as const, top: Math.max(bounds.top - 44, 8), left: Math.min(bounds.left + bounds.width / 2, window.innerWidth - 8), transform: 'translateX(-50%)', zIndex: 50 }
  return (
    <div style={style} className="rounded-full border bg-background shadow px-2 py-1 flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={() => onAction('regenerate')} disabled={loading}>Regenerate</Button>
      <Separator orientation="vertical" className="h-4" />
      <Button variant="ghost" size="sm" onClick={() => onAction('expand')} disabled={loading}>Expand</Button>
      <Button variant="ghost" size="sm" onClick={() => onAction('simplify')} disabled={loading}>Simplify</Button>
      <Button variant="ghost" size="sm" onClick={() => onAction('rephrase')} disabled={loading}>Rephrase</Button>
    </div>
  )
}

function ComparisonModal({ open, original, updated, onAccept, onReject, onTryAgain, loading, onOpenChange }: { open: boolean; original: string; updated: string | null; onAccept: () => void; onReject: () => void; onTryAgain: () => void; loading: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>AI Edit Preview</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-3 space-y-2">
            <Badge variant="outline">Original</Badge>
            <ScrollArea className="max-h-64 rounded border bg-muted/50 p-3">
              <div className="text-sm whitespace-pre-wrap">{original}</div>
            </ScrollArea>
          </Card>
          <Card className="p-3 space-y-2">
            <Badge variant="outline">AI Version</Badge>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Spinner />
              </div>
            ) : (
              <ScrollArea className="max-h-64 rounded border bg-muted/50 p-3">
                <div className="text-sm whitespace-pre-wrap">{updated || ''}</div>
              </ScrollArea>
            )}
          </Card>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onReject}>Reject</Button>
          <Button variant="secondary" onClick={onTryAgain} disabled={loading}>Try again</Button>
          <Button onClick={onAccept} disabled={loading || !updated}>Accept</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SummaryUI({ data, onViewFull, onSaveClick }: { data: SummaryNote; onViewFull?: () => void; onSaveClick?: () => void }) {
  const colors = getModeColors('summary')
  const [toolbarBounds, setToolbarBounds] = useState<DOMRect | null>(null)
  const [selectedText, setSelectedText] = useState<string>('')
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [updatedText, setUpdatedText] = useState<string | null>(null)
  const selectionRootRef = useRef<HTMLDivElement>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [activePageId, setActivePageId] = useState<string>('page-0')
  const pages: SummaryPage[] = useMemo(() => {
    if (Array.isArray(data.pages) && data.pages.length > 0) return data.pages
    return [{ id: 'page-0', title: data.title, sections: data.sections || [], checklist: data.checklist, resources: data.resources, keyConcepts: data.keyConcepts, successCriteria: data.successCriteria }]
  }, [data])
  const activePage = useMemo(() => pages.find(p => (p.id || '') === activePageId) || pages[0], [pages, activePageId])
  const [notes, setNotes] = useState<Array<{ id: string; text: string; createdAt: string }>>([])
  const [noteText, setNoteText] = useState('')
  const [noteQuery, setNoteQuery] = useState('')
  const filteredNotes = useMemo(() => notes.filter(n => n.text.toLowerCase().includes(noteQuery.toLowerCase())), [notes, noteQuery])
  const [checklistState, setChecklistState] = useState<Record<number, boolean>>({})
  const checklistItems = (activePage.checklist || []).filter(i => typeof i?.text === 'string' && i.text.trim().length > 0)
  const completed = Object.values(checklistState).filter(Boolean).length
  const total = checklistItems.length
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : (typeof data.progress === 'number' ? data.progress : 0)

  useEffect(() => {
    console.log('[DEBUG] SummaryUI render', { pages: pages.length })
    const handler = () => {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const text = sel.toString()
        if (text && selectionRootRef.current && selectionRootRef.current.contains(sel.anchorNode as Node)) {
          const rects = sel.getRangeAt(0).getBoundingClientRect()
          setSelectedText(text)
          setToolbarBounds(rects)
          return
        }
      }
      setToolbarBounds(null)
      setSelectedText('')
    }
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [])

  const handleEdit = async (action: 'regenerate' | 'expand' | 'simplify' | 'rephrase') => {
    if (!selectedText) return
    setComparisonOpen(true)
    setLoadingEdit(true)
    setUpdatedText(null)
    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedText, action }),
      })
      if (res.ok) {
        const d = await res.json()
        setUpdatedText(String(d.text || ''))
      }
    } catch {}
    finally {
      setLoadingEdit(false)
    }
  }

  const derivedKeyConcepts = useMemo(() => {
    const items: string[] = []
    const add = (s?: string) => {
      const v = typeof s === 'string' ? s.trim() : ''
      if (v) items.push(v)
    }
    ;(activePage.sections || []).forEach(sec => {
      add(sec.title)
      ;(sec.bullets || []).forEach(b => add(b))
    })
    ;(activePage.successCriteria || data.successCriteria || []).forEach(s => add(s))
    ;(activePage.resources || []).forEach(r => {
      add(r.title)
      ;(r.tags || []).forEach(t => add(t))
      add(r.type)
    })
    const seen = new Set<string>()
    const unique: string[] = []
    for (const it of items) {
      const key = it.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(it.length > 60 ? it.slice(0, 60) + '…' : it)
      }
      if (unique.length >= 8) break
    }
    return unique
  }, [activePage, data.successCriteria])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border shadow-sm overflow-hidden">
        <div className={`px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-white dark:from-amber-950 dark:to-gray-900 ${colors.text}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 border ${getModeBadgeColors('summary')}`}>Summary</Badge>
              <span className="font-semibold text-base">{data.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onViewFull?.()}>View Full</Button>
              <Button size="sm" onClick={() => onSaveClick ? onSaveClick() : setSaveOpen(true)}>Save</Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {data.meta?.estimatedTime && (
              <div className="flex items-center gap-1"><Clock className="size-3" />{data.meta.estimatedTime}</div>
            )}
            {data.meta?.date && (
              <div className="flex items-center gap-1"><CalendarDays className="size-3" />Due {data.meta.date}</div>
            )}
            {data.meta?.difficulty && (
              <div className="flex items-center gap-1"><Gauge className="size-3" />{data.meta.difficulty}</div>
            )}
          </div>
        </div>
      </div>

      {pages.length > 1 && (
        <Tabs value={activePageId} onValueChange={(v) => { setActivePageId(v); console.log('[DEBUG] SummaryUI page change', { pageId: v }); trackSummaryEvent('page_change', { pageId: v }) }} className="w-full" aria-label="Summary pages">
          <TabsList className="sticky top-0 z-10 backdrop-blur bg-background/80 rounded-md shadow-sm flex flex-wrap gap-1 p-1">
            {pages.map((p, idx) => (
              <TabsTrigger key={p.id || `page-${idx}`} value={p.id || `page-${idx}`} className="data-[state=active]:shadow-sm">{p.title}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div ref={selectionRootRef} className="space-y-3">
        <Tabs defaultValue="overview" className="w-full" aria-label="Summary sections">
          <TabsList className="sticky top-0 z-10 backdrop-blur bg-background/80 rounded-md shadow-sm flex flex-wrap gap-1 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:shadow-sm flex items-center gap-1" aria-label="Overview tab"><Gauge className="size-4" />Overview</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:shadow-sm flex items-center gap-1" aria-label="Content tab"><FileText className="size-4" />Content</TabsTrigger>
            <TabsTrigger value="activities" className="data-[state=active]:shadow-sm flex items-center gap-1"><PlayCircle className="size-4" />Activities</TabsTrigger>
            <TabsTrigger value="assessment" className="data-[state=active]:shadow-sm flex items-center gap-1"><ClipboardList className="size-4" />Assessment</TabsTrigger>
            <TabsTrigger value="checklist" className="data-[state=active]:shadow-sm flex items-center gap-1"><ListChecks className="size-4" />Checklist</TabsTrigger>
            <TabsTrigger value="resources" className="data-[state=active]:shadow-sm flex items-center gap-1"><LinkIcon className="size-4" />Resources</TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:shadow-sm flex items-center gap-1"><StickyNote className="size-4" />Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="p-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                {(data.subtitle && data.subtitle.trim())
                  ? data.subtitle
                  : (() => {
                      const firstParagraph =
                        (activePage.sections?.[0]?.paragraphs?.[0] as string) ||
                        (activePage.sections?.[0]?.title as string) ||
                        ''
                      const brief = String(firstParagraph || '').trim().slice(0, 200)
                      return brief || 'This summary highlights the essential outcomes you should achieve after completing the content.'
                    })()}
              </div>
              {(() => {
                const explicit = (activePage.successCriteria || data.successCriteria || []).filter(s => typeof s === 'string' && s.trim().length > 0)
                let criteria = explicit
                if (criteria.length === 0) {
                  const concepts = derivedKeyConcepts.slice(0, 3)
                  const firstTitle = (activePage.sections?.[0]?.title as string) || ''
                  const firstBullets = Array.isArray(activePage.sections?.[0]?.bullets) ? activePage.sections![0]!.bullets!.slice(0, 2) : []
                  const generated: string[] = []
                  concepts.forEach((c) => {
                    generated.push(`You can explain ${c} in simple terms`)
                  })
                  if (firstTitle) {
                    generated.push(`You are able to summarize "${firstTitle}" in 2–3 sentences`)
                  }
                  firstBullets.forEach((b) => {
                    const clean = String(b || '').replace(/^[-•]\s*/, '')
                    if (clean.trim()) generated.push(`You can apply ${clean}`)
                  })
                  criteria = generated.slice(0, 5)
                  if (criteria.length > 0) {
                    trackSummaryEvent('criteria_generated', { count: criteria.length })
                    console.log('[DEBUG] Generated fallback success criteria', criteria)
                  }
                }
                return criteria.length > 0 ? (
                <Card className="p-3">
                  <div className="text-sm font-semibold mb-2">Success Criteria</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {criteria.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </Card>
                ) : (
                <Card className="p-3">
                  <div className="text-sm font-semibold mb-2">Success Criteria</div>
                  <div className="text-xs text-muted-foreground">No success criteria were provided. Ask the assistant to outline outcomes (e.g., “You can…” statements).</div>
                </Card>
                )
              })()}
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card className="p-4 space-y-2">
              <Accordion type="multiple" className="w-full">
                {(activePage.sections || [])
                  .filter(sec => typeof sec?.title === 'string' && sec.title.trim().length > 0 || (Array.isArray(sec?.bullets) && sec.bullets.length > 0) || (Array.isArray(sec?.paragraphs) && sec.paragraphs.length > 0))
                  .map((sec, i) => (
                  <AccordionItem key={i} value={`sec-${i}`}>
                    <AccordionTrigger className="text-sm font-semibold hover:bg-muted px-2 rounded">{sec.title}</AccordionTrigger>
                    <AccordionContent>
                      <SummarySection
                        title={sec.title}
                        description={
                          Array.isArray(sec.paragraphs) && sec.paragraphs.length > 0
                            ? String(sec.paragraphs[0]).slice(0, 160)
                            : undefined
                        }
                      >
                        <div className="space-y-2">
                          {sec.bullets && sec.bullets.length > 0 && (() => {
                            const labeled = sec.bullets.map((b) => {
                              const m = String(b || '').match(/^(Why it matters|Key takeaway|Remember|What you need to remember|Next step|Critical concept|Real-world example|This week's focus):\s*(.+)$/i)
                              return m ? { label: m[1], text: m[2] } : null
                            }).filter(Boolean) as Array<{label:string;text:string}>
                            if (labeled.length > 0) {
                              return (
                                <div className="space-y-2">
                                  {labeled.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2">
                                      <div className="col-span-4 text-xs font-semibold">{item.label}</div>
                                      <div className="col-span-8 text-sm">{item.text}</div>
                                    </div>
                                  ))}
                                </div>
                              )
                            }
                            return (
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {sec.bullets.map((b, bi) => <li key={bi} className="whitespace-pre-wrap">{b}</li>)}
                              </ul>
                            )
                          })()}
                          {sec.paragraphs && sec.paragraphs.length > 0 && (
                            <div className="space-y-2">
                              {sec.paragraphs.map((p, pi) => {
                                const isCode = p.trim().startsWith('```')
                                return isCode ? (
                                  <pre key={pi} className="text-xs font-mono whitespace-pre-wrap rounded-lg border bg-muted/50 p-3">{p.replace(/^```[\s\S]*?\n/, '').replace(/```$/, '')}</pre>
                                ) : (
                                  <p key={pi} className="text-sm whitespace-pre-wrap">{p}</p>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </SummarySection>
                    </AccordionContent>
                  </AccordionItem>
                ))}
                {((activePage.sections || []).length === 0) && (
                  <EmptyState
                    title="No content sections"
                    reason="The AI tool did not return structured content for this tab."
                    nextSteps={['Try “Expand” on a selected paragraph', 'Regenerate the summary', 'Check Resources or Notes for context']}
                    alternatives={['Switch to Activities for hands-on practice', 'Open Assessment to view grading expectations']}
                  />
                )}
              </Accordion>
            </Card>
          </TabsContent>

          <TabsContent value="activities">
            <Card className="p-4 space-y-3">
              {((activePage.activities || data.activities || []) as ActivityItem[]).filter(a => a?.title).map((a, i) => (
                <SummarySection
                  key={i}
                  title={a.title}
                  description={a.description}
                  contextInfo={[
                    ...(Array.isArray(a.prerequisites) ? a.prerequisites.map(p => `Prereq: ${p}`) : []),
                    ...(a.timeEstimate ? [a.timeEstimate] : []),
                  ]}
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {a.timeEstimate && <span className="flex items-center gap-1"><Clock className="size-3" />{a.timeEstimate}</span>}
                    {Array.isArray(a.prerequisites) && a.prerequisites.length > 0 && <span>Prereqs: {a.prerequisites.join(', ')}</span>}
                  </div>
                  <div className="pt-1">
                    <Button aria-label={`Start activity: ${a.title}`} size="sm" variant="outline" onClick={() => { console.log('[DEBUG] Activity CTA', a.title); trackSummaryEvent('activity_cta', { title: a.title }) }}>{a.ctaLabel || 'Start Practice'}</Button>
                  </div>
                </SummarySection>
              ))}
              {(((activePage.activities || data.activities || []) as ActivityItem[]).filter(a => a?.title).length === 0) && (
                <EmptyState
                  title="No activities added"
                  reason="No practice items were returned for this summary."
                  nextSteps={['Use “Start Practice” on related modules', 'Ask the assistant to generate a practice task']}
                  alternatives={['Review Content tab first', 'Check Resources for examples']}
                />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="assessment">
            <Card className="p-4 space-y-3">
              {((activePage.assessments || data.assessments || []) as AssessmentItem[]).filter(a => a?.title).map((a, i) => (
                <SummarySection
                  key={i}
                  title={a.title}
                  description={a.description}
                  contextInfo={[
                    ...(a.type ? [`Type: ${a.type}`] : []),
                    ...(a.weight ? [`Weight: ${a.weight}`] : []),
                    ...(a.dueDate ? [`Due: ${a.dueDate}`] : []),
                  ]}
                >
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {a.type && <Badge variant="outline" className="text-[10px] capitalize">{a.type}</Badge>}
                    {a.weight && <span>Weight: {a.weight}</span>}
                    {a.dueDate && <span className="flex items-center gap-1"><CalendarDays className="size-3" />Due {a.dueDate}</span>}
                  </div>
                  <div className="pt-1">
                    <Button aria-label={`Open rubric: ${a.title}`} size="sm" onClick={() => { console.log('[DEBUG] Assessment CTA', a.title); trackSummaryEvent('assessment_cta', { title: a.title }) }}>{a.ctaLabel || 'View Rubric'}</Button>
                  </div>
                </SummarySection>
              ))}
              {(((activePage.assessments || data.assessments || []) as AssessmentItem[]).filter(a => a?.title).length === 0) && (
                <EmptyState
                  title="No assessments added"
                  reason="The assistant did not include assessment details."
                  nextSteps={['Ask for assessment expectations', 'Open the rubric from your LMS']}
                  alternatives={['Practice under Activities', 'Review Content and Resources first']}
                />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="checklist">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Checklist</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{completed}/{total} done</span>
                  <Progress value={progressPct} className="w-24" />
                </div>
              </div>
              <div className="space-y-2">
                {checklistItems.map((item, idx) => {
                  const color =
                    item.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800' :
                    item.priority === 'medium' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-800' :
                    item.priority === 'low' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-800' :
                    'bg-muted text-muted-foreground border-border'
                  return (
                    <div key={idx} className="group flex items-center gap-2 rounded border px-2 py-1 hover:bg-muted transition">
                      <Checkbox
                        checked={!!checklistState[idx]}
                        onChange={(e) => {
                          const v = (e.target as HTMLInputElement).checked
                          setChecklistState(s => ({ ...s, [idx]: !!v }))
                        }}
                      />
                      <div className="flex-1 text-sm">{item.text}</div>
                      {item.priority && <Badge variant="outline" className={`border ${color}`}>{item.priority}</Badge>}
                      {item.dueDate && <span className="text-xs text-muted-foreground">Due: {item.dueDate}</span>}
                    </div>
                  )
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card className="p-4 space-y-4">
              <div className="text-sm font-semibold">Resources</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(activePage.resources || []).filter(r => typeof r?.url === 'string' && r.url.trim().length > 0).map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer" className="rounded-lg border p-3 hover:shadow-sm transition block">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {r.type === 'pdf' ? <FileText className="size-4" /> : r.type === 'video' ? <Gauge className="size-4" /> : <LinkIcon className="size-4" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-semibold">{r.title || r.url}</div>
                        {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                        <div className="text-[11px] text-blue-600 dark:text-blue-300 break-all">{r.url}</div>
                        <div className="flex flex-wrap gap-1">
                          {r.type && <Badge variant="outline" className="text-[10px]">{r.type}</Badge>}
                          {(r.tags || []).map((t, ti) => <Badge key={ti} variant="outline" className="text-[10px]">{t}</Badge>)}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
                {((activePage.resources || []).filter(r => typeof r?.url === 'string' && r.url.trim().length > 0).length === 0) && (
                  <div className="text-xs text-muted-foreground">No resources added</div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Notes</div>
                <Input value={noteQuery} onChange={(e) => setNoteQuery(e.target.value)} placeholder="Search notes..." className="w-48" />
              </div>
              <div className="space-y-2">
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write a note..." rows={3} />
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => {
                    if (!noteText.trim()) return
                    const id = String(Date.now())
                    const createdAt = new Date().toLocaleString()
                    setNotes(n => [{ id, text: noteText.trim(), createdAt }, ...n])
                    setNoteText('')
                  }}>Add Note</Button>
                </div>
              </div>
              <div className="space-y-2">
                {filteredNotes.map(n => (
                  <Card key={n.id} className="p-3 space-y-1 hover:bg-muted/60 transition">
                    <div className="text-xs text-muted-foreground">{n.createdAt}</div>
                    <div className="text-sm whitespace-pre-wrap">{n.text}</div>
                  </Card>
                ))}
                {filteredNotes.length === 0 && <div className="text-xs text-muted-foreground">No notes yet</div>}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <FloatingToolbar bounds={toolbarBounds} onAction={handleEdit} loading={loadingEdit} />
      <ComparisonModal
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        original={selectedText}
        updated={updatedText}
        loading={loadingEdit}
        onAccept={() => {
          if (!updatedText) return
          const sel = window.getSelection()
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0)
            const temp = document.createElement('span')
            temp.textContent = updatedText
            range.deleteContents()
            range.insertNode(temp)
            setComparisonOpen(false)
            setToolbarBounds(null)
            setSelectedText('')
            setUpdatedText(null)
          }
        }}
        onReject={() => {
          setComparisonOpen(false)
          setUpdatedText(null)
        }}
        onTryAgain={() => {
          if (!selectedText) return
          setUpdatedText(null)
          setLoadingEdit(true)
          fetch('/api/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: selectedText, action: 'regenerate' }),
          })
            .then(async (res) => {
              const d = await res.json()
              setUpdatedText(String(d.text || ''))
            })
            .finally(() => setLoadingEdit(false))
        }}
      />
      <SaveArtifactDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        artifactType="summary_note"
        artifactData={data}
        onSave={() => {}}
      />
    </div>
  )
}
