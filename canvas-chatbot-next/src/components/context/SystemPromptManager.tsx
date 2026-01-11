'use client'

import { useState, useEffect } from 'react'
import { FileText, Loader2, Save, Copy, RotateCcw, Settings, FileCode } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { SystemPromptManagerDialog } from './SystemPromptManagerDialog'

export interface SystemPrompt {
  id: string
  name: string
  description: string | null
  prompt_text: string
  is_template: boolean
  template_type: string | null
  created_at: string
  updated_at: string
}

interface SystemPromptManagerProps {
  onPromptChanged?: () => void
}

export function SystemPromptManager({ onPromptChanged }: SystemPromptManagerProps) {
  const [templates, setTemplates] = useState<SystemPrompt[]>([])
  const [userPrompts, setUserPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null)
  const [currentPromptText, setCurrentPromptText] = useState('')
  const [originalPromptText, setOriginalPromptText] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)

  useEffect(() => {
    loadPrompts()
    loadCurrentPrompt()
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

  const loadCurrentPrompt = async () => {
    try {
      // Fetch user's current system prompt selection
      const response = await fetch('/api/context/selection')
      if (!response.ok) {
        // If no selection found, wait for templates to load
        return
      }
      const data = await response.json()
      
      if (data.current_system_prompt_id) {
        const promptResponse = await fetch(`/api/system-prompts/${data.current_system_prompt_id}`)
        if (promptResponse.ok) {
          const promptData = await promptResponse.json()
          setCurrentPromptId(promptData.prompt.id)
          setCurrentPromptText(promptData.prompt.prompt_text)
          setOriginalPromptText(promptData.prompt.prompt_text)
          setHasChanges(false)
          return
        }
      }
      
      // No prompt selected, will use default template after templates load
    } catch (error) {
      console.error('Error loading current prompt:', error)
    }
  }

  useEffect(() => {
    if (templates.length > 0 && !currentPromptId) {
      // Load default template if no prompt is selected
      const defaultTemplate = templates.find(t => t.template_type === 'default')
      if (defaultTemplate) {
        setCurrentPromptId(defaultTemplate.id)
        setCurrentPromptText(defaultTemplate.prompt_text)
        setOriginalPromptText(defaultTemplate.prompt_text)
      }
    }
  }, [templates])

  const handlePromptSelect = async (promptId: string) => {
    if (promptId === 'none') {
      // Clear selection - use default
      const defaultTemplate = templates.find(t => t.template_type === 'default')
      if (defaultTemplate) {
        await handleUseTemplate(defaultTemplate.id)
      }
      return
    }

    try {
      setApplying(true)
      const response = await fetch(`/api/system-prompts/${promptId}`)
      if (!response.ok) {
        throw new Error('Failed to load prompt')
      }

      const data = await response.json()
      const prompt = data.prompt

      setCurrentPromptId(prompt.id)
      setCurrentPromptText(prompt.prompt_text)
      setOriginalPromptText(prompt.prompt_text)
      setHasChanges(false)

      // Apply the prompt
      await applyPrompt(prompt.id)
    } catch (error) {
      console.error('Error selecting prompt:', error)
      alert('Failed to load prompt. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  const handleUseTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/system-prompts/${templateId}`)
      if (!response.ok) {
        throw new Error('Failed to load template')
      }

      const data = await response.json()
      const template = data.prompt

      setCurrentPromptId(template.id)
      setCurrentPromptText(template.prompt_text)
      setOriginalPromptText(template.prompt_text)
      setHasChanges(false)

      // Apply the template
      await applyPrompt(template.id)
    } catch (error) {
      console.error('Error using template:', error)
      alert('Failed to load template. Please try again.')
    }
  }

  const applyPrompt = async (promptId: string) => {
    try {
      const response = await fetch(`/api/system-prompts/${promptId}/apply`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to apply prompt')
      }

      if (onPromptChanged) {
        onPromptChanged()
      }
    } catch (error) {
      console.error('Error applying prompt:', error)
      alert('Failed to apply prompt. Please try again.')
    }
  }

  const handleSaveChanges = async () => {
    if (!currentPromptId) return

    try {
      setSaving(true)
      const prompt = [...templates, ...userPrompts].find(p => p.id === currentPromptId)
      
      if (!prompt) {
        throw new Error('Prompt not found')
      }

      // If it's a template, we need to create a user copy first
      if (prompt.is_template) {
        // Create a new user template from the template
        const response = await fetch('/api/system-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${prompt.name} (Custom)`,
            description: `Customized version of ${prompt.name}`,
            prompt_text: currentPromptText,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save prompt')
        }

        const data = await response.json()
        await applyPrompt(data.prompt.id)
        await loadPrompts()
        setCurrentPromptId(data.prompt.id)
        setOriginalPromptText(currentPromptText)
        setHasChanges(false)
      } else {
        // Update existing user prompt
        const response = await fetch(`/api/system-prompts/${currentPromptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt_text: currentPromptText,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to save prompt')
        }

        await applyPrompt(currentPromptId)
        await loadPrompts()
        setOriginalPromptText(currentPromptText)
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAsTemplate = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/system-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Custom Prompt ${new Date().toLocaleDateString()}`,
          description: 'Custom system prompt',
          prompt_text: currentPromptText,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save template')
      }

      const data = await response.json()
      await applyPrompt(data.prompt.id)
      await loadPrompts()
      setCurrentPromptId(data.prompt.id)
      setOriginalPromptText(currentPromptText)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetToTemplate = () => {
    const prompt = [...templates, ...userPrompts].find(p => p.id === currentPromptId)
    if (prompt && prompt.is_template) {
      setCurrentPromptText(prompt.prompt_text)
      setHasChanges(false)
    } else {
      // Find the original template this was based on
      const template = templates.find(t => t.template_type === prompt?.template_type)
      if (template) {
        setCurrentPromptText(template.prompt_text)
        setHasChanges(false)
      }
    }
  }

  useEffect(() => {
    setHasChanges(currentPromptText !== originalPromptText)
  }, [currentPromptText, originalPromptText])

  const currentPrompt = [...templates, ...userPrompts].find(p => p.id === currentPromptId)
  const isTemplate = currentPrompt?.is_template ?? false

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            System Prompt Management
          </CardTitle>
          <CardDescription>
            View, edit, and manage your system prompts. Templates are read-only but can be customized and saved as your own templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt Selector */}
          <div className="space-y-2">
            <Label>Current System Prompt</Label>
            <Select
              value={currentPromptId || 'none'}
              onValueChange={handlePromptSelect}
              disabled={loading || applying}
            >
              <SelectTrigger>
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Applying...</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <SelectValue>
                    {currentPrompt ? (
                      <div className="flex items-center gap-2">
                        {currentPrompt.is_template ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {currentPrompt.name}
                      </div>
                    ) : (
                      'Select a prompt'
                    )}
                  </SelectValue>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default (System)</SelectItem>
                {templates.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Templates</div>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {template.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {userPrompts.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">My Templates</div>
                    {userPrompts.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        <div className="flex items-center gap-2">
                          <Copy className="w-4 h-4" />
                          {prompt.name}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {currentPrompt?.description && (
              <p className="text-sm text-muted-foreground">{currentPrompt.description}</p>
            )}
          </div>

          {/* Prompt Text Editor */}
          <div className="space-y-2">
            <Label>System Prompt Text</Label>
            <Textarea
              value={currentPromptText}
              onChange={(e) => setCurrentPromptText(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="System prompt text will appear here..."
              disabled={loading || !currentPromptId}
            />
            {hasChanges && (
              <p className="text-sm text-muted-foreground">
                You have unsaved changes
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isTemplate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUseTemplate(currentPromptId!)}
                disabled={loading || applying}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Template
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveChanges}
              disabled={loading || saving || applying || !hasChanges}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAsTemplate}
              disabled={loading || saving || applying}
            >
              <Copy className="w-4 h-4 mr-2" />
              Save as New Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManagerOpen(true)}
              disabled={loading}
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Templates
            </Button>
          </div>
        </CardContent>
      </Card>

      <SystemPromptManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        onPresetDeleted={async () => {
          await loadPrompts()
          await loadCurrentPrompt()
        }}
        onPresetApplied={async (promptId) => {
          await handlePromptSelect(promptId)
        }}
      />
    </>
  )
}
