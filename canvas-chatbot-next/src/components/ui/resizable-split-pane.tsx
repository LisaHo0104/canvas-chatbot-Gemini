'use client'

import { useState, useRef, useEffect, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResizableSplitPaneProps {
  left: ReactNode
  right: ReactNode
  defaultSplit?: number // 0-100, percentage for left panel
  minLeft?: number // minimum percentage for left panel
  maxLeft?: number // maximum percentage for left panel
  minRight?: number // minimum percentage for right panel
  maxRight?: number // maximum percentage for right panel
  className?: string
}

export function ResizableSplitPane({
  left,
  right,
  defaultSplit = 50,
  minLeft = 20,
  maxLeft = 80,
  minRight = 20,
  maxRight = 80,
  className,
}: ResizableSplitPaneProps) {
  const [splitRatio, setSplitRatio] = useState(defaultSplit)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - containerRect.left
      const containerWidth = containerRect.width
      const newRatio = (mouseX / containerWidth) * 100

      // Apply constraints
      const constrainedRatio = Math.max(
        minLeft,
        Math.min(maxLeft, newRatio)
      )

      setSplitRatio(constrainedRatio)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, minLeft, maxLeft])

  return (
    <div
      ref={containerRef}
      className={cn('flex h-full w-full relative', className)}
    >
      {/* Left Panel */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ width: `${splitRatio}%` }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        ref={dividerRef}
        onMouseDown={handleMouseDown}
        className={cn(
          'w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors flex-shrink-0 relative',
          isDragging && 'bg-primary'
        )}
        style={{ userSelect: 'none' }}
      >
        {/* Invisible wider hit area for easier dragging */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 -z-10" />
      </div>

      {/* Right Panel */}
      <div
        className="flex-1 overflow-hidden min-w-0"
        style={{ width: `${100 - splitRatio}%` }}
      >
        {right}
      </div>
    </div>
  )
}
