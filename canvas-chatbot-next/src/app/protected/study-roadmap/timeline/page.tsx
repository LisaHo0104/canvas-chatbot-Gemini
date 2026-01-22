'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, X, Loader2 } from 'lucide-react'
import VerticalEventTimeline from '@/components/vertical-event-timeline'
import { ResizableSplitPane } from '@/components/ui/resizable-split-pane'
import { Editor } from '@/components/blocks/editor-00/editor'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChat } from '@ai-sdk/react'
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { Message as AIMessage, MessageContent as AIMessageContent, MessageResponse } from '@/components/ai-elements/message'
import { PromptInput, PromptInputProvider, PromptInputHeader, PromptInputBody, PromptInputTextarea, PromptInputFooter, PromptInputTools, PromptInputActionMenu, PromptInputActionMenuTrigger, PromptInputActionMenuContent, PromptInputActionAddAttachments, PromptInputSubmit } from '@/components/ai-elements/prompt-input'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { SparklesIcon } from 'lucide-react'
import type { TimelineEvent } from '@/types/events'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import Breadcrumbs from '@/components/Breadcrumbs'
import { StudyRoadmapProgress } from '@/components/StudyRoadmapProgress'

interface StudyPlanData {
  id: string
  course_id: number
  course_name: string
  generated_plan: {
    timeline: Array<{
      period: string
      startDate: string
      endDate: string
      events: Array<{
        title: string
        type: string
        date: string
        duration?: string
        dueDate?: string
        points?: number
        description: string
        isChecked: boolean
      }>
    }>
    summary: {
      totalWeeks: number
      totalStudyHours: number
      totalAssignments: number
      keyMilestones: string[]
    }
  }
  progress: {
    completedEvents?: string[]
  }
}

export default function StudyPlanTimelinePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('planId')
  const [studyPlan, setStudyPlan] = useState<StudyPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [suggestionsVisible, setSuggestionsVisible] = useState(true)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Chat functionality
  const { messages, input = '', handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',
  })

  // Adapter function to convert PromptInput format to useChat format
  const onSubmitAI = async (message: { text: string; files?: any[] }) => {
    if (!message.text?.trim()) return
    await append({
      role: 'user',
      content: message.text,
    })
  }

  // Simple suggestions for timeline page
  const staticSuggestions = [
    'Show my current courses',
    'List upcoming deadlines',
    'Summarize latest Canvas announcements',
    'What modules need attention this week?'
  ]

  const regenerateSuggestions = async () => {
    // Simple implementation - can be enhanced later
    setLoadingSuggestions(true)
    setTimeout(() => {
      setLoadingSuggestions(false)
    }, 500)
  }

  const handleBack = () => {
    router.back()
  }

  const handleCardClick = (event: TimelineEvent, index: number) => {
    setSelectedEvent(event)
  }

  const handleCloseEditor = () => {
    setSelectedEvent(null)
  }

  // Fetch study plan data
  useEffect(() => {
    if (!planId) {
      setError('No study plan ID provided')
      setLoading(false)
      return
    }

    const fetchStudyPlan = async () => {
      try {
        // Check if this is a mock plan
        const isMock = searchParams.get('mock') === 'true'
        
        if (isMock && typeof window !== 'undefined') {
          // Use mock data from sessionStorage
          const mockData = sessionStorage.getItem('mockStudyPlan')
          if (mockData) {
            const parsed = JSON.parse(mockData)
            setStudyPlan(parsed)
            setLoading(false)
            return
          }
        }

        // Fetch real study plan from API
        const response = await fetch(`/api/study-plan/${planId}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch study plan')
        }

        const data = await response.json()
        setStudyPlan(data.studyPlan)
      } catch (err) {
        console.error('Error fetching study plan:', err)
        setError(err instanceof Error ? err.message : 'Failed to load study plan')
      } finally {
        setLoading(false)
      }
    }

    fetchStudyPlan()
  }, [planId, searchParams])

  const formatPeriod = (item: TimelineEvent) => {
    if (item.periodType === "Q") {
      return `Q${item.periodNumber} ${item.year}`;
    } else if (item.periodType === "H") {
      return `H${item.periodNumber} ${item.year}`;
    }
    return `${item.year}`;
  }

  // Convert study plan data to timeline events format
  const convertToTimelineEvents = (plan: StudyPlanData): TimelineEvent[] => {
    if (!plan?.generated_plan?.timeline) return []
    
    return plan.generated_plan.timeline.map((period, index) => {
      const startDate = new Date(period.startDate)
      const year = startDate.getFullYear()
      const month = startDate.getMonth()
      
      // Determine period type (simplified - using month-based quarters)
      const quarter = Math.floor(month / 3) + 1
      const periodType = "Q"
      const periodNumber = quarter
      
      // Check completion status
      const completedEvents = plan.progress?.completedEvents || []
      const allEventsCompleted = period.events.every(event => 
        completedEvents.includes(`${period.period}-${event.title}`)
      )
      
      return {
        year,
        periodType,
        periodNumber,
        isChecked: allEventsCompleted,
        events: period.events.map(event => ({
          title: event.title,
          isChecked: completedEvents.includes(`${period.period}-${event.title}`),
          type: event.type,
          date: event.date,
          dueDate: event.dueDate,
          points: event.points,
          description: event.description,
          duration: event.duration,
        })),
      }
    })
  }

  // Handle event toggle (mark as complete/incomplete)
  const handleEventToggle = async (periodIndex: number, eventIndex: number, isChecked: boolean) => {
    if (!studyPlan) return

    const period = studyPlan.generated_plan.timeline[periodIndex]
    const event = period.events[eventIndex]
    const eventKey = `${period.period}-${event.title}`
    
    const completedEvents = studyPlan.progress?.completedEvents || []
    let updatedCompletedEvents: string[]
    
    if (isChecked) {
      updatedCompletedEvents = [...completedEvents, eventKey]
    } else {
      updatedCompletedEvents = completedEvents.filter(key => key !== eventKey)
    }

    const updatedProgress = {
      ...studyPlan.progress,
      completedEvents: updatedCompletedEvents,
    }

    // Optimistically update UI
    setStudyPlan({
      ...studyPlan,
      progress: updatedProgress,
    })

    // Update in database
    try {
      const response = await fetch(`/api/study-plan/${studyPlan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ progress: updatedProgress }),
      })

      if (!response.ok) {
        throw new Error('Failed to update progress')
      }
    } catch (error) {
      console.error('Error updating progress:', error)
      // Revert on error
      setStudyPlan(studyPlan)
      alert('Failed to update progress. Please try again.')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3rem)] w-full">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading study plan...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !studyPlan) {
    return (
      <div className="min-h-[calc(100vh-3rem)] w-full">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error || 'Study plan not found'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const timelineEvents = convertToTimelineEvents(studyPlan)

  // If no event is selected, show timeline only
  if (!selectedEvent) {
    return (
      <div className="min-h-[calc(100vh-3rem)] w-full">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Breadcrumbs />
          <StudyRoadmapProgress currentStep="timeline" />
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="mb-2">
              <h1 className="text-2xl font-bold">{studyPlan.course_name}</h1>
              <p className="text-sm text-muted-foreground">
                {studyPlan.generated_plan.summary.totalWeeks} weeks • {studyPlan.generated_plan.summary.totalStudyHours} hours
              </p>
            </div>
          </div>
          <VerticalEventTimeline 
            events={timelineEvents}
            onCardClick={handleCardClick}
            onEventToggle={handleEventToggle}
          />
        </div>
      </div>
    )
  }

  // Show split screen when event is selected
  return (
    <div className="min-h-[calc(100vh-3rem)] w-full px-4 py-6">
      <div className="max-w-7xl mx-auto w-full h-[calc(100vh-6rem)]">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="flex w-full relative h-full">
          <ResizableSplitPane
            defaultSplit={50}
            minLeft={20}
            maxLeft={80}
            minRight={20}
            maxRight={80}
            left={
              <div className="h-full flex flex-col bg-background border rounded-lg overflow-hidden">
                <div className="p-4 border-b flex-shrink-0">
                  <h2 className="text-lg font-semibold">Project Timeline</h2>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <VerticalEventTimeline onCardClick={handleCardClick} />
                    </div>
                  </ScrollArea>
                </div>
              </div>
            }
            right={
              <ResizableSplitPane
                defaultSplit={60}
                minLeft={30}
                maxLeft={80}
                minRight={20}
                maxRight={70}
                left={
                  <div className="h-full flex flex-col bg-background rounded-lg overflow-hidden">
                    <div className="p-4 border-b flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">
                          {selectedEvent.year} Milestones - {formatPeriod(selectedEvent)}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedEvent.periodType === "Q"
                            ? `Quarter ${selectedEvent.periodNumber}`
                            : `Half ${selectedEvent.periodNumber}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCloseEditor}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <div className="h-full flex flex-col bg-background relative">
                        <div className="h-full flex flex-col">
                          <div id="radix-content-editor" className="h-full flex flex-col p-6">
                            <Editor />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
                right={
                  <div className="h-full flex flex-col bg-background rounded-lg overflow-hidden border-l">
                    <div className="flex-1 flex flex-col min-h-0 overflow-x-hidden">
                      <Conversation className="h-full relative">
                        <ConversationContent className="chat-content relative">
                          {/* Sticky Header */}
                          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                            <div className="px-4 py-3 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <h2 className="text-lg font-semibold">AI Chat</h2>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Ask questions about your study plan
                              </div>
                            </div>
                          </div>
                          {messages.length === 0 ? (
                            <div className="max-w-3xl mx-auto text-center py-16">
                              <div className="mx-auto w-full max-w-md">
                                <img src="/dog_chat.png" alt="Lulu chat assistant illustration" className="w-full h-auto" />
                              </div>
                              <h2 className="text-2xl font-semibold text-slate-900 mb-2">Start a conversation</h2>
                              <p className="text-slate-600 mb-8">Ask about your timeline, milestones, or study plan</p>
                            </div>
                          ) : (
                            <>
                              {messages.map((message) => (
                                <AIMessage key={message.id} from={message.role}>
                                  <AIMessageContent>
                                    <MessageResponse>{message.content}</MessageResponse>
                                  </AIMessageContent>
                                </AIMessage>
                              ))}
                              {isLoading && (
                                <AIMessage from="assistant">
                                  <AIMessageContent>
                                    <MessageResponse>Thinking...</MessageResponse>
                                  </AIMessageContent>
                                </AIMessage>
                              )}
                            </>
                          )}
                        </ConversationContent>
                        <ConversationScrollButton />
                      </Conversation>
                      <div className="grid shrink-0 gap-2 border-t border-slate-200">
                        <PromptInputProvider>
                          <Suggestions className="px-4 pt-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  aria-label="Generate suggestions" 
                                  variant="outline" 
                                  size="icon" 
                                  type="button" 
                                  onClick={regenerateSuggestions} 
                                  disabled={isLoading || loadingSuggestions}
                                >
                                  <SparklesIcon className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Generate suggestions</TooltipContent>
                            </Tooltip>
                            {suggestionsVisible && (
                              loadingSuggestions ? (
                                <div className="flex gap-2">
                                  <Skeleton className="h-8 w-40 rounded-full" />
                                  <Skeleton className="h-8 w-32 rounded-full" />
                                  <Skeleton className="h-8 w-48 rounded-full" />
                                  <Skeleton className="h-8 w-36 rounded-full" />
                                </div>
                              ) : (
                                staticSuggestions.map((s, i) => (
                                  <Suggestion 
                                    key={`${s}-${i}`} 
                                    suggestion={s} 
                                    disabled={isLoading} 
                                    onClick={() => { onSubmitAI({ text: s }) }} 
                                  />
                                ))
                              )
                            )}
                          </Suggestions>
                          <PromptInput
                            className="px-4 pb-4 w-full"
                            globalDrop
                            multiple
                            accept="application/pdf,image/*"
                            maxFiles={4}
                            maxFileSize={10 * 1024 * 1024}
                            onSubmit={onSubmitAI}
                          >
                            <PromptInputHeader />
                            <PromptInputBody>
                              <PromptInputTextarea 
                                ref={textareaRef} 
                                placeholder="Ask about your study plan..." 
                                className="w-full" 
                              />
                            </PromptInputBody>
                            <PromptInputFooter>
                              <PromptInputTools className="flex flex-wrap md:flex-nowrap gap-1">
                                <PromptInputActionMenu>
                                  <PromptInputActionMenuTrigger />
                                  <PromptInputActionMenuContent>
                                    <PromptInputActionAddAttachments />
                                  </PromptInputActionMenuContent>
                                </PromptInputActionMenu>
                              </PromptInputTools>
                              <PromptInputSubmit status={isLoading ? 'streaming' : 'ready'} />
                            </PromptInputFooter>
                          </PromptInput>
                        </PromptInputProvider>
                      </div>
                    </div>
                  </div>
                }
              />
            }
          />
        </div>
      </div>
    </div>
  )
}
