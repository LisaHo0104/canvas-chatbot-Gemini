'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, X } from 'lucide-react'
import VerticalEventTimeline from '@/components/vertical-event-timeline'
import { ResizableSplitPane } from '@/components/ui/resizable-split-pane'
import { Editor } from '@/components/blocks/editor-00/editor'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChat } from '@ai-sdk/react'
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation'
import { Message as AIMessage, MessageContent as AIMessageContent, MessageResponse } from '@/components/ai-elements/message'
import { PromptInput, PromptInputProvider, PromptInputBody, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from '@/components/ai-elements/prompt-input'
import type { TimelineEvent } from '@/types/events'

export default function StudyPlanTimelinePage() {
  const router = useRouter()
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)

  // Chat functionality
  const { messages, input = '', handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  })

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
                    <div className="p-4 border-b flex-shrink-0">
                      <h2 className="text-lg font-semibold">AI Chat</h2>
                      <p className="text-sm text-muted-foreground">Ask questions about your study plan</p>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                      <Conversation className="flex-1 min-h-0">
                        <ConversationContent className="h-full">
                          {messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-center p-8">
                              <div>
                                <p className="text-muted-foreground mb-2">Start a conversation</p>
                                <p className="text-sm text-muted-foreground">Ask about your timeline, milestones, or study plan</p>
                              </div>
                            </div>
                          ) : (
                            <ScrollArea className="h-full">
                              <div className="p-4 space-y-4">
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
                              </div>
                            </ScrollArea>
                          )}
                        </ConversationContent>
                      </Conversation>
                      <div className="border-t p-4 flex-shrink-0">
                        <PromptInputProvider>
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault()
                              if (input.trim()) {
                                handleSubmit(e)
                              }
                            }} 
                            className="w-full"
                          >
                            <PromptInputBody>
                              <PromptInputTextarea
                                value={input || ''}
                                onChange={(e) => handleInputChange(e)}
                                placeholder="Ask about your study plan..."
                                disabled={isLoading}
                              />
                            </PromptInputBody>
                            <PromptInputFooter>
                              <PromptInputSubmit disabled={isLoading || !(input || '').trim()}>
                                Send
                              </PromptInputSubmit>
                            </PromptInputFooter>
                          </form>
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
