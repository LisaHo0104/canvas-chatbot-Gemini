## Goals
- Elevate the score as the primary visual element and context anchor.
- Deliver clear feedback split into strengths vs weaknesses with calm tone.
- Provide actionable next steps with clear CTA hierarchy: Focused practice > Redo quiz > Generate set.
- Use shadcn/ui and lucide-react with accessible, student-friendly patterns.

## Layout Structure
1. Hero Score Card
- Large percentage and ratio; brief supportive message; progress bar.
- Adjacent area for your donut chart component.
2. Feedback Summary
- Alert with neutral tone summarizing performance and encouraging progression.
3. Strengths & Weaknesses
- Two cards highlighting top topics; badges for counts; soft colors.
4. Question Review
- Tabs for All / Incorrect / Correct; ScrollArea for long lists.
- Each item uses icons and color accents; collapsible explanations.
5. Recommended Next Steps
- Primary: Focused practice on weak topics.
- Secondary: Redo quiz.
- Tertiary: Generate a new set.

## Rationale Per Section
- Hero Score Card: anchors attention, establishes emotional tone, and shows quick status.
- Feedback Summary: reinforces supportive guidance and reduces discouragement for low scores.
- Strengths & Weaknesses: separates positive reinforcement from areas to improve.
- Question Review: efficient triage with tabs; collapsible details minimize overwhelm.
- Next Steps: converts insight into action, aligned to learning goals.

## Component Choices
- Card, Badge, Progress, Tabs, Alert, ScrollArea, Button, Collapsible from `@/components/ui`.
- lucide-react icons: CheckCircle, XCircle, Info, RefreshCw, BookOpen, Sparkles.
- Calm palette via Tailwind utility classes with soft backgrounds; high contrast text.

## Accessibility
- Semantic headings and region labels; aria-live for supportive message.
- Tabs with labeled triggers and counts; buttons with clear labels.
- Collapsible content uses keyboard-accessible triggers; icons have `aria-hidden`.

## Data Interface
- Props: `score`, `total`, `questions[]`, optional `donut` node, handlers for CTAs.
- Question: `{ id, question, isCorrect, explanation?, userAnswer?, correctAnswer?, topic? }`.
- Topics derived from questions to compute strengths/weaknesses.

## ResultPage.tsx
```tsx
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
import { CheckCircle, XCircle, Info, RefreshCw, BookOpen, Sparkles } from 'lucide-react'

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
  const strengths = useMemo(() => topicStats.filter(([_, v]) => v.correct > 0).sort((a, b) => b[1].correct - a[1].correct).slice(0, 5), [topicStats])
  const weaknesses = useMemo(() => topicStats.filter(([_, v]) => v.incorrect > 0).sort((a, b) => b[1].incorrect - a[1].incorrect).slice(0, 5), [topicStats])

  useEffect(() => {
    console.debug('ResultPage mounted', { percent, score, total })
  }, [percent, score, total])

  const supportiveText = percent < 50 ? 'Progress starts here. Focus the weakest topics to improve.' : percent < 80 ? 'Nice work. Strengthen remaining topics for mastery.' : 'Excellent performance. Keep practicing to retain mastery.'

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <section aria-label="Score summary" className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-6xl font-semibold tracking-tight">{percent}%</p>
                <p className="mt-1 text-sm text-muted-foreground">{score}/{total} correct</p>
              </div>
              <div className="w-40 h-40 flex items-center justify-center">{donut}</div>
            </div>
            <div className="mt-6">
              <Progress value={percent} aria-label="Score progress" />
            </div>
            <p className="mt-3 text-sm" aria-live="polite">{supportiveText}</p>
          </CardContent>
        </Card>
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
            <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" aria-hidden />Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No strong topics yet. Build momentum with focused practice.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {strengths.map(([topic, v]) => (
                  <Badge key={topic} className="bg-green-50 text-green-700 border border-green-200">{topic} • {v.correct}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-rose-600" aria-hidden />Weaknesses</CardTitle>
          </CardHeader>
          <CardContent>
            {weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clear weaknesses. Maintain regular review to retain mastery.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {weaknesses.map(([topic, v]) => (
                  <Badge key={topic} className="bg-rose-50 text-rose-700 border border-rose-200">{topic} • {v.incorrect}</Badge>
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
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" aria-hidden />Recommended Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button onClick={onFocusedPractice} className="justify-start" aria-label="Start focused practice">
                <TrendingUpIcon className="mr-2 h-4 w-4" aria-hidden /> Focused practice
              </Button>
              <Button onClick={onRedo} variant="secondary" className="justify-start" aria-label="Redo this quiz">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Redo quiz
              </Button>
              <Button onClick={onGenerate} variant="outline" className="justify-start" aria-label="Generate new question set">
                <BookOpen className="mr-2 h-4 w-4" aria-hidden /> Generate new set
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function QuestionItem({ q }: { q: QuizQuestion }) {
  const toneClasses = q.isCorrect
    ? 'border-green-200 bg-green-50'
    : 'border-rose-200 bg-rose-50'
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
              {q.topic ? (
                <Badge variant="secondary" className="text-xs">{q.topic}</Badge>
              ) : null}
            </div>
            <p className="mt-2 font-medium">{q.question}</p>
            <Collapsible>
              <div className="mt-2 flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Toggle explanation">
                    <Info className="mr-2 h-4 w-4" aria-hidden /> Explanation
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="mt-2 text-sm text-muted-foreground">
                  {q.userAnswer ? (
                    <p className="mb-1">Your answer: {q.userAnswer}</p>
                  ) : null}
                  {q.correctAnswer ? (
                    <p className="mb-1">Correct answer: {q.correctAnswer}</p>
                  ) : null}
                  {q.explanation ? (
                    <p>{q.explanation}</p>
                  ) : (
                    <p>No explanation provided.</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TrendingUpIcon(props: React.ComponentProps<'svg'>) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /></svg>
}
```

## Interaction Details
- Default tab shows Incorrect to focus remediation.
- Collapsible explanations are ghost-style for low visual weight; keyboard accessible.
- Soft success/error tints reduce punitive tone; badges convey status succinctly.

## Empty/Low-Score Behavior
- Supportive message varies with score percent; avoids negative framing.
- Strengths/Weaknesses gracefully handle empty sets.

## Integration Notes
- Pass in your existing donut chart as the `donut` prop.
- Hook CTAs to your routes or actions via the provided handlers.
- Import paths match `@/components/ui/*` and `lucide-react` as used in the repo.
