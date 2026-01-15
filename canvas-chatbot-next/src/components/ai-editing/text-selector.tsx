'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'

interface TextSelectorProps {
  children: ReactNode
  onSelectionChange?: (selection: { text: string; range: Range | null; bounds: DOMRect | null }) => void
  enabled?: boolean
}

export function TextSelector({ children, onSelectionChange, enabled = true }: TextSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<{ text: string; range: Range | null; bounds: DOMRect | null } | null>(null)

  useEffect(() => {
    if (!enabled) return

    const handleSelection = () => {
      const windowSelection = window.getSelection()
      if (!windowSelection || windowSelection.rangeCount === 0) {
        if (selection) {
          setSelection(null)
          onSelectionChange?.({ text: '', range: null, bounds: null })
        }
        return
      }

      const range = windowSelection.getRangeAt(0)
      const selectedText = range.toString().trim()

      // Only handle selection if there's actual text selected
      if (selectedText.length === 0) {
        if (selection) {
          setSelection(null)
          onSelectionChange?.({ text: '', range: null, bounds: null })
        }
        return
      }

      // Check if selection is within our container
      if (containerRef.current && containerRef.current.contains(range.commonAncestorContainer)) {
        const bounds = range.getBoundingClientRect()
        const newSelection = { text: selectedText, range: range.cloneRange(), bounds }
        setSelection(newSelection)
        onSelectionChange?.(newSelection)
      } else {
        if (selection) {
          setSelection(null)
          onSelectionChange?.({ text: '', range: null, bounds: null })
        }
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const windowSelection = window.getSelection()
        if (windowSelection) {
          windowSelection.removeAllRanges()
        }
        if (selection) {
          setSelection(null)
          onSelectionChange?.({ text: '', range: null, bounds: null })
        }
      }
    }

    document.addEventListener('selectionchange', handleSelection)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('selectionchange', handleSelection)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [enabled, selection, onSelectionChange])

  return (
    <div ref={containerRef} className="relative">
      {children}
    </div>
  )
}
