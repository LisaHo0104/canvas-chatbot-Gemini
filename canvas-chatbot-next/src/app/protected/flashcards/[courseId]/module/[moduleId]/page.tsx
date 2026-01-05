'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface Flashcard {
  word: string
  definition: string
}

export default function FlashcardsPage() {
  const params = useParams<{ courseId: string; moduleId: string }>()
  const searchParams = useSearchParams()
  const courseId = Number(params?.courseId)
  const moduleId = Number(params?.moduleId)
  const itemIdParam = searchParams.get('itemId')
  const itemId = itemIdParam ? Number(itemIdParam) : null

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const pointerStartX = useRef<number | null>(null)
  const [remembered, setRemembered] = useState<Flashcard[]>([])
  const [notRemembered, setNotRemembered] = useState<Flashcard[]>([])
  const [finished, setFinished] = useState(false)

  const [newWord, setNewWord] = useState('')
  const [newDef, setNewDef] = useState('')
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (!Number.isFinite(courseId) || !Number.isFinite(moduleId)) {
      setError('Invalid course/module')
      return
    }
  }, [courseId, moduleId])

  useEffect(() => {
    const loadItemKeywords = async () => {
      if (!itemId || Number.isNaN(itemId)) return
      try {
        setLoading(true)
        setError(null)
        console.debug('[DEBUG] Loading flashcard keywords (server API)', { courseId, moduleId, itemId })
        const qs = new URLSearchParams()
        qs.set('courseId', String(courseId))
        qs.set('moduleId', String(moduleId))
        qs.set('itemId', String(itemId))
        qs.set('count', '20')
        const res = await fetch(`/api/flashcards/item-keywords?${qs.toString()}`, { credentials: 'include' })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setError(j?.error || `Failed to load flashcard keywords (${res.status})`)
          return
        }
        const j = await res.json()
        const arr: Flashcard[] = Array.isArray(j?.cards) ? j.cards : []
        setCards(arr.length > 0 ? arr : [])
        const sum = typeof j?.summary === 'string' ? j.summary : ''
        setSummary(sum)
        setCurrent(0)
        setFlipped(false)
        setDragX(0)
        setIsDragging(false)
        setRemembered([])
        setNotRemembered([])
        setFinished(false)
        console.debug('[DEBUG] Flashcard keywords loaded', { count: arr.length, hasSummary: !!sum })
      } catch (e: any) {
        console.error('Failed to load flashcard keywords', e)
        setError('Failed to load flashcard keywords')
      } finally {
        setLoading(false)
      }
    }
    loadItemKeywords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, moduleId])

  useEffect(() => {
    const loadModuleKeywords = async () => {
      if (itemId && !Number.isNaN(itemId)) return
      try {
        setLoading(true)
        setError(null)
        console.debug('[DEBUG] Loading module flashcard keywords (server API)', { courseId, moduleId })
        const qs = new URLSearchParams()
        qs.set('courseId', String(courseId))
        qs.set('moduleId', String(moduleId))
        qs.set('count', '30')
        const res = await fetch(`/api/flashcards/module-keywords?${qs.toString()}`, { credentials: 'include' })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setError(j?.error || `Failed to load module flashcard keywords (${res.status})`)
          return
        }
        const j = await res.json()
        const arr: Flashcard[] = Array.isArray(j?.cards) ? j.cards : []
        setCards(arr.length > 0 ? arr : [])
        const sum = typeof j?.summary === 'string' ? j.summary : ''
        setSummary(sum)
        setCurrent(0)
        setFlipped(false)
        setDragX(0)
        setIsDragging(false)
        setRemembered([])
        setNotRemembered([])
        setFinished(false)
        console.debug('[DEBUG] Module flashcard keywords loaded', { count: arr.length, hasSummary: !!sum })
      } catch (e: any) {
        console.error('Failed to load module flashcard keywords', e)
        setError('Failed to load module flashcard keywords')
      } finally {
        setLoading(false)
      }
    }
    loadModuleKeywords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, moduleId, itemId])

  const total = cards.length
  const remaining = Math.max(total - (remembered.length + notRemembered.length), 0)

  const mark = (type: 'remembered' | 'not') => {
    const card = cards[current]
    if (!card) return
    if (type === 'remembered') {
      console.debug('[DEBUG] Card marked remembered', { index: current, word: card.word })
      setRemembered(prev => [...prev, card])
    } else {
      console.debug('[DEBUG] Card marked not remembered', { index: current, word: card.word })
      setNotRemembered(prev => [...prev, card])
    }
    const nextIdx = current + 1
    if (nextIdx >= cards.length) {
      console.debug('[DEBUG] Flashcards finished', { remembered: remembered.length + (type === 'remembered' ? 1 : 0), notRemembered: notRemembered.length + (type === 'not' ? 1 : 0), total })
      setFinished(true)
    } else {
      setCurrent(nextIdx)
      setFlipped(false)
      setDragX(0)
    }
  }

  const onCardClick = () => {
    if (finished || loading) return
    setFlipped(f => !f)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (finished || loading) return
    pointerStartX.current = e.clientX
    setIsDragging(true)
    setDragX(0)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || pointerStartX.current == null) return
    const dx = e.clientX - pointerStartX.current
    setDragX(dx)
  }
  const onPointerUp = () => {
    if (!isDragging) return
    const threshold = 80
    if (dragX > threshold) {
      mark('remembered')
    } else if (dragX < -threshold) {
      mark('not')
    } else {
      setDragX(0)
    }
    setIsDragging(false)
    pointerStartX.current = null
  }
  const onPointerLeave = () => {
    if (!isDragging) return
    setDragX(0)
    setIsDragging(false)
    pointerStartX.current = null
  }

  const addCard = () => {
    const w = newWord.trim()
    const d = newDef.trim()
    if (!w || !d) return
    console.debug('[DEBUG] Add flashcard', { word: w })
    setCards(prev => [...prev, { word: w, definition: d }])
    setNewWord('')
    setNewDef('')
    if (finished) setFinished(false)
  }

  const resetDeck = () => {
    console.debug('[DEBUG] Reset deck')
    setCurrent(0)
    setFlipped(false)
    setDragX(0)
    setIsDragging(false)
    setRemembered([])
    setNotRemembered([])
    setFinished(false)
  }

  const card = cards[current]

  return (
    <div className="min-h-[calc(100vh-3rem)] w-full px-4 py-4">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Flashcards</h1>
          <p className="text-sm text-muted-foreground">Course ID: {courseId} · Module ID: {moduleId}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary">Total: {total}</Badge>
            <Badge variant="secondary">Remaining: {remaining}</Badge>
            <Badge variant="secondary">Remembered: {remembered.length}</Badge>
            <Badge variant="secondary">Not remembered: {notRemembered.length}</Badge>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="mr-2" />
            <span className="text-sm text-muted-foreground">Loading flashcards…</span>
          </div>
        )}

        {!loading && error && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia />
              <EmptyTitle>Failed to load flashcards</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => { setError(null) }}>Dismiss</Button>
            </EmptyContent>
          </Empty>
        )}

        {!loading && !error && !finished && card && (
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="flex-1 min-w-0">
              <Card className="bg-background w-full overflow-visible">
                <CardContent className="p-6">
                  <div
                    className="mx-auto"
                    style={{ maxWidth: 560 }}
                  >
                    <div
                      className="relative w-full aspect-[3/4] rounded-xl border bg-background cursor-pointer select-none"
                      onClick={onCardClick}
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerLeave={onPointerLeave}
                      style={{
                        perspective: '1000px',
                        transform: `translateX(${dragX}px)`,
                        transition: isDragging ? 'none' : 'transform 200ms ease'
                      }}
                      aria-label="Flashcard"
                    >
                      <div
                        className={cn(
                          'absolute inset-0 rounded-xl backface-hidden flex items-center justify-center p-6 text-center',
                          'text-2xl font-semibold'
                        )}
                        style={{
                          transformStyle: 'preserve-3d',
                          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                          transition: 'transform 300ms ease'
                        }}
                      >
                        {!flipped ? (
                          <span>{card.word}</span>
                        ) : (
                          <span className="text-base font-medium">{card.definition}</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <Button size="lg" variant="outline" onClick={() => mark('not')}>
                        Not remembered
                      </Button>
                      <Button size="lg" onClick={() => mark('remembered')}>
                        Remembered
                      </Button>
                      <Separator className="mx-1 w-px h-6" />
                      <Button size="lg" variant="ghost" onClick={() => setFlipped(f => !f)}>
                        Flip
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:w-[320px] w-full">
              <Card className="bg-background w-full h-full">
                <CardContent className="p-6 space-y-3">
                  <h3 className="text-lg font-semibold">Add Card</h3>
                  <div className="space-y-2">
                    <input
                      className="w-full p-2 rounded-md border bg-background"
                      placeholder="Word"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                    />
                    <textarea
                      className="w-full p-2 rounded-md border bg-background min-h-24"
                      placeholder="Definition"
                      value={newDef}
                      onChange={(e) => setNewDef(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={addCard} disabled={!newWord.trim() || !newDef.trim()}>Add</Button>
                      <Button size="sm" variant="outline" onClick={resetDeck}>Reset deck</Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Progress</div>
                    <div className="text-xs text-muted-foreground">
                      {remembered.length + notRemembered.length}/{total} reviewed
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!loading && !error && finished && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <Card className="bg-background">
              <CardContent className="p-6 space-y-2">
                <h3 className="text-lg font-semibold">Summary</h3>
                <div className="text-sm">
                  Remembered: <span className="font-medium">{remembered.length}</span>
                </div>
                <div className="text-sm">
                  Not remembered: <span className="font-medium">{notRemembered.length}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="lg" onClick={resetDeck}>Review again</Button>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-background md:col-span-1">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-lg font-semibold">Remembered Words</h3>
                {remembered.length === 0 ? (
                  <div className="text-sm text-muted-foreground">None</div>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {remembered.map((c, idx) => (
                      <li key={idx} className="text-sm">
                        <span className="font-medium">{c.word}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card className="bg-background md:col-span-1">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-lg font-semibold">Not Remembered Words</h3>
                {notRemembered.length === 0 ? (
                  <div className="text-sm text-muted-foreground">None</div>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {notRemembered.map((c, idx) => (
                      <li key={idx} className="text-sm">
                        <span className="font-medium">{c.word}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
