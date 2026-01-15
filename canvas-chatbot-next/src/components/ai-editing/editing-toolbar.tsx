'use client'

import { Button } from '@/components/ui/button'
import { Sparkles, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export type EditOperation = 'regenerate' | 'expand' | 'simplify' | 'rephrase'

interface EditingToolbarProps {
  onOperation: (operation: EditOperation) => void
  disabled?: boolean
  className?: string
}

export function EditingToolbar({ onOperation, disabled = false, className }: EditingToolbarProps) {
  return (
    <div className={cn('flex items-center gap-1 bg-background border rounded-md shadow-lg p-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onOperation('regenerate')}
        disabled={disabled}
        className="h-8 px-3 text-xs"
        title="Regenerate with AI"
      >
        <Sparkles className="size-3 mr-1.5" />
        Regenerate
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onOperation('expand')}
        disabled={disabled}
        className="h-8 px-3 text-xs"
        title="Expand"
      >
        <ArrowUp className="size-3 mr-1.5" />
        Expand
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onOperation('simplify')}
        disabled={disabled}
        className="h-8 px-3 text-xs"
        title="Simplify"
      >
        <ArrowDown className="size-3 mr-1.5" />
        Simplify
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onOperation('rephrase')}
        disabled={disabled}
        className="h-8 px-3 text-xs"
        title="Rephrase"
      >
        <RefreshCw className="size-3 mr-1.5" />
        Rephrase
      </Button>
    </div>
  )
}
