'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { ExternalLink, FileText, ChevronLeft, ChevronRight, Video, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CanvasPage {
  title: string
  body: string
  url: string
}

interface PageContentsProps {
  pages: CanvasPage[]
}

// Helper function to determine icon and color based on page title
function getPageIcon(title: string): { icon: typeof FileText; color: string } {
  const lowerTitle = title.toLowerCase()
  // Check for video-related keywords or emoji
  if (lowerTitle.includes('video') || title.includes('🎥')) {
    return { icon: Video, color: 'text-blue-500 dark:text-blue-400' }
  }
  // Check for important/keywords or star emoji
  if (lowerTitle.includes('important') || title.includes('🌟') || title.includes('⭐')) {
    return { icon: Star, color: 'text-amber-500 dark:text-amber-400' }
  }
  // Default to FileText for all other pages
  return { icon: FileText, color: 'text-muted-foreground' }
}

// Helper function to remove emoji from title
function removeEmoji(text: string): string {
  // Remove common emoji patterns: 📝, 🎥, 🌟, ⭐, etc.
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emoticons, symbols, pictographs
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Miscellaneous symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
    .trim()
}

// PageCard component (inline for simplicity)
function PageCard({
  page,
  index,
  onClick,
}: {
  page: CanvasPage
  index: number
  onClick: () => void
}) {
  const { icon: Icon, color } = getPageIcon(page.title)
  const displayTitle = removeEmoji(page.title)
  const truncateTitle = (title: string, maxLength: number = 40) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  return (
    <Card
      className={cn(
        'h-auto cursor-pointer transition-all duration-200',
        'hover:bg-accent/50 hover:border-border',
        'border border-border bg-card'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label={`Open ${page.title}`}
    >
      <CardContent className="p-4 flex flex-col items-start gap-3">
        <div className="flex items-center gap-3 w-full">
          <Icon className={cn('w-5 h-5 flex-shrink-0', color)} />
          <h3 className="text-sm font-semibold leading-tight line-clamp-2 flex-1">
            {truncateTitle(displayTitle)}
          </h3>
        </div>
      </CardContent>
    </Card>
  )
}

export function PageContents({ pages }: PageContentsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPageIndex, setCurrentPageIndex] = useState(0)

  const handleOpenModal = (index: number) => {
    setCurrentPageIndex(index)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handlePrev = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!isModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentPageIndex > 0) {
          setCurrentPageIndex(currentPageIndex - 1)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (currentPageIndex < pages.length - 1) {
          setCurrentPageIndex(currentPageIndex + 1)
        }
      }
      // Escape is handled by Dialog component
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, currentPageIndex, pages.length])

  if (!pages || pages.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-4">
        No pages found.
      </div>
    )
  }

  const currentPage = pages[currentPageIndex]
  const isFirstPage = currentPageIndex === 0
  const isLastPage = currentPageIndex === pages.length - 1

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Pages</h2>
        <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium">
          {pages.length} {pages.length === 1 ? 'page' : 'pages'}
        </Badge>
      </div>

      {/* Page Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pages.map((page, index) => (
          <PageCard
            key={index}
            page={page}
            index={index}
            onClick={() => handleOpenModal(index)}
          />
        ))}
      </div>

      {/* Large Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            // Mobile: full screen
            'w-full h-full max-w-full max-h-full',
            // Desktop: large centered modal
            'sm:max-w-6xl sm:w-[90vw] sm:h-[90vh] sm:max-h-[90vh]',
            'flex flex-col p-0 gap-0',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            // Override default DialogContent positioning for mobile
            'sm:translate-x-[-50%] sm:translate-y-[-50%] sm:top-[50%] sm:left-[50%]',
            'top-0 left-0 translate-x-0 translate-y-0'
          )}
        >
          {/* Modal Header */}
          <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-xl font-semibold leading-tight pr-4 flex-1">
                {currentPage?.title}
              </DialogTitle>
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* External Link Button */}
                <Button variant="outline" size="sm" asChild className="h-9">
                  <a
                    href={currentPage?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                    aria-label={`Open ${currentPage?.title} in Canvas`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Open in Canvas</span>
                  </a>
                </Button>
                {/* Navigation Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrev}
                    disabled={isFirstPage}
                    className="h-9 w-9"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                    Page {currentPageIndex + 1} of {pages.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    disabled={isLastPage}
                    className="h-9 w-9"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                {/* Close Button */}
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          {/* Modal Body - Scrollable Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="px-6 py-6">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none
                    prose-headings:font-semibold prose-headings:text-foreground
                    prose-p:text-foreground prose-p:leading-relaxed
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                    prose-pre:bg-muted prose-pre:border prose-pre:border-border
                    prose-ul:my-4 prose-ol:my-4 prose-li:my-2
                    prose-blockquote:border-l-4 prose-blockquote:border-muted prose-blockquote:pl-4 prose-blockquote:italic"
                  dangerouslySetInnerHTML={{ __html: currentPage?.body || '' }}
                />
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
