'use client'

import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { formatDate, formatTime } from '../utils'
import type { ChatSession } from '../types'

interface ChatHeaderProps {
  currentSession: ChatSession | null
  titleGenerating: boolean
  status: string
  onHistoryClick: () => void
}

export function ChatHeader({ currentSession, titleGenerating, status, onHistoryClick }: ChatHeaderProps) {
  return (
    <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: History Button and Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onHistoryClick}
                aria-label="Open conversation history"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Conversation History</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Chat Title */}
          <div className="flex-1 min-w-0">
            {titleGenerating ? (
              <Skeleton className="h-5 w-48" />
            ) : (status === 'streaming' || status === 'submitted') && currentSession?.id ? (
              <Shimmer as="h2" duration={1} className="text-lg font-semibold truncate">
                {currentSession.title}
              </Shimmer>
            ) : (
              <h2 className="text-lg font-semibold truncate">
                {currentSession?.title || 'New Chat'}
              </h2>
            )}
          </div>
        </div>

        {/* Right: Metadata */}
        {currentSession && (
          <div className="flex items-center gap-4 text-sm text-slate-500 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <span>{formatDate(currentSession.lastMessage)}</span>
              <span>•</span>
              <span>{formatTime(currentSession.lastMessage)}</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span>
                {currentSession.messages?.length || 0} {(currentSession.messages?.length || 0) === 1 ? 'message' : 'messages'}
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <span>•</span>
              <span>
                Created {currentSession.created_at.toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
