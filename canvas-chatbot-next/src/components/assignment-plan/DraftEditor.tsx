'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

interface DraftEditorProps {
  draft?: string
  onSave: (content: string) => void
  onCancel?: () => void
  placeholder?: string
}

export function DraftEditor({ draft, onSave, onCancel, placeholder = 'Start writing your draft here...' }: DraftEditorProps) {
  const [content, setContent] = useState(draft || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(content)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="min-h-[200px] font-mono text-sm"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
        {onCancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Markdown is supported. Use **bold**, *italic*, and other markdown formatting.
      </p>
    </div>
  )
}
