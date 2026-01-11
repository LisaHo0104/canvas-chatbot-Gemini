'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Trash2, Edit2, Loader2, GraduationCap, ClipboardList, Calendar, FileCheck, LucideIcon, Save, X, RotateCcw } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SystemPrompt } from './SystemPromptManager'

interface SystemPromptListInlineProps {
  enabledPromptIds: string[]
  onToggleEnabled: (promptId: string, enabled: boolean) => void
}

export function SystemPromptListInline({
  enabledPromptIds,
  onToggleEnabled,
}: SystemPromptListInlineProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<SystemPrompt[]>([])
  const [userPrompts, setUserPrompts] = useState<SystemPrompt[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/system-prompts')
      if (!response.ok) {
        throw new Error('Failed to load prompts')
      }
      const data = await response.json()
      setTemplates(data.templates || [])
      setUserPrompts(data.userPrompts || [])
    } catch (error) {
      console.error('Error loading prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get modified Lulu prompts (user prompts that have a template_type matching a template)
  const getModifiedLuluPrompts = useCallback(() => {
    const templateTypes = new Set(templates.map(t => t.template_type).filter(Boolean))
    return userPrompts.filter(up => up.template_type && templateTypes.has(up.template_type))
  }, [templates, userPrompts])

  // Get custom user prompts (not based on templates)
  const getCustomUserPrompts = useCallback(() => {
    const templateTypes = new Set(templates.map(t => t.template_type).filter(Boolean))
    return userPrompts.filter(up => !up.template_type || !templateTypes.has(up.template_type))
  }, [templates, userPrompts])

  // Get the effective prompt for a template (either the modified user version or the original template)
  const getEffectivePrompt = useCallback((template: SystemPrompt) => {
    const modified = userPrompts.find(up => up.template_type === template.template_type)
    return modified || template
  }, [userPrompts])

  const handleDelete = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      return
    }
    setDeletingId(promptId)
    try {
      const response = await fetch(`/api/system-prompts/${promptId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete prompt')
      }
      await loadPrompts()
      // Remove from enabled list if it was enabled
      if (enabledPromptIds.includes(promptId)) {
        onToggleEnabled(promptId, false)
      }
    } catch (error) {
      console.error('Error deleting prompt:', error)
      alert('Failed to delete prompt. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (promptId: string) => {
    router.push(`/protected/context/system-prompts?id=${promptId}`)
  }

  const handleStartEdit = (prompt: SystemPrompt) => {
    setEditingId(prompt.id)
    setEditingText(prompt.prompt_text)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingText('')
  }

  const handleSaveEdit = async (prompt: SystemPrompt) => {
    if (!editingText.trim()) {
      alert('Prompt text cannot be empty')
      return
    }

    setSavingId(prompt.id)
    try {
      // Check if this is a modified Lulu prompt (has template_type but is not a template)
      if (!prompt.is_template && prompt.template_type) {
        // This is a modified Lulu prompt - update it directly
        const response = await fetch(`/api/system-prompts/${prompt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt_text: editingText.trim(),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to save prompt')
        }

        await loadPrompts()
        setEditingId(null)
        setEditingText('')
      } else if (prompt.is_template) {
        // This is an original Lulu template - create or update a user copy
        const response = await fetch('/api/system-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: prompt.name,
            description: prompt.description,
            prompt_text: editingText.trim(),
            template_type: prompt.template_type, // Preserve template_type to track it's a modified Lulu prompt
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to save prompt')
        }

        await loadPrompts()
        setEditingId(null)
        setEditingText('')
      } else {
        // This is a custom user prompt - update it directly
        const response = await fetch(`/api/system-prompts/${prompt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt_text: editingText.trim(),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to save prompt')
        }

        await loadPrompts()
        setEditingId(null)
        setEditingText('')
      }
    } catch (error) {
      console.error('Error saving prompt:', error)
      alert(error instanceof Error ? error.message : 'Failed to save prompt. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleRestore = async (template: SystemPrompt) => {
    if (!confirm('Are you sure you want to restore this prompt to Lulu\'s original? Your modifications will be lost.')) {
      return
    }

    setRestoringId(template.template_type || '')
    try {
      // Find the user prompt that modifies this template
      const modifiedPrompt = userPrompts.find(up => up.template_type === template.template_type)
      if (modifiedPrompt) {
        const response = await fetch(`/api/system-prompts/${modifiedPrompt.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to restore prompt')
        }

        await loadPrompts()
        // Remove from enabled list if it was enabled
        if (enabledPromptIds.includes(modifiedPrompt.id)) {
          onToggleEnabled(modifiedPrompt.id, false)
        }
      }
    } catch (error) {
      console.error('Error restoring prompt:', error)
      alert('Failed to restore prompt. Please try again.')
    } finally {
      setRestoringId(null)
    }
  }

  const isEnabled = (promptId: string) => enabledPromptIds.includes(promptId)

  const getTemplateIcon = (templateType: string | null | undefined): LucideIcon => {
    switch (templateType) {
      case 'default':
        return GraduationCap
      case 'quiz_generation':
        return ClipboardList
      case 'study_plan':
        return Calendar
      case 'rubric_analysis':
        return FileCheck
      default:
        return FileText
    }
  }

  const isBetaFeature = (templateType: string | null | undefined): boolean => {
    return templateType === 'quiz_generation' || templateType === 'study_plan' || templateType === 'rubric_analysis'
  }

  const modifiedLuluPrompts = getModifiedLuluPrompts()
  const customUserPrompts = getCustomUserPrompts()

  return (
    <div className="space-y-4">
      {/* Lulu Prompts Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Lulu prompts</h3>
        </div>
        <div className="space-y-2">
          {loading && templates.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No Lulu prompts available</p>
          ) : (
            templates.map((template) => {
              const TemplateIcon = getTemplateIcon(template.template_type)
              const effectivePrompt = getEffectivePrompt(template)
              const isModified = effectivePrompt.id !== template.id
              const isRestoring = restoringId === template.template_type

              return (
                <div
                  key={template.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TemplateIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{template.name}</span>
                      {isBetaFeature(template.template_type) && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700">Beta</Badge>
                      )}
                      {isModified && (
                        <span className="text-xs text-muted-foreground">(Modified)</span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isModified && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(template)}
                        disabled={isRestoring}
                      >
                        {isRestoring ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restore
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(effectivePrompt.id)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {customUserPrompts.length > 0 && (
        <>
          {/* My Prompts Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">My prompts</h3>
            </div>
            <div className="space-y-2">
              {customUserPrompts.map((prompt) => {
                const isEditing = editingId === prompt.id
                const isSaving = savingId === prompt.id
                return (
                  <div
                    key={prompt.id}
                    className="flex flex-col gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">{prompt.name}</span>
                        </div>
                        {prompt.description && (
                          <p className="text-sm text-muted-foreground">{prompt.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEditing && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(prompt.id)}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(prompt.id)}
                              disabled={deletingId === prompt.id}
                              className="text-destructive hover:text-destructive"
                            >
                              {deletingId === prompt.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </>
                        )}
                        <Switch
                          checked={isEnabled(prompt.id)}
                          onCheckedChange={(checked) => {
                            onToggleEnabled(prompt.id, checked === true)
                          }}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    {isEditing && (
                      <div className="space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[200px] font-mono text-sm"
                          placeholder="Enter system prompt text..."
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSaveEdit(prompt)}
                            disabled={isSaving || !editingText.trim()}
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
