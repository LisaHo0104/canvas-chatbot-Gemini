'use client'

import { useState } from 'react'
import { FileQuestion, CheckCircle2, XCircle, BookOpen, Clock, ExternalLink, Maximize2, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

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
    correctAnswer: string | number | boolean
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

interface QuizUIProps {
  data: QuizOutput
  messageId?: string
  compact?: boolean
  onViewFull?: () => void
  onSaveClick?: () => void
}

export function QuizUI({ data, messageId, compact = false, onViewFull, onSaveClick }: QuizUIProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())
  const [userAnswers, setUserAnswers] = useState<Map<string, string | number | boolean>>(new Map())
  const [showAnswers, setShowAnswers] = useState<Map<string, boolean>>(new Map())

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
    const newAnswers = new Map(userAnswers)
    newAnswers.set(questionId, answer)
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
      return userAnswer === question.correctAnswer
    } else if (question.type === 'true_false') {
      return userAnswer === question.correctAnswer
    } else if (question.type === 'short_answer') {
      // For short answer, we'll just show the answer without strict checking
      return null
    }
    return null
  }

  const getCorrectAnswerDisplay = (question: QuizOutput['questions'][0]): string => {
    if (question.type === 'multiple_choice' && question.options) {
      const index = typeof question.correctAnswer === 'number' ? question.correctAnswer : 0
      return question.options[index] || String(question.correctAnswer)
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
  return (
    <div className="w-full space-y-4 lg:space-y-6">
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
                        <Badge className={getQuestionTypeColor(question.type)} variant="outline" className="text-xs lg:text-sm">
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
                        <div className="space-y-2 lg:space-y-3">
                          {question.options.map((option, index) => (
                            <label
                              key={index}
                              className={`flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-md border cursor-pointer transition-colors ${
                                userAnswer === index
                                  ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                                  : 'bg-card hover:bg-muted/50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={index}
                                checked={userAnswer === index}
                                onChange={() => handleAnswerChange(question.id, index)}
                                className="rounded border-gray-300 dark:border-gray-600 size-4 lg:size-5"
                              />
                              <span className="text-sm lg:text-base flex-1">{option}</span>
                            </label>
                          ))}
                        </div>
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
                      <div className="p-4 lg:p-6 bg-muted/30 rounded-md border border-muted space-y-3 lg:space-y-4">
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
                      </div>
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
                      <Badge className={getQuestionTypeColor(question.type)} variant="outline" className="text-xs lg:text-sm">
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
