'use client'
import { useEffect, useMemo } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Info, RefreshCw, BookOpen, Sparkles, TrendingUp } from 'lucide-react'
import ScoreSummaryCard from './ScoreSummaryCard'

export type QuizQuestion = {
  id: string
  question: string
  isCorrect: boolean
  explanation?: string
  userAnswer?: string
  correctAnswer?: string
  topic?: string
}

type ResultPageProps = {
  score: number
  total: number
  questions: QuizQuestion[]
  donut?: React.ReactNode
  onFocusedPractice?: () => void
  onRedo?: () => void
  onGenerate?: () => void
}

export function ResultPage({ score, total, questions, donut, onFocusedPractice, onRedo, onGenerate }: ResultPageProps) {
  const percent = Math.round((score / Math.max(total, 1)) * 100)
  const correct = useMemo(() => questions.filter(q => q.isCorrect), [questions])
  const incorrect = useMemo(() => questions.filter(q => !q.isCorrect), [questions])
  const topicStats = useMemo(() => {
    const m = new Map<string, { correct: number; incorrect: number }>()
    for (const q of questions) {
      const key = q.topic || 'General'
      const prev = m.get(key) || { correct: 0, incorrect: 0 }
      if (q.isCorrect) prev.correct += 1
      else prev.incorrect += 1
      m.set(key, prev)
    }
    return Array.from(m.entries())
  }, [questions])
  const strengths = useMemo(
    () => topicStats.filter(([_, v]) => v.correct > 0).sort((a, b) => b[1].correct - a[1].correct).slice(0, 5),
    [topicStats]
  )
  const weaknesses = useMemo(
    () => topicStats.filter(([_, v]) => v.incorrect > 0).sort((a, b) => b[1].incorrect - a[1].incorrect).slice(0, 5),
    [topicStats]
  )

  useEffect(() => {
    console.debug('ResultPage mounted', { percent, score, total })
  }, [percent, score, total])

  const supportiveText =
    percent < 50
      ? 'Progress starts here. Focus the weakest topics to improve.'
      : percent < 80
      ? 'Nice work. Strengthen remaining topics for mastery.'
      : 'Excellent performance. Keep practicing to retain mastery.'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <section aria-label="Score summary" className="grid gap-6 md:grid-cols-2">
        <ScoreSummaryCard
          score={score}
          total={total}
          correctCount={correct.length}
          incorrectCount={incorrect.length}
          donut={donut}
        />
        <Alert>
          <Info className="h-4 w-4" aria-hidden />
          <AlertTitle>Feedback</AlertTitle>
          <AlertDescription>
            This summary highlights strengths and growth areas with suggestions to guide your next study session.
          </AlertDescription>
        </Alert>
      </section>

      <section aria-label="Strengths and weaknesses" className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" aria-hidden />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No strong topics yet. Build momentum with focused practice.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {strengths.map(([topic, v]) => (
                  <Badge key={topic} className="bg-green-50 text-green-700 border border-green-200">
                    {topic} • {v.correct}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" aria-hidden />
              Weaknesses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clear weaknesses. Maintain regular review to retain mastery.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {weaknesses.map(([topic, v]) => (
                  <Badge key={topic} className="bg-rose-50 text-rose-700 border border-rose-200">
                    {topic} • {v.incorrect}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label="Question review" className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Question Review</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="incorrect" className="w-full">
              <TabsList aria-label="Review filter">
                <TabsTrigger value="all" aria-label={`All questions ${questions.length}`}>
                  All ({questions.length})
                </TabsTrigger>
                <TabsTrigger value="incorrect" aria-label={`Incorrect questions ${incorrect.length}`}>
                  Incorrect ({incorrect.length})
                </TabsTrigger>
                <TabsTrigger value="correct" aria-label={`Correct questions ${correct.length}`}>
                  Correct ({correct.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <ScrollArea className="h-[420px] pr-4">
                  <div className="space-y-3">
                    {questions.map(q => (
                      <QuestionItem key={q.id} q={q} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="incorrect">
                <ScrollArea className="h-[420px] pr-4">
                  <div className="space-y-3">
                    {incorrect.map(q => (
                      <QuestionItem key={q.id} q={q} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="correct">
                <ScrollArea className="h-[420px] pr-4">
                  <div className="space-y-3">
                    {correct.map(q => (
                      <QuestionItem key={q.id} q={q} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Recommended next steps" className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden />
              Recommended Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button onClick={onFocusedPractice} className="justify-start" aria-label="Start focused practice">
                <TrendingUp className="mr-2 h-4 w-4" aria-hidden />
                Focused practice
              </Button>
              <Button onClick={onRedo} variant="secondary" className="justify-start" aria-label="Redo this quiz">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                Redo quiz
              </Button>
              <Button onClick={onGenerate} variant="outline" className="justify-start" aria-label="Generate new question set">
                <BookOpen className="mr-2 h-4 w-4" aria-hidden />
                Generate new set
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function QuestionItem({ q }: { q: QuizQuestion }) {
  const toneClasses = q.isCorrect ? 'border-green-200 bg-green-50' : 'border-rose-200 bg-rose-50'
  const icon = q.isCorrect ? (
    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden />
  ) : (
    <XCircle className="h-5 w-5 text-rose-600" aria-hidden />
  )

  return (
    <Card className={`border ${toneClasses}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {icon}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={q.isCorrect ? 'text-green-700 border-green-300' : 'text-rose-700 border-rose-300'}>
                {q.isCorrect ? 'Correct' : 'Incorrect'}
              </Badge>
              {q.topic ? <Badge variant="secondary" className="text-xs">{q.topic}</Badge> : null}
            </div>
            <p className="mt-2 font-medium">{q.question}</p>
            <Collapsible>
              <div className="mt-2 flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Toggle explanation">
                    <Info className="mr-2 h-4 w-4" aria-hidden />
                    Explanation
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-2 text-sm text-muted-foreground">
                  {q.userAnswer ? <p className="mb-1">Your answer: {q.userAnswer}</p> : null}
                  {q.correctAnswer ? <p className="mb-1">Correct answer: {q.correctAnswer}</p> : null}
                  {q.explanation ? <p>{q.explanation}</p> : <p>No explanation provided.</p>}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
