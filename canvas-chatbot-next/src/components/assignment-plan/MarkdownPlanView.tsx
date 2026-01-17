'use client'

import { MessageResponse } from '@/components/ai-elements/message'

interface MarkdownPlanViewProps {
  content: string
  onEdit?: () => void
}

export function MarkdownPlanView({ content, onEdit }: MarkdownPlanViewProps) {
  return (
    <div className="w-full space-y-4">
      {onEdit && (
        <div className="flex justify-end">
          <button
            onClick={onEdit}
            className="text-sm text-primary hover:underline"
          >
            Edit Markdown
          </button>
        </div>
      )}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
          {content}
        </MessageResponse>
      </div>
    </div>
  )
}
