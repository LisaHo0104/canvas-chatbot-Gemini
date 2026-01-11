'use client'

import { useState } from 'react'
import { FileText, Copy, Trash2, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SystemPrompt } from './SystemPromptManager'

interface SystemPromptListProps {
  templates: SystemPrompt[]
  userPrompts: SystemPrompt[]
  enabledPromptIds: string[]
  selectedPromptId: string | null
  loading?: boolean
  onPromptSelect: (promptId: string) => void
  onToggleEnabled: (promptId: string, enabled: boolean) => void
  onDeletePrompt: (promptId: string) => void
}

export function SystemPromptList({
  templates,
  userPrompts,
  enabledPromptIds,
  selectedPromptId,
  loading = false,
  onPromptSelect,
  onToggleEnabled,
  onDeletePrompt,
}: SystemPromptListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      return
    }
    setDeletingId(promptId)
    try {
      await onDeletePrompt(promptId)
    } finally {
      setDeletingId(null)
    }
  }

  const isEnabled = (promptId: string) => enabledPromptIds.includes(promptId)
  const isSelected = (promptId: string) => selectedPromptId === promptId

  return (
    <div className="space-y-6">
      {/* Templates Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Templates (System Defaults)</h3>
        </div>
        <div className="space-y-2">
          {loading && templates.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No templates available</p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  isSelected(template.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => onPromptSelect(template.id)}
              >
                <Checkbox
                  checked={isEnabled(template.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    onToggleEnabled(template.id, e.target.checked)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className={`font-medium ${isSelected(template.id) ? 'text-primary' : ''}`}>
                      {template.name}
                    </span>
                    {isSelected(template.id) && (
                      <span className="text-xs text-primary">(editing)</span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Separator />

      {/* User Templates Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Copy className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">My Templates</h3>
        </div>
        <div className="space-y-2">
          {loading && userPrompts.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : userPrompts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No custom prompts yet</p>
          ) : (
            userPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  isSelected(prompt.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => onPromptSelect(prompt.id)}
              >
                <Checkbox
                  checked={isEnabled(prompt.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    onToggleEnabled(prompt.id, e.target.checked)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className={`font-medium ${isSelected(prompt.id) ? 'text-primary' : ''}`}>
                      {prompt.name}
                    </span>
                    {isSelected(prompt.id) && (
                      <span className="text-xs text-primary">(editing)</span>
                    )}
                  </div>
                  {prompt.description && (
                    <p className="text-sm text-muted-foreground">{prompt.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(prompt.id)
                  }}
                  disabled={deletingId === prompt.id}
                  className="text-destructive hover:text-destructive"
                >
                  {deletingId === prompt.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
