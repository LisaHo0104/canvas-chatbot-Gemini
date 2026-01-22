'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, X } from 'lucide-react'
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

export default function StudyPlanTimelinePage() {
  const router = useRouter()
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

  const formatPeriod = (item: TimelineEvent) => {
    if (item.periodType === "Q") {
      return `Q${item.periodNumber} ${item.year}`;
    } else if (item.periodType === "H") {
      return `H${item.periodNumber} ${item.year}`;
    }
    return `${item.year}`;
  }

  // If no event is selected, show timeline only
  if (!selectedEvent) {
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
          <VerticalEventTimeline onCardClick={handleCardClick} />
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
