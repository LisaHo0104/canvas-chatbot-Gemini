'use client'
import { useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type ScoreSummaryCardProps = {
  score: number
  total: number
  correctCount: number
  incorrectCount: number
  donut?: React.ReactNode
}

export function ScoreSummaryCard({ score, total, correctCount, incorrectCount, donut }: ScoreSummaryCardProps) {
  const percent = useMemo(() => Math.round((score / Math.max(total, 1)) * 100), [score, total])

  useEffect(() => {
    console.debug('ScoreSummaryCard mounted', { percent, score, total, correctCount, incorrectCount })
  }, [percent, score, total, correctCount, incorrectCount])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 items-center md:grid-cols-[minmax(0,1.2fr)_auto]">
          <div className="space-y-2">
            <p className="text-6xl font-semibold tracking-tight">{percent}%</p>
            <div className="text-sm text-muted-foreground">
              {score}/{total} correct
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-green-300 text-green-700">Correct {correctCount}</Badge>
              <Badge variant="outline" className="border-rose-300 text-rose-700">Incorrect {incorrectCount}</Badge>
            </div>
          </div>
          <div className="flex items-center justify-center md:justify-end">
            <div className="size-72 sm:size-80 md:size-72 lg:size-80 shrink-0">{donut}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ScoreSummaryCard
