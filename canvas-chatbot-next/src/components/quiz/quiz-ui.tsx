'use client'

import { useState, useEffect } from 'react'
import { FileQuestion, CheckCircle2, XCircle, BookOpen, Clock, ExternalLink, Maximize2, Save, ArrowRight, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { QuizResultsRadial } from './QuizResultsRadial'
import { useRouter } from 'next/navigation'

export interface QuizOutput {
  title: string
  description?: string
  totalQuestions: number
  topics: string[]
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  questions: Array<{
    id: string
    question: string
    type: 'multiple_choice' | 'true_false' | 'short_answer'
    options?: string[]
    correctAnswer: string | number | boolean | (string | number | boolean)[]
    allowMultiple?: boolean
    explanation: string
    sourceReference?: {
      type: 'module' | 'assignment' | 'course' | 'page' | 'file'
      name: string
      url?: string
    }
    topic?: string
  }>
  metadata?: {
    estimatedTime?: number
    sourcesUsed?: string[]
  }
}

interface QuizAttempt {
  id: string
  score: number
  total_questions: number
  completed_at: string
  time_taken_seconds: number | null
}

interface QuizUIProps {
  data: QuizOutput
  messageId?: string
  compact?: boolean
  onViewFull?: () => void
  onSaveClick?: () => void
  artifactId?: string
  history?: QuizAttempt[]
}

type ViewMode = 'welcome' | 'step-by-step' | 'results' | 'review'

export function QuizUI({ data, messageId, compact = false, onViewFull, onSaveClick, artifactId, history }: QuizUIProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>(compact ? 'review' : 'welcome')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())
  const [userAnswers, setUserAnswers] = useState<Map<string, string | number | boolean | (string | number | boolean)[]>>(new Map())
  const [showAnswers, setShowAnswers] = useState<Map<string, boolean>>(new Map())
  const [feedbackRevealed, setFeedbackRevealed] = useState<Map<string, boolean>>(new Map())
  const [selfAssessments, setSelfAssessments] = useState<Map<string, 'correct' | 'incorrect' | 'partial'>>(new Map())
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [attemptSaved, setAttemptSaved] = useState(false)

  const toggleQuestion = (id: string) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedQuestions(newExpanded)
  }

  const handleAnswerChange = (questionId: string, answer: string | number | boolean) => {
    const question = data.questions.find(q => q.id === questionId)
    const newAnswers = new Map(userAnswers)
    
    if (question?.allowMultiple) {
      // Handle multiple select - toggle answer in array
      const currentAnswer = newAnswers.get(questionId)
      const currentArray = Array.isArray(currentAnswer) ? currentAnswer : (currentAnswer !== undefined ? [currentAnswer] : [])
      const answerIndex = currentArray.indexOf(answer)
      
      if (answerIndex >= 0) {
        // Remove if already selected
        currentArray.splice(answerIndex, 1)
      } else {
        // Add if not selected
        currentArray.push(answer)
      }
      newAnswers.set(questionId, currentArray.length > 0 ? currentArray : [])
    } else {
      // Single select - replace answer
      newAnswers.set(questionId, answer)
    }
    
    setUserAnswers(newAnswers)
  }

  const toggleShowAnswer = (id: string) => {
    const newShow = new Map(showAnswers)
    if (newShow.has(id)) {
      newShow.delete(id)
    } else {
      newShow.set(id, true)
    }
    setShowAnswers(newShow)
  }

  const startQuiz = () => {
    setViewMode('step-by-step')
    setCurrentQuestionIndex(0)
    setUserAnswers(new Map())
    setFeedbackRevealed(new Map())
    setSelfAssessments(new Map())
    setStartTime(new Date())
  }

  const handleAnswerSelect = (questionId: string, answer: string | number | boolean, allowMultiple?: boolean) => {
    const newAnswers = new Map(userAnswers)
    
    if (allowMultiple) {
      // Handle multiple select - toggle answer in array
      const currentAnswer = newAnswers.get(questionId)
      const currentArray = Array.isArray(currentAnswer) ? currentAnswer : []
      const answerIndex = currentArray.indexOf(answer)
      
      if (answerIndex >= 0) {
        // Remove if already selected
        currentArray.splice(answerIndex, 1)
      } else {
        // Add if not selected
        currentArray.push(answer)
      }
      newAnswers.set(questionId, currentArray.length > 0 ? currentArray : [])
    } else {
      // Single select - replace answer
      newAnswers.set(questionId, answer)
      
      // Reveal feedback immediately for single select
      const newFeedback = new Map(feedbackRevealed)
      newFeedback.set(questionId, true)
      setFeedbackRevealed(newFeedback)
    }
    
    setUserAnswers(newAnswers)
  }
  
  const handleMultipleSelectFeedback = (questionId: string) => {
    // Reveal feedback for multiple select when user is done selecting
    const newFeedback = new Map(feedbackRevealed)
    newFeedback.set(questionId, true)
    setFeedbackRevealed(newFeedback)
  }
  
  const handleSelfAssessment = (questionId: string, assessment: 'correct' | 'incorrect' | 'partial') => {
    const newAssessments = new Map(selfAssessments)
    newAssessments.set(questionId, assessment)
    setSelfAssessments(newAssessments)
  }
  
  const viewAttemptDetails = (attemptId: string) => {
    if (artifactId) {
      router.push(`/protected/artifacts/${artifactId}/attempts/${attemptId}`)
    }
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < data.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      // Finished all questions, show results
      setViewMode('results')
    }
  }

  const calculateScore = () => {
    let correct = 0
    data.questions.forEach((question) => {
      const userAnswer = userAnswers.get(question.id)
      if (userAnswer !== undefined) {
        if (question.type === 'multiple_choice') {
          if (question.allowMultiple && Array.isArray(question.correctAnswer)) {
            // Multiple select: check if all correct answers are selected and no incorrect ones
            const userArray = Array.isArray(userAnswer) ? userAnswer : []
            const correctArray = question.correctAnswer
            const userSet = new Set(userArray.map(String))
            const correctSet = new Set(correctArray.map(String))
            
            // Check if sets are equal (all correct selected, none incorrect)
            if (userSet.size === correctSet.size && 
                Array.from(userSet).every(val => correctSet.has(val))) {
              correct++
            }
          } else {
            // Single select
            if (userAnswer === question.correctAnswer) {
              correct++
            }
          }
        } else if (question.type === 'true_false') {
          if (userAnswer === question.correctAnswer) {
            correct++
          }
        } else if (question.type === 'short_answer') {
          // Use self-assessment for scoring
          const assessment = selfAssessments.get(question.id)
          if (assessment === 'correct') {
            correct += 1
          } else if (assessment === 'partial') {
            correct += 0.5
          }
          // 'incorrect' or undefined = 0 points
        }
      }
    })
    return correct
  }

  const getCurrentQuestion = () => {
    return data.questions[currentQuestionIndex]
  }

  const getProgress = () => {
    if (viewMode === 'welcome') return 0
    if (viewMode === 'results') return 100
    return ((currentQuestionIndex + 1) / data.questions.length) * 100
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'mixed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
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

  const isAnswerCorrect = (question: QuizOutput['questions'][0]): boolean | null => {
    const userAnswer = userAnswers.get(question.id)
    if (userAnswer === undefined) return null
    
    if (question.type === 'multiple_choice') {
      if (question.allowMultiple && Array.isArray(question.correctAnswer)) {
        // Multiple select: check if all correct answers are selected and no incorrect ones
        const userArray = Array.isArray(userAnswer) ? userAnswer : []
        const correctArray = question.correctAnswer
        const userSet = new Set(userArray.map(String))
        const correctSet = new Set(correctArray.map(String))
        
        return userSet.size === correctSet.size && 
               Array.from(userSet).every(val => correctSet.has(val))
      } else {
        return userAnswer === question.correctAnswer
      }
    } else if (question.type === 'true_false') {
      return userAnswer === question.correctAnswer
    } else if (question.type === 'short_answer') {
      // For short answer, use self-assessment
      const assessment = selfAssessments.get(question.id)
      if (assessment === 'correct') return true
      if (assessment === 'incorrect') return false
      if (assessment === 'partial') return null // Partial is neither fully correct nor incorrect
      return null
    }
    return null
  }

  const getCorrectAnswerDisplay = (question: QuizOutput['questions'][0]): string => {
    if (question.type === 'multiple_choice' && question.options) {
      if (Array.isArray(question.correctAnswer)) {
        // Multiple select: return comma-separated list of correct options
        return question.correctAnswer
          .map((ans) => {
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

  const questionsByType = {
    multiple_choice: data.questions.filter(q => q.type === 'multiple_choice'),
    true_false: data.questions.filter(q => q.type === 'true_false'),
    short_answer: data.questions.filter(q => q.type === 'short_answer'),
  }

  const questionsByTopic = data.questions.reduce((acc, q) => {
    const topic = q.topic || 'General'
    if (!acc[topic]) acc[topic] = []
    acc[topic].push(q)
    return acc
  }, {} as Record<string, typeof data.questions>)

  // Render Welcome Screen
  const renderWelcomeScreen = () => (
    <div className="w-full max-w-3xl mx-auto py-8 lg:py-12">
      <Card className="text-center">
        <CardHeader className="pb-6 lg:pb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <FileQuestion className="size-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl lg:text-3xl mb-2">{data.title}</CardTitle>
          {data.description && (
            <CardDescription className="text-base lg:text-lg mt-2">
              {data.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Badge className={`${getDifficultyColor(data.difficulty)} text-sm lg:text-base px-4 py-2`} variant="outline">
              {data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1)}
            </Badge>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileQuestion className="size-4" />
              <span className="text-sm lg:text-base">{data.totalQuestions} Questions</span>
            </div>
            {data.metadata?.estimatedTime && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4" />
                <span className="text-sm lg:text-base">~{data.metadata.estimatedTime} min</span>
              </div>
            )}
          </div>
          {data.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {data.topics.map((topic, i) => (
                <Badge key={i} variant="outline" className="text-xs lg:text-sm">{topic}</Badge>
              ))}
            </div>
          )}
          <Button
            onClick={startQuiz}
            size="lg"
            className="w-full sm:w-auto min-w-[200px] h-12 text-base lg:text-lg"
          >
            Start Quiz
            <ArrowRight className="ml-2 size-5" />
          </Button>
        </CardContent>
      </Card>
      
      {/* History Section */}
      {history && history.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl lg:text-2xl">Previous Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.slice(0, 5).map((attempt, index) => {
                const attemptNumber = history.length - index
                const percent = Math.round((attempt.score / attempt.total_questions) * 100)
                const completedDate = new Date(attempt.completed_at)
                const formattedDate = completedDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })
                const timeTaken = attempt.time_taken_seconds 
                  ? `${Math.floor(attempt.time_taken_seconds / 60)}:${String(attempt.time_taken_seconds % 60).padStart(2, '0')}`
                  : 'N/A'
                
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Attempt #{attemptNumber}</span>
                        <Badge variant="outline">
                          {attempt.score}/{attempt.total_questions} ({percent}%)
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formattedDate}</span>
                        <span>Time: {timeTaken}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => viewAttemptDetails(attempt.id)}
                      size="sm"
                    >
                      View Details
                    </Button>
                  </div>
                )
              })}
            </div>
            {history.length > 5 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Showing 5 most recent attempts
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )

  // Render Step-by-Step Question View
  const renderStepByStepView = () => {
    const question = getCurrentQuestion()
    const userAnswer = userAnswers.get(question.id)
    const isFeedbackShown = feedbackRevealed.has(question.id)
    const isCorrect = isAnswerCorrect(question)
    const selfAssessment = selfAssessments.get(question.id)

    return (
      <div className="w-full max-w-full mx-auto py-4 lg:py-6">
        {/* Progress Bar */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm lg:text-base font-medium text-muted-foreground">
              Question {currentQuestionIndex + 1} of {data.questions.length}
            </span>
            <span className="text-sm lg:text-base font-medium text-muted-foreground">
              {Math.round(getProgress())}%
            </span>
          </div>
          <Progress value={getProgress()} className="h-2 lg:h-3" />
        </div>

        {/* Question Card */}
        <Card className="mb-6 lg:mb-8">
          <CardHeader>
            <div className="flex items-center gap-2 mb-4">
              <Badge className={getQuestionTypeColor(question.type)} variant="outline">
                {question.type.replace('_', ' ')}
              </Badge>
              {question.topic && (
                <Badge variant="outline">{question.topic}</Badge>
              )}
            </div>
            <CardTitle className="text-xl lg:text-2xl">{question.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 lg:space-y-6">
            {/* Answer Options */}
            {question.type === 'multiple_choice' && question.options && (
              <div className="space-y-3 lg:space-y-4">
                {question.options.map((option, index) => {
                  const userArray = Array.isArray(userAnswer) ? userAnswer : (userAnswer !== undefined ? [userAnswer] : [])
                  const isSelected = userArray.includes(index)
                  const correctArray = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]
                  const isCorrectOption = correctArray.includes(index)
                  const showFeedback = isFeedbackShown
                  
                  // Determine if this specific option is correctly selected
                  const optionCorrect = isSelected && isCorrectOption
                  const optionIncorrect = isSelected && !isCorrectOption
                  
                  return (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? optionCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-950 ring-2 ring-green-500/20'
                            : optionIncorrect
                            ? 'border-red-500 bg-red-50 dark:bg-red-950 ring-2 ring-red-500/20'
                            : 'border-primary bg-primary/10 ring-2 ring-primary/20'
                          : showFeedback && isCorrectOption
                          ? 'border-green-300 bg-green-50/50 dark:bg-green-950/30'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => !isFeedbackShown && handleAnswerSelect(question.id, index, question.allowMultiple)}
                    >
                      <CardContent className="p-4 lg:p-6">
                        <div className="flex items-center gap-4">
                          {question.allowMultiple ? (
                            <Checkbox
                              checked={isSelected}
                              onChange={() => !isFeedbackShown && handleAnswerSelect(question.id, index, true)}
                              className={optionCorrect ? 'border-green-500' : optionIncorrect ? 'border-red-500' : ''}
                            />
                          ) : (
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? optionCorrect
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-red-500 bg-red-500'
                                : 'border-muted-foreground'
                            }`}>
                              {isSelected && (
                                optionCorrect ? (
                                  <CheckCircle2 className="size-4 text-white" />
                                ) : (
                                  <XCircle className="size-4 text-white" />
                                )
                              )}
                            </div>
                          )}
                          <span className="text-base lg:text-lg flex-1">{option}</span>
                          {showFeedback && isCorrectOption && !isSelected && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300">
                              Correct Answer
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                {question.allowMultiple && !isFeedbackShown && (
                  <Button
                    variant="outline"
                    onClick={() => handleMultipleSelectFeedback(question.id)}
                    className="w-full mt-4"
                    disabled={!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0)}
                  >
                    Submit Answer
                  </Button>
                )}
              </div>
            )}

            {question.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-4 lg:gap-6">
                {[true, false].map((value) => {
                  const isSelected = userAnswer === value
                  const isCorrectOption = question.correctAnswer === value
                  const showFeedback = isFeedbackShown && isSelected
                  
                  return (
                    <Card
                      key={String(value)}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? isCorrect !== null && isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-950 ring-2 ring-green-500/20'
                            : isCorrect !== null && !isCorrect
                            ? 'border-red-500 bg-red-50 dark:bg-red-950 ring-2 ring-red-500/20'
                            : 'border-primary bg-primary/10 ring-2 ring-primary/20'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => !isFeedbackShown && handleAnswerSelect(question.id, value)}
                    >
                      <CardContent className="p-6 lg:p-8 text-center">
                        <div className="flex flex-col items-center gap-3">
                          {isSelected && (
                            isCorrect !== null && isCorrect ? (
                              <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
                            ) : isCorrect !== null && !isCorrect ? (
                              <XCircle className="size-8 text-red-600 dark:text-red-400" />
                            ) : null
                          )}
                          <span className="text-xl lg:text-2xl font-semibold">{value ? 'True' : 'False'}</span>
                          {showFeedback && isCorrectOption && !isSelected && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300">
                              Correct Answer
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {question.type === 'short_answer' && (
              <div className="space-y-4">
                <textarea
                  value={userAnswer !== undefined ? String(userAnswer) : ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-full p-4 border rounded-md min-h-[150px] lg:min-h-[200px] text-sm lg:text-base resize-y"
                  placeholder="Type your answer here..."
                  disabled={isFeedbackShown}
                />
                {!isFeedbackShown && userAnswer !== undefined && String(userAnswer).trim() && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newFeedback = new Map(feedbackRevealed)
                      newFeedback.set(question.id, true)
                      setFeedbackRevealed(newFeedback)
                    }}
                    className="w-full"
                  >
                    Show Answer
                  </Button>
                )}
                {isFeedbackShown && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-md border">
                      <Label className="text-sm font-medium mb-2 block">How did you do?</Label>
                      <RadioGroup
                        value={selfAssessment || ''}
                        onValueChange={(value) => handleSelfAssessment(question.id, value as 'correct' | 'incorrect' | 'partial')}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="correct" id={`${question.id}-correct`} />
                          <Label htmlFor={`${question.id}-correct`} className="text-green-700 dark:text-green-400 font-normal cursor-pointer">
                            Correct
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="partial" id={`${question.id}-partial`} />
                          <Label htmlFor={`${question.id}-partial`} className="text-yellow-700 dark:text-yellow-400 font-normal cursor-pointer">
                            Partially Correct
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="incorrect" id={`${question.id}-incorrect`} />
                          <Label htmlFor={`${question.id}-incorrect`} className="text-red-700 dark:text-red-400 font-normal cursor-pointer">
                            Incorrect
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {isFeedbackShown && (
              <Card className="bg-muted/30 border-muted mt-4">
                <CardContent className="p-4 lg:p-6 space-y-3 lg:space-y-4">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <CheckCircle2 className="size-4 lg:size-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-sm lg:text-base">Correct Answer:</span>
                  </div>
                  <p className="text-sm lg:text-base font-medium">{getCorrectAnswerDisplay(question)}</p>
                  <Separator />
                  <div>
                    <span className="font-medium text-sm lg:text-base">Explanation:</span>
                    <p className="text-sm lg:text-base text-muted-foreground mt-2 lg:mt-3">{question.explanation}</p>
                  </div>
                  {question.sourceReference && (
                    <div className="flex items-center gap-2 lg:gap-3 mt-3 lg:mt-4">
                      <BookOpen className="size-4 lg:size-5 text-muted-foreground" />
                      <span className="text-xs lg:text-sm text-muted-foreground">
                        Source: {question.sourceReference.name}
                        {question.sourceReference.url && (
                          <a
                            href={question.sourceReference.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            View <ExternalLink className="size-3 lg:size-4" />
                          </a>
                        )}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Next Button */}
            {isFeedbackShown && (
              <Button
                onClick={goToNextQuestion}
                className="w-full h-12 text-base lg:text-lg"
                size="lg"
                disabled={question.type === 'short_answer' && !selfAssessment}
              >
                {currentQuestionIndex < data.questions.length - 1 ? (
                  <>
                    Next Question
                    <ArrowRight className="ml-2 size-5" />
                  </>
                ) : (
                  <>
                    View Results
                    <ArrowRight className="ml-2 size-5" />
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Save quiz attempt to history
  useEffect(() => {
    if (viewMode === 'results' && artifactId && !attemptSaved && startTime) {
      const saveAttempt = async () => {
        try {
          const timeTaken = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
          
          // Convert Maps to plain objects for JSON serialization
          const userAnswersObj: Record<string, any> = {}
          userAnswers.forEach((value, key) => {
            userAnswersObj[key] = Array.isArray(value) ? value : value
          })
          
          const selfAssessmentsObj: Record<string, string> = {}
          selfAssessments.forEach((value, key) => {
            selfAssessmentsObj[key] = value
          })
          
          const response = await fetch('/api/quiz-attempts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              artifact_id: artifactId,
              quiz_data: data,
              user_answers: userAnswersObj,
              self_assessments: selfAssessmentsObj,
              time_taken_seconds: timeTaken,
              started_at: startTime.toISOString(),
            }),
          })
          
          if (response.ok) {
            setAttemptSaved(true)
          } else {
            console.error('Failed to save quiz attempt')
          }
        } catch (error) {
          console.error('Error saving quiz attempt:', error)
        }
      }
      
      saveAttempt()
    }
  }, [viewMode, artifactId, attemptSaved, startTime, data, userAnswers, selfAssessments])

  // Render Results Screen
  const renderResultsScreen = () => {
    const correct = calculateScore()
    const total = data.questions.length
    const percent = Math.round((correct / total) * 100)

    return (
      <div className="w-full max-w-full mx-auto py-4 lg:py-6">
        <Card className="mb-6 lg:mb-8">
          <CardContent className="p-6 lg:p-10">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8 items-center">
              {/* Left Side: Text and Actions */}
              <div className="flex flex-col items-start text-left space-y-6">
                <div className="space-y-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    percent >= 80 ? 'bg-green-100 dark:bg-green-900' : percent >= 60 ? 'bg-yellow-100 dark:bg-yellow-900' : 'bg-red-100 dark:bg-red-900'
                  }`}>
                    {percent >= 80 ? (
                      <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="size-8 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Quiz Complete!</h2>
                    <p className="text-lg lg:text-xl text-muted-foreground">
                      You got <span className="font-semibold text-foreground">{correct} out of {total}</span> questions correct ({percent}%)
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <Button
                    onClick={startQuiz}
                    variant="outline"
                    size="lg"
                    className="h-12 text-base lg:text-lg px-8"
                  >
                    <RotateCcw className="mr-2 size-5" />
                    Retake Quiz
                  </Button>
                </div>
              </div>

              {/* Right Side: Radial Chart */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-full max-w-[280px]">
                  <QuizResultsRadial correct={correct} total={total} minimal />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Correct answers shown in light green; wrong in light red
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Compact view: Show only summary card with button
  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="size-5" />
                {data.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 flex-wrap">
                <span>{data.totalQuestions} Questions</span>
                <Badge className={getDifficultyColor(data.difficulty)}>
                  {data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1)}
                </Badge>
                {data.metadata?.estimatedTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" />
                    ~{data.metadata.estimatedTime} min
                  </span>
                )}
              </CardDescription>
            </div>
            {onSaveClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveClick}
                className="flex items-center gap-2"
              >
                <Save className="size-4" />
                Save to Artifactory
              </Button>
            )}
          </div>
        </CardHeader>
        {data.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{data.description}</p>
          </CardContent>
        )}
        {data.topics.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Topics:</span>
              {data.topics.map((topic, i) => (
                <Badge key={i} variant="outline">{topic}</Badge>
              ))}
            </div>
          </CardContent>
        )}
        <CardContent>
          <Button
            onClick={onViewFull}
            className="w-full sm:w-auto"
            size="lg"
          >
            <Maximize2 className="size-4 mr-2" />
            View Full Quiz
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Full view: Show complete quiz interface optimized for larger screens
  // Handle different view modes
  if (viewMode === 'welcome') {
    return renderWelcomeScreen()
  }

  if (viewMode === 'step-by-step') {
    return renderStepByStepView()
  }

  if (viewMode === 'results') {
    return (
      <>
        {renderResultsScreen()}
        {renderReviewMode()}
      </>
    )
  }

  // Review mode (original tabbed view)
  function renderReviewMode() {
    return (
      <div className="w-full space-y-4 lg:space-y-6 mt-8">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4 lg:pb-6">
          <CardTitle className="flex items-center gap-2 text-xl lg:text-2xl">
            <FileQuestion className="size-5 lg:size-6" />
            {data.title}
          </CardTitle>
          <CardDescription className="flex items-center gap-4 flex-wrap text-sm lg:text-base mt-2">
            <span>{data.totalQuestions} Questions</span>
            <Badge className={getDifficultyColor(data.difficulty)}>
              {data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1)}
            </Badge>
            {data.metadata?.estimatedTime && (
              <span className="flex items-center gap-1">
                <Clock className="size-4" />
                ~{data.metadata.estimatedTime} min
              </span>
            )}
          </CardDescription>
        </CardHeader>
        {data.description && (
          <CardContent className="pt-0 pb-4 lg:pb-6">
            <p className="text-sm lg:text-base text-muted-foreground">{data.description}</p>
          </CardContent>
        )}
        {data.topics.length > 0 && (
          <CardContent className="pt-0 pb-4 lg:pb-6">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm lg:text-base font-medium">Topics:</span>
              {data.topics.map((topic, i) => (
                <Badge key={i} variant="outline" className="text-xs lg:text-sm">{topic}</Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-10 lg:h-11 gap-1">
          <TabsTrigger value="all" className="text-sm lg:text-base px-2 lg:px-3">All Questions</TabsTrigger>
          <TabsTrigger value="by-type" className="text-sm lg:text-base px-2 lg:px-3">By Type</TabsTrigger>
          <TabsTrigger value="by-topic" className="text-sm lg:text-base px-2 lg:px-3">By Topic</TabsTrigger>
          <TabsTrigger value="sources" className="text-sm lg:text-base px-2 lg:px-3">Sources</TabsTrigger>
        </TabsList>

        {/* All Questions Tab */}
        <TabsContent value="all" className="space-y-4 lg:space-y-6 mt-4 lg:mt-6">
          {data.questions.map((question) => {
            const isExpanded = expandedQuestions.has(question.id)
            const userAnswer = userAnswers.get(question.id)
            const showAnswer = showAnswers.has(question.id)
            const isCorrect = isAnswerCorrect(question)
            
            return (
              <Card key={question.id} className="transition-all">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors py-4 lg:py-6"
                  onClick={() => toggleQuestion(question.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 lg:mb-3 flex-wrap">
                        <CardTitle className="text-base lg:text-lg">Question {data.questions.indexOf(question) + 1}</CardTitle>
                        <Badge className={`${getQuestionTypeColor(question.type)} text-xs lg:text-sm`} variant="outline">
                          {question.type.replace('_', ' ')}
                        </Badge>
                        {question.topic && (
                          <Badge variant="outline" className="text-xs lg:text-sm">{question.topic}</Badge>
                        )}
                        {userAnswer !== undefined && isCorrect !== null && (
                          isCorrect ? (
                            <CheckCircle2 className="size-5 lg:size-6 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="size-5 lg:size-6 text-red-600 dark:text-red-400" />
                          )
                        )}
                      </div>
                      <CardDescription className="mt-1 text-sm lg:text-base">{question.question}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="space-y-4 lg:space-y-6 pt-0 pb-4 lg:pb-6">
                    {/* Answer Input */}
                    {question.type === 'multiple_choice' && question.options && (
                      <div className="space-y-3 lg:space-y-4">
                        <label className="text-sm lg:text-base font-medium">Select your answer:</label>
                        {question.allowMultiple ? (
                          <div className="space-y-2 lg:space-y-3">
                            {question.options.map((option, index) => {
                              const userArray = Array.isArray(userAnswer) ? userAnswer : (userAnswer !== undefined ? [userAnswer] : [])
                              const isSelected = userArray.includes(index)
                              return (
                                <div
                                  key={index}
                                  className={`flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-md border cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                                      : 'bg-card hover:bg-muted/50'
                                  }`}
                                  onClick={() => handleAnswerChange(question.id, index)}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => handleAnswerChange(question.id, index)}
                                  />
                                  <Label className="text-sm lg:text-base flex-1 cursor-pointer font-normal">
                                    {option}
                                  </Label>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <RadioGroup
                            value={userAnswer !== undefined ? String(userAnswer) : ''}
                            onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))}
                            className="space-y-2 lg:space-y-3"
                          >
                            {question.options.map((option, index) => (
                              <div
                                key={index}
                                className={`flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-md border cursor-pointer transition-colors ${
                                  userAnswer === index
                                    ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                                    : 'bg-card hover:bg-muted/50'
                                }`}
                                onClick={() => handleAnswerChange(question.id, index)}
                              >
                                <RadioGroupItem
                                  value={String(index)}
                                  id={`${question.id}-option-${index}`}
                                />
                                <Label
                                  htmlFor={`${question.id}-option-${index}`}
                                  className="text-sm lg:text-base flex-1 cursor-pointer font-normal"
                                >
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    )}

                    {question.type === 'true_false' && (
                      <div className="space-y-3 lg:space-y-4">
                        <label className="text-sm lg:text-base font-medium">Select your answer:</label>
                        <div className="flex gap-3 lg:gap-4">
                          <Button
                            variant={userAnswer === true ? 'default' : 'outline'}
                            onClick={() => handleAnswerChange(question.id, true)}
                            className="flex-1 h-10 lg:h-12 text-sm lg:text-base"
                          >
                            True
                          </Button>
                          <Button
                            variant={userAnswer === false ? 'default' : 'outline'}
                            onClick={() => handleAnswerChange(question.id, false)}
                            className="flex-1 h-10 lg:h-12 text-sm lg:text-base"
                          >
                            False
                          </Button>
                        </div>
                      </div>
                    )}

                    {question.type === 'short_answer' && (
                      <div className="space-y-3 lg:space-y-4">
                        <label className="text-sm lg:text-base font-medium">Your answer:</label>
                        <textarea
                          value={userAnswer !== undefined ? String(userAnswer) : ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="w-full p-3 lg:p-4 border rounded-md min-h-[120px] lg:min-h-[150px] text-sm lg:text-base resize-y"
                          placeholder="Type your answer here..."
                        />
                      </div>
                    )}

                    {/* Show Answer Button */}
                    <Button
                      variant="outline"
                      onClick={() => toggleShowAnswer(question.id)}
                      className="w-full h-10 lg:h-12 text-sm lg:text-base"
                    >
                      {showAnswer ? 'Hide Answer' : 'Show Answer'}
                    </Button>

                    {/* Answer Display */}
                    {showAnswer && (
                      <Card className="bg-muted/30 border-muted mt-4">
                        <CardContent className="p-4 lg:p-6 space-y-3 lg:space-y-4">
                          <div className="flex items-center gap-2 lg:gap-3">
                            <CheckCircle2 className="size-4 lg:size-5 text-green-600 dark:text-green-400" />
                            <span className="font-medium text-sm lg:text-base">Correct Answer:</span>
                          </div>
                          <p className="text-sm lg:text-base font-medium">{getCorrectAnswerDisplay(question)}</p>
                          {question.type === 'short_answer' && selfAssessments.has(question.id) && (
                            <>
                              <Separator />
                              <div>
                                <span className="font-medium text-sm lg:text-base">Your Self-Assessment:</span>
                                <div className="mt-2">
                                  <Badge 
                                    variant="outline" 
                                    className={
                                      selfAssessments.get(question.id) === 'correct' 
                                        ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300'
                                        : selfAssessments.get(question.id) === 'partial'
                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300'
                                        : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300'
                                    }
                                  >
                                    {selfAssessments.get(question.id) === 'correct' ? 'Correct' : 
                                     selfAssessments.get(question.id) === 'partial' ? 'Partially Correct' : 'Incorrect'}
                                  </Badge>
                                </div>
                              </div>
                            </>
                          )}
                          <Separator />
                          <div>
                            <span className="font-medium text-sm lg:text-base">Explanation:</span>
                            <p className="text-sm lg:text-base text-muted-foreground mt-2 lg:mt-3">{question.explanation}</p>
                          </div>
                          {question.sourceReference && (
                            <div className="flex items-center gap-2 lg:gap-3 mt-3 lg:mt-4">
                              <BookOpen className="size-4 lg:size-5 text-muted-foreground" />
                              <span className="text-xs lg:text-sm text-muted-foreground">
                                Source: {question.sourceReference.name}
                                {question.sourceReference.url && (
                                  <a
                                    href={question.sourceReference.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    View <ExternalLink className="size-3 lg:size-4" />
                                  </a>
                                )}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </TabsContent>

        {/* By Type Tab */}
        <TabsContent value="by-type" className="space-y-4 lg:space-y-6 mt-4 lg:mt-6">
          {Object.entries(questionsByType).map(([type, questions]) => (
            questions.length > 0 && (
              <Card key={type}>
                <CardHeader className="pb-4 lg:pb-6">
                  <CardTitle className="text-base lg:text-lg capitalize">
                    {type.replace('_', ' ')} ({questions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 lg:space-y-4">
                    {questions.map((question) => (
                      <div key={question.id} className="p-3 lg:p-4 border rounded-md">
                        <p className="text-sm lg:text-base font-medium mb-2 lg:mb-3">{question.question}</p>
                        {question.options && (
                          <ul className="list-disc list-inside space-y-1 lg:space-y-2 text-xs lg:text-sm text-muted-foreground">
                            {question.options.map((option, i) => (
                              <li key={i}>{option}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          ))}
        </TabsContent>

        {/* By Topic Tab */}
        <TabsContent value="by-topic" className="space-y-4 lg:space-y-6 mt-4 lg:mt-6">
          {Object.entries(questionsByTopic).map(([topic, questions]) => (
            <Card key={topic}>
              <CardHeader className="pb-4 lg:pb-6">
                <CardTitle className="text-base lg:text-lg">{topic} ({questions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 lg:space-y-4">
                  {questions.map((question) => (
                    <div key={question.id} className="p-3 lg:p-4 border rounded-md">
                      <p className="text-sm lg:text-base font-medium mb-2 lg:mb-3">{question.question}</p>
                      <Badge className={`${getQuestionTypeColor(question.type)} text-xs lg:text-sm`} variant="outline">
                        {question.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-3 lg:space-y-4 mt-4 lg:mt-6">
          {data.metadata?.sourcesUsed && data.metadata.sourcesUsed.length > 0 ? (
            <Card>
              <CardHeader className="pb-4 lg:pb-6">
                <CardTitle className="text-base lg:text-lg">Sources Used</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 lg:space-y-3">
                  {data.metadata.sourcesUsed.map((source, i) => (
                    <li key={i} className="text-sm lg:text-base text-muted-foreground">{source}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 lg:py-12 text-center text-sm lg:text-base text-muted-foreground">
                No source information available
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    )
  }

  // Default to review mode if viewMode is 'review'
  return renderReviewMode()
}
