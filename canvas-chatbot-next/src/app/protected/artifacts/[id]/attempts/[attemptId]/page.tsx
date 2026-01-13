'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { QuizResultsRadial } from '@/components/quiz/QuizResultsRadial'
import { CheckCircle2, XCircle, BookOpen, ExternalLink } from 'lucide-react'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

interface AttemptDetails {
  id: string
  artifact_id: string
  quiz_data: any
  user_answers: Record<string, any>
  self_assessments: Record<string, string>
  score: number
  total_questions: number
  time_taken_seconds: number | null
  started_at: string
  completed_at: string
  created_at: string
}

export default function AttemptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const artifactId = params?.id as string
  const attemptId = params?.attemptId as string

  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<AttemptDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (attemptId) {
      loadAttempt()
    }
  }, [attemptId])

  const loadAttempt = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/quiz-attempts/${attemptId}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load attempt')
      }

      const data = await response.json()
      setAttempt(data.attempt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attempt')
      console.error('Error loading attempt:', err)
    } finally {
      setLoading(false)
    }
  }

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'true_false':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'short_answer':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const isAttemptAnswerCorrect = (
    question: any,
    userAnswer: any,
    correctAnswer: any,
    allowMultiple?: boolean,
    selfAssessment?: string
  ): boolean | null => {
    if (question.type === 'multiple_choice') {
      if (allowMultiple && Array.isArray(correctAnswer)) {
        const userArray = Array.isArray(userAnswer) ? userAnswer : []
        const userSet = new Set(userArray.map(String))
        const correctSet = new Set(correctAnswer.map(String))
        return userSet.size === correctSet.size && Array.from(userSet).every(val => correctSet.has(val))
      } else {
        return userAnswer === correctAnswer
      }
    } else if (question.type === 'true_false') {
      return userAnswer === correctAnswer
    } else if (question.type === 'short_answer') {
      if (selfAssessment === 'correct') return true
      if (selfAssessment === 'incorrect') return false
      if (selfAssessment === 'partial') return null
      return null
    }
    return null
  }

  const getCorrectAnswerDisplay = (question: any): string => {
    if (question.type === 'multiple_choice' && question.options) {
      if (Array.isArray(question.correctAnswer)) {
        return question.correctAnswer
          .map((ans: any) => {
            const index = typeof ans === 'number' ? ans : 0
            return question.options?.[index] || String(ans)
          })
          .join(', ')
      } else {
        const index = typeof question.correctAnswer === 'number' ? question.correctAnswer : 0
        return question.options[index] || String(question.correctAnswer)
      }
    } else if (question.type === 'true_false') {
      return question.correctAnswer ? 'True' : 'False'
    } else {
      return String(question.correctAnswer)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] w-full">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        {!loading && attempt && (
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/protected/artifacts">Artifacts</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/protected/artifacts/${artifactId}`}>
                    {attempt.quiz_data?.title || 'Quiz'}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Attempt Details</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Attempt Details */}
        {!loading && !error && attempt && (
          <div className="w-full space-y-6">
            {/* Score Summary */}
            <Card>
              <CardContent className="p-6 lg:p-10">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8 items-center">
                  {/* Left Side: Text Details */}
                  <div className="flex flex-col items-start text-left space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Attempt Details</h2>
                        <p className="text-lg lg:text-xl text-muted-foreground">
                          Score: <span className="font-semibold text-foreground">{attempt.score} out of {attempt.total_questions}</span> ({Math.round((attempt.score / attempt.total_questions) * 100)}%)
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="font-medium">Completed on:</span> 
                          {new Date(attempt.completed_at).toLocaleString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                        {attempt.time_taken_seconds && (
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="font-medium">Time taken:</span> 
                            {Math.floor(attempt.time_taken_seconds / 60)}:{String(attempt.time_taken_seconds % 60).padStart(2, '0')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Radial Chart */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-full max-w-[280px]">
                      <QuizResultsRadial 
                        correct={attempt.score} 
                        total={attempt.total_questions} 
                        minimal
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Correct answers shown in light green; wrong in light red
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions Review */}
            <div className="space-y-4">
              {attempt.quiz_data?.questions?.map((question: any, index: number) => {
                const userAnswer = attempt.user_answers[question.id]
                const selfAssessment = attempt.self_assessments?.[question.id]
                const correctAnswer = question.correctAnswer
                const isCorrect = isAttemptAnswerCorrect(
                  question,
                  userAnswer,
                  correctAnswer,
                  question.allowMultiple,
                  selfAssessment
                )

                return (
                  <Card key={question.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base">Question {index + 1}</CardTitle>
                        <Badge className={getQuestionTypeColor(question.type)} variant="outline">
                          {question.type.replace('_', ' ')}
                        </Badge>
                        {question.topic && (
                          <Badge variant="outline">{question.topic}</Badge>
                        )}
                        {isCorrect !== null && (
                          isCorrect ? (
                            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="size-5 text-red-600 dark:text-red-400" />
                          )
                        )}
                      </div>
                      <CardDescription className="text-base">{question.question}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* User Answer */}
                      <div>
                        <p className="text-sm font-medium mb-2">Your Answer:</p>
                        {question.type === 'multiple_choice' && question.options && (
                          <div className="space-y-2">
                            {Array.isArray(userAnswer) ? (
                              userAnswer.map((ans: number) => (
                                <div 
                                  key={ans} 
                                  className={`p-3 rounded-md border ${
                                    isCorrect !== null && isCorrect
                                      ? 'bg-green-50 dark:bg-green-950 border-green-300'
                                      : isCorrect !== null && !isCorrect
                                      ? 'bg-red-50 dark:bg-red-950 border-red-300'
                                      : 'bg-muted'
                                  }`}
                                >
                                  {question.options[ans]}
                                </div>
                              ))
                            ) : (
                              <div 
                                className={`p-3 rounded-md border ${
                                  isCorrect !== null && isCorrect
                                    ? 'bg-green-50 dark:bg-green-950 border-green-300'
                                    : isCorrect !== null && !isCorrect
                                    ? 'bg-red-50 dark:bg-red-950 border-red-300'
                                    : 'bg-muted'
                                }`}
                              >
                                {question.options[userAnswer]}
                              </div>
                            )}
                          </div>
                        )}
                        {question.type === 'true_false' && (
                          <div 
                            className={`p-3 rounded-md border ${
                              isCorrect !== null && isCorrect
                                ? 'bg-green-50 dark:bg-green-950 border-green-300'
                                : isCorrect !== null && !isCorrect
                                ? 'bg-red-50 dark:bg-red-950 border-red-300'
                                : 'bg-muted'
                            }`}
                          >
                            {userAnswer ? 'True' : 'False'}
                          </div>
                        )}
                        {question.type === 'short_answer' && (
                          <div className="p-3 bg-muted rounded-md border">
                            {String(userAnswer)}
                          </div>
                        )}
                      </div>

                      {/* Correct Answer */}
                      <div>
                        <p className="text-sm font-medium mb-2">Correct Answer:</p>
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md border border-green-300">
                          {question.type === 'multiple_choice' && question.options && (
                            Array.isArray(correctAnswer) ? (
                              <div className="space-y-1">
                                {correctAnswer.map((ans: number) => (
                                  <div key={ans}>{question.options[ans]}</div>
                                ))}
                              </div>
                            ) : (
                              question.options[correctAnswer]
                            )
                          )}
                          {question.type === 'true_false' && (
                            correctAnswer ? 'True' : 'False'
                          )}
                          {question.type === 'short_answer' && (
                            String(correctAnswer)
                          )}
                        </div>
                      </div>

                      {/* Self Assessment for Short Answer */}
                      {question.type === 'short_answer' && selfAssessment && (
                        <div>
                          <p className="text-sm font-medium mb-2">Your Self-Assessment:</p>
                          <Badge
                            variant="outline"
                            className={
                              selfAssessment === 'correct'
                                ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300'
                                : selfAssessment === 'partial'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300'
                                : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300'
                            }
                          >
                            {selfAssessment === 'correct' ? 'Correct' :
                             selfAssessment === 'partial' ? 'Partially Correct' : 'Incorrect'}
                          </Badge>
                        </div>
                      )}

                      <Separator />

                      {/* Explanation */}
                      <div>
                        <p className="text-sm font-medium mb-2">Explanation:</p>
                        <p className="text-sm text-muted-foreground">{question.explanation}</p>
                      </div>

                      {/* Source Reference */}
                      {question.sourceReference && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <BookOpen className="size-4" />
                          <span>
                            Source: {question.sourceReference.name}
                            {question.sourceReference.url && (
                              <a
                                href={question.sourceReference.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                View <ExternalLink className="size-3" />
                              </a>
                            )}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
