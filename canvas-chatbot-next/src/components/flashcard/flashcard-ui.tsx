'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, XCircle, BookOpen, Clock } from 'lucide-react'

export interface FlashcardOutput {
  title: string
  description?: string
  cards: Array<{
    id: string
    front: string
    back: string
    difficulty?: 'easy' | 'medium' | 'hard'
  }>
}

interface FlashcardUIProps {
  data: FlashcardOutput
  messageId?: string
  compact?: boolean
  onViewFull?: () => void
}

type CardStatus = 'unknown' | 'known' | 'needs-review'

export function FlashcardUI({ data, messageId, compact = false, onViewFull }: FlashcardUIProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [cardStatuses, setCardStatuses] = useState<Map<string, CardStatus>>(new Map())

  if (!data || !data.cards || data.cards.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">No flashcards available.</p>
      </div>
    )
  }

  const cards = data.cards
  const currentCard = cards[currentIndex]
  const currentStatus = cardStatuses.get(currentCard.id) || 'unknown'

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleStatusChange = (status: CardStatus) => {
    const newStatuses = new Map(cardStatuses)
    newStatuses.set(currentCard.id, status)
    setCardStatuses(newStatuses)
  }

  const handleReset = () => {
    setCardStatuses(new Map())
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  const getStatusCounts = () => {
    let known = 0
    let needsReview = 0
    let unknown = 0
    cardStatuses.forEach((status) => {
      if (status === 'known') known++
      else if (status === 'needs-review') needsReview++
      else unknown++
    })
    unknown = cards.length - known - needsReview
    return { known, needsReview, unknown }
  }

  const statusCounts = getStatusCounts()
  const progress = ((statusCounts.known + statusCounts.needsReview) / cards.length) * 100

  // Compact view
  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5" />
                {data.title}
              </CardTitle>
              <CardDescription>
                {cards.length} flashcards
              </CardDescription>
            </div>
            {onViewFull && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewFull}
              >
                View Full
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>
    )
  }

  // Full view
  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5" />
                {data.title}
              </CardTitle>
              {data.description && (
                <CardDescription className="mt-2">
                  {data.description}
                </CardDescription>
              )}
              <div className="flex items-center gap-4 flex-wrap mt-4">
                <span className="text-sm text-muted-foreground">
                  {cards.length} cards
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300">
                    {statusCounts.known} Known
                  </Badge>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300">
                    {statusCounts.needsReview} Review
                  </Badge>
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-950 dark:text-gray-300">
                    {statusCounts.unknown} Unknown
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </CardHeader>
        {progress > 0 && (
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Flashcard Display */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <Card className="w-full max-w-2xl h-[400px] relative">
          <CardContent className="p-0 h-full">
            <div className="relative w-full h-full">
              {/* Front of card */}
              <div
                className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
                  isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div className="h-full flex flex-col items-center justify-center p-8 bg-card border rounded-lg">
                  <div className="text-center space-y-4 w-full">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline">
                        Card {currentIndex + 1} of {cards.length}
                      </Badge>
                      {currentCard.difficulty && (
                        <Badge
                          variant={
                            currentCard.difficulty === 'easy'
                              ? 'default'
                              : currentCard.difficulty === 'medium'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {currentCard.difficulty}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">Front</div>
                    <div className="text-lg font-medium">{currentCard.front}</div>
                  </div>
                </div>
              </div>

              {/* Back of card */}
              <div
                className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
                  isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <div className="h-full flex flex-col items-center justify-center p-8 bg-primary/5 border rounded-lg">
                  <div className="text-center space-y-4 w-full">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline">
                        Card {currentIndex + 1} of {cards.length}
                      </Badge>
                      {currentCard.difficulty && (
                        <Badge
                          variant={
                            currentCard.difficulty === 'easy'
                              ? 'default'
                              : currentCard.difficulty === 'medium'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {currentCard.difficulty}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">Back</div>
                    <div className="text-lg">{currentCard.back}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="mt-6 w-full max-w-2xl space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="size-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={handleFlip}
              className="px-8"
            >
              {isFlipped ? 'Show Front' : 'Flip Card'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
            >
              Next
              <ChevronRight className="size-4 ml-2" />
            </Button>
          </div>

          {/* Status buttons (only show when flipped) */}
          {isFlipped && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={currentStatus === 'known' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('known')}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="size-4" />
                Known
              </Button>
              <Button
                variant={currentStatus === 'needs-review' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange('needs-review')}
                className="flex items-center gap-2"
              >
                <XCircle className="size-4" />
                Needs Review
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
