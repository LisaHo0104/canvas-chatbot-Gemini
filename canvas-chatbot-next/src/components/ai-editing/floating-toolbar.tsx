'use client'

import { useEffect, useRef, useState } from 'react'
import { EditingToolbar, type EditOperation } from './editing-toolbar'
import { cn } from '@/lib/utils'

interface FloatingToolbarProps {
  selection: { text: string; range: Range | null; bounds: DOMRect | null }
  onOperation: (operation: EditOperation) => void
  onClose: () => void
  disabled?: boolean
}

export function FloatingToolbar({ selection, onOperation, onClose, disabled = false }: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!selection.bounds || !toolbarRef.current) {
      return
    }

    const updatePosition = () => {
      if (!selection.bounds || !toolbarRef.current) return

      const toolbarHeight = toolbarRef.current.offsetHeight
      const toolbarWidth = toolbarRef.current.offsetWidth
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      // Position above the selection
      let top = selection.bounds.top + scrollY - toolbarHeight - 8
      let left = selection.bounds.left + scrollX + (selection.bounds.width / 2) - (toolbarWidth / 2)

      // Ensure toolbar stays within viewport
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Adjust horizontal position if it goes off screen
      if (left < scrollX + 8) {
        left = scrollX + 8
      } else if (left + toolbarWidth > scrollX + viewportWidth - 8) {
        left = scrollX + viewportWidth - toolbarWidth - 8
      }

      // If there's not enough space above, position below
      if (top < scrollY + 8) {
        top = selection.bounds.bottom + scrollY + 8
      }

      setPosition({ top, left })
    }

    updatePosition()

    // Update position on scroll and resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [selection.bounds])

  if (!selection.bounds || !selection.text) {
    return null
  }

  return (
    <div
      ref={toolbarRef}
      className={cn(
        'fixed z-50 transition-opacity duration-200',
        'animate-in fade-in slide-in-from-bottom-2'
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <EditingToolbar
        onOperation={onOperation}
        disabled={disabled}
      />
    </div>
  )
}
