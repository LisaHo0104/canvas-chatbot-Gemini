'use client'

import { useState, useCallback, useRef } from 'react'
import { CheckCircle2, XCircle, Maximize2, Library, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageResponse } from '@/components/ai-elements/message'

export interface FlashcardOutput {
  title: string
  description?: string
  cards: Array<{
    id: string
    term: string
    description: string
  }>
  metadata?: {
    topics?: string[]
    sourcesUsed?: string[]
  }
}

interface FlashcardUIProps {
  data: FlashcardOutput
  messageId?: string
  compact?: boolean
  onViewFull?: () => void
}

const SWIPE_THRESHOLD = 80

function RememberedList({
  cards,
  indices,
}: {
  cards: Array<{ id: string; term: string; description: string }>
  indices: number[]
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  if (indices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No cards in this list.
      </p>
    )
  }
  return (
    <ul className="space-y-2 max-h-[280px] overflow-y-auto">
      {indices.map((idx) => {
        const card = cards[idx]
        if (!card) return null
        const isExpanded = expandedId === card.id
        return (
          <li key={card.id}>
            <Card
              className="overflow-hidden cursor-pointer border transition-colors hover:bg-muted/30"
              onClick={() => setExpandedId(isExpanded ? null : card.id)}
            >
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <span className="font-medium text-sm text-foreground truncate flex-1">
                  {card.term}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </CardContent>
              {isExpanded && (
                <div className="border-t bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
                    {card.description}
                  </MessageResponse>
                </div>
              )}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

export function FlashcardUI({
  data,
  messageId,
  compact = false,
  onViewFull,
}: FlashcardUIProps) {
  const cards = (data?.cards && Array.isArray(data.cards)) ? data.cards : []
  const totalCards = cards.length

  const [remainingIndices, setRemainingIndices] = useState<number[]>(
    () => cards.map((_, i) => i)
  )
  const [rememberedIndices, setRememberedIndices] = useState<number[]>([])
  const [notRememberedIndices, setNotRememberedIndices] = useState<number[]>([])
  const [isFlipped, setIsFlipped] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isExiting, setIsExiting] = useState<'left' | 'right' | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const currentIndex = remainingIndices[0]
  const currentCard = currentIndex !== undefined ? cards[currentIndex] : null
  const rememberedCount = rememberedIndices.length
  const notRememberedCount = notRememberedIndices.length
  const progress = totalCards > 0
    ? ((rememberedCount + notRememberedCount) / totalCards) * 100
    : 0

  const handleFlip = useCallback(() => {
    if (isExiting) return
    setIsFlipped((prev) => !prev)
  }, [isExiting])

  const swipe = useCallback(
    (direction: 'right' | 'left') => {
      if (currentIndex === undefined || !currentCard) return
      setIsExiting(direction)
      if (direction === 'right') {
        setRememberedIndices((prev) => [...prev, currentIndex])
      } else {
        setNotRememberedIndices((prev) => [...prev, currentIndex])
      }
      setDragOffset(0)
      // After animation, remove current from remaining
      setTimeout(() => {
        setRemainingIndices((prev) => prev.slice(1))
        setIsFlipped(false)
        setIsExiting(null)
      }, 200)
    },
    [currentIndex, currentCard]
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!currentCard || isExiting) return
      pointerStart.current = { x: e.clientX, y: e.clientY }
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [currentCard, isExiting]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStart.current || isExiting) return
      const dx = e.clientX - pointerStart.current.x
      // Clamp with resistance at edges
      const max = 120
      const clamped = Math.abs(dx) > max ? max * Math.sign(dx) : dx
      setDragOffset(clamped)
    },
    [isExiting]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
      if (!pointerStart.current || isExiting) return
      const dx = e.clientX - pointerStart.current.x
      if (dx >= SWIPE_THRESHOLD) {
        swipe('right')
      } else if (dx <= -SWIPE_THRESHOLD) {
        swipe('left')
      } else {
        setDragOffset(0)
      }
      pointerStart.current = null
    },
    [isExiting, swipe]
  )

  const onPointerLeave = useCallback(() => {
    if (pointerStart.current && !isExiting) {
      setDragOffset(0)
      pointerStart.current = null
    }
  }, [isExiting])

  if (totalCards === 0) {
    return (
      <div className="p-4 text-center rounded-lg border bg-muted/30">
        <p className="text-muted-foreground text-sm">No flashcards in this set.</p>
      </div>
    )
  }

  const completed = remainingIndices.length === 0

  return (
    <div className="space-y-4">
      {/* Header: title, progress, hints */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{data.title || 'Flashcards'}</h3>
          {data.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{data.description}</p>
          )}
        </div>
        {onViewFull && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={onViewFull}
            aria-label="Open full screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!completed && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Card {rememberedCount + notRememberedCount + 1} of {totalCards}
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                {rememberedCount}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-amber-600" />
                {notRememberedCount}
              </span>
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {/* Swipe hints */}
      {!completed && (
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" />
            Swipe left = don&apos;t remember
          </span>
          <span className="flex items-center gap-1">
            Swipe right = remember
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
        </div>
      )}

      {/* Card stack */}
      {completed ? (
        <div className="space-y-3">
          <Card className="border-2 border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-6 px-6 text-center">
              <Library className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="font-medium">You&apos;ve gone through all cards</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                <span className="text-green-600 dark:text-green-400 font-medium">{rememberedCount}</span> remembered
                {notRememberedCount > 0 && (
                  <>
                    {' · '}
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{notRememberedCount}</span> to review
                  </>
                )}
              </p>
            </CardContent>
          </Card>
          <Tabs defaultValue={notRememberedCount > 0 ? 'review' : 'remembered'} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="remembered" className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Remembered ({rememberedCount})
              </TabsTrigger>
              <TabsTrigger value="review" className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-amber-600" />
                To review ({notRememberedCount})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="remembered" className="mt-3">
              <RememberedList cards={cards} indices={rememberedIndices} />
            </TabsContent>
            <TabsContent value="review" className="mt-3">
              <RememberedList cards={cards} indices={notRememberedIndices} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div
          className="relative touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onPointerCancel={onPointerLeave}
        >
          <div
            className="relative w-full transition-transform duration-200 ease-out"
            style={{
              transform: `translateX(${isExiting ? (isExiting === 'right' ? 200 : -200) : dragOffset}px)`,
              opacity: isExiting ? 0 : 1,
            }}
          >
            <Card
              className="overflow-hidden cursor-pointer border-2 min-h-[180px] flex flex-col"
              onClick={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-flip-area]')) {
                  handleFlip()
                }
              }}
              data-flip-area
            >
              <CardContent className="flex-1 flex flex-col items-center justify-center p-6 relative">
                <div
                  className="w-full flex-1 flex flex-col items-center justify-center"
                  style={{ minHeight: 140, perspective: 1000 }}
                >
                  <div
                    className="relative w-full transition-transform duration-300"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      minHeight: 160,
                      height: 160,
                    }}
                  >
                    {/* Front: term only */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center p-4 rounded-lg border border-transparent"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg)',
                      }}
                    >
                      <p className="text-lg font-semibold text-center text-foreground">
                        {currentCard?.term}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">Tap to flip</p>
                    </div>
                    {/* Back: description */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <div className="w-full max-w-md text-sm text-foreground overflow-y-auto max-h-[200px]">
                        <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
                          {currentCard?.description}
                        </MessageResponse>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Tap to flip back</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
