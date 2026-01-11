'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Loader2, Save, RotateCcw, Info, AlertCircle, Eye, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { MessageResponse } from '@/components/ai-elements/message'
import { toast } from 'sonner'
import { SystemPrompt } from './SystemPromptManager'
import { SYSTEM_PROMPT_TEMPLATES } from '@/lib/system-prompt-templates'
import { SYSTEM_PROMPT } from '@/lib/system-prompt'

interface SystemPromptEditorProps {
  prompt: SystemPrompt | null
  templates: SystemPrompt[]
  loading?: boolean
  enabled?: boolean
  onSave: (promptId: string, promptText: string, name?: string, description?: string) => Promise<void>
  onSaveAsNew: (name: string, description: string, promptText: string) => Promise<void>
  onToggleEnabled?: (promptId: string, enabled: boolean) => Promise<void>
  onReset?: () => void
}

export function SystemPromptEditor({
  prompt,
  templates,
  loading = false,
  enabled = false,
  onSave,
  onSaveAsNew,
  onToggleEnabled,
  onReset,
}: SystemPromptEditorProps) {
  const [promptText, setPromptText] = useState('')
  const [originalPromptText, setOriginalPromptText] = useState('')
  const [promptName, setPromptName] = useState('')
  const [originalPromptName, setOriginalPromptName] = useState('')
  const [promptDescription, setPromptDescription] = useState('')
  const [originalPromptDescription, setOriginalPromptDescription] = useState('')
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [togglingEnabled, setTogglingEnabled] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')
  const [isResetting, setIsResetting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const lastProcessedPromptIdRef = useRef<string | null>(null)

  useEffect(() => {
    setIsEnabled(enabled)
  }, [enabled])

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/b8e98944-552b-4fa4-94d4-0555e01fc282',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemPromptEditor.tsx:58',message:'useEffect triggered - prompt prop changed',data:{promptId:prompt?.id,promptName:prompt?.name,isResetting,lastProcessedId:lastProcessedPromptIdRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Don't overwrite form during reset operation
    if (isResetting) return
    
    // Skip if we've already processed this prompt (prevents double-loading)
    if (prompt?.id && prompt.id === lastProcessedPromptIdRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/b8e98944-552b-4fa4-94d4-0555e01fc282',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemPromptEditor.tsx:65',message:'Skipping duplicate load - already processed this prompt',data:{promptId:prompt.id},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/b8e98944-552b-4fa4-94d4-0555e01fc282',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemPromptEditor.tsx:70',message:'Loading prompt text into editor',data:{promptId:prompt?.id,isTemplate:prompt?.is_template},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (prompt) {
      // Only load from source files if it's a template (is_template === true)
      // For modified versions (is_template === false but has template_type), use the prompt_text from database
      let textToLoad = prompt.prompt_text
      
      if (prompt.is_template) {
        // Get original text from source files for templates only
        const getOriginalPromptText = (templateType: string | null | undefined): string | null => {
          if (!templateType) return null
          const sourceTemplate = SYSTEM_PROMPT_TEMPLATES.find(t => t.template_type === templateType)
          if (sourceTemplate) return sourceTemplate.prompt_text
          if (templateType === 'default') return SYSTEM_PROMPT
          return null
        }
        const originalText = getOriginalPromptText(prompt.template_type)
        if (originalText) {
          textToLoad = originalText
        }
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/b8e98944-552b-4fa4-94d4-0555e01fc282',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemPromptEditor.tsx:82',message:'Setting prompt text state',data:{promptId:prompt.id,textLength:textToLoad.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      setPromptText(textToLoad)
      setOriginalPromptText(textToLoad)
      setPromptName(prompt.name)
      setOriginalPromptName(prompt.name)
      setPromptDescription(prompt.description || '')
      setOriginalPromptDescription(prompt.description || '')
      setHasChanges(false)
      // Mark this prompt as processed
      lastProcessedPromptIdRef.current = prompt.id
    } else {
      setPromptText('')
      setOriginalPromptText('')
      setPromptName('')
      setOriginalPromptName('')
      setPromptDescription('')
      setOriginalPromptDescription('')
      setHasChanges(false)
      // Clear the processed prompt ID when prompt is null
      lastProcessedPromptIdRef.current = null
    }
  }, [prompt, isResetting])

  useEffect(() => {
    const textChanged = promptText !== originalPromptText
    const nameChanged = promptName !== originalPromptName
    const descChanged = promptDescription !== originalPromptDescription
    const newHasChanges = textChanged || nameChanged || descChanged
    setHasChanges(newHasChanges)
  }, [promptText, originalPromptText, promptName, originalPromptName, promptDescription, originalPromptDescription])

  // Helper function to get the original template text from source files
  const getOriginalTemplateText = useCallback((templateType: string | null | undefined): string | null => {
    if (!templateType) return null
    const sourceTemplate = SYSTEM_PROMPT_TEMPLATES.find(t => t.template_type === templateType)
    if (sourceTemplate) return sourceTemplate.prompt_text
    if (templateType === 'default') return SYSTEM_PROMPT
    return null
  }, [])

  // Check if current text differs from original template text (for Reset button)
  const canReset = useMemo(() => {
    if (!prompt) return false
    
    // For Lulu prompts (templates or modified versions), compare with original template text
    const isLuluPrompt = prompt.is_template || (prompt.template_type && templates.some(t => t.template_type === prompt.template_type))
    if (isLuluPrompt && prompt.template_type) {
      const originalTemplateText = getOriginalTemplateText(prompt.template_type)
      if (originalTemplateText) {
        return promptText !== originalTemplateText
      }
    }
    
    // For custom prompts, compare with originalPromptText (what was loaded)
    return promptText !== originalPromptText
  }, [prompt, promptText, originalPromptText, templates, getOriginalTemplateText])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (hasChanges && prompt) {
          handleSave()
        }
      }
      if (e.key === 'Escape' && hasChanges) {
        handleReset()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasChanges, prompt])

  // Sync preview height with textarea height
  useEffect(() => {
    const syncHeights = () => {
      if (textareaRef.current && previewRef.current) {
        const textareaHeight = textareaRef.current.offsetHeight
        previewRef.current.style.height = `${textareaHeight}px`
      }
    }

    syncHeights()

    const textarea = textareaRef.current
    if (textarea) {
      // Sync on resize
      const resizeObserver = new ResizeObserver(syncHeights)
      resizeObserver.observe(textarea)
      
      // Also sync on input (in case content changes affect height)
      textarea.addEventListener('input', syncHeights)
      
      return () => {
        resizeObserver.disconnect()
        textarea.removeEventListener('input', syncHeights)
      }
    }
  }, [promptText, prompt])

  const handleSave = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/b8e98944-552b-4fa4-94d4-0555e01fc282',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemPromptEditor.tsx:153',message:'handleSave called',data:{promptId:prompt?.id,hasChanges},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!prompt || !hasChanges) return

    // Check if this is a Lulu prompt (either template or modified version)
    const isLuluPrompt = prompt.is_template || (prompt.template_type && templates.some(t => t.template_type === prompt.template_type))

    // For Lulu prompts, use the original name and description
    // For custom prompts, require name
    if (!isLuluPrompt && !promptName.trim()) {
      toast.error('Name is required')
      return
    }

    try {
      setSaving(true)
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/b8e98944-552b-4fa4-94d4-0555e01fc282',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemPromptEditor.tsx:167',message:'About to call onSave callback',data:{promptId:prompt.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // For Lulu prompts, use original name/description; for custom prompts, use edited values
      const nameToSave = isLuluPrompt ? prompt.name : promptName
      const descriptionToSave = isLuluPrompt ? (prompt.description || '') : promptDescription
      // Use textarea value directly if it differs from state (race condition fix)
      const textToSave = textareaRef.current?.value || promptText
      await onSave(prompt.id, textToSave, nameToSave, descriptionToSave)
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/b8e98944-552b-4fa4-94d4-0555e01fc282',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemPromptEditor.tsx:173',message:'onSave callback completed',data:{promptId:prompt.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setOriginalPromptText(textToSave)
      setPromptText(textToSave)
      setOriginalPromptName(promptName)
      setOriginalPromptDescription(promptDescription)
      setHasChanges(false)
      toast.success('Changes saved successfully!')
    } catch (error) {
      console.error('Error saving:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAsNew = async () => {
    if (!promptText.trim()) {
      toast.error('Prompt text cannot be empty')
      return
    }

    if (!promptName.trim()) {
      toast.error('Name is required')
      return
    }

    const name = promptName.trim()
    const description = promptDescription.trim() || 'Custom system prompt'

    try {
      setSaving(true)
      await onSaveAsNew(name, description, promptText)
      toast.success('New custom prompt created successfully!')
    } catch (error) {
      console.error('Error saving as new:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save template. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEnabled = async (checked: boolean) => {
    if (!prompt || !onToggleEnabled) return
    // Don't allow toggling for Lulu prompts (templates or modified versions)
    const isLuluPrompt = prompt.is_template || (prompt.template_type && templates.some(t => t.template_type === prompt.template_type))
    if (isLuluPrompt) return

    try {
      setTogglingEnabled(true)
      setIsEnabled(checked)
      await onToggleEnabled(prompt.id, checked)
      toast.success(checked ? 'Prompt enabled' : 'Prompt disabled')
    } catch (error) {
      console.error('Error toggling enabled state:', error)
      setIsEnabled(!checked) // Revert on error
      toast.error('Failed to update enabled state')
    } finally {
      setTogglingEnabled(false)
    }
  }

  const handleReset = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/b8e98944-552b-4fa4-94d4-0555e01fc282',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemPromptEditor.tsx:234',message:'handleReset called',data:{promptId:prompt?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!prompt) return

    setResetting(true)
    setIsResetting(true)

    // Get the original prompt text from source files
    const getOriginalPromptText = (templateType: string | null | undefined): string | null => {
      if (!templateType) return null
      
      // Find the template in SYSTEM_PROMPT_TEMPLATES
      const sourceTemplate = SYSTEM_PROMPT_TEMPLATES.find(t => t.template_type === templateType)
      if (sourceTemplate) {
        return sourceTemplate.prompt_text
      }
      
      // Fallback: use SYSTEM_PROMPT for default type
      if (templateType === 'default') {
        return SYSTEM_PROMPT
      }
      
      return null
    }

    if (prompt.is_template) {
      // For templates, get original text from source files
      const originalText = getOriginalPromptText(prompt.template_type)
      if (originalText) {
        setPromptText(originalText)
        setOriginalPromptText(originalText)
        setPromptName(prompt.name)
        setPromptDescription(prompt.description || '')
        setHasChanges(false)
        toast.success('Reset to original Lulu prompt from source files')
      } else {
        // Fallback: use current template text
        setPromptText(prompt.prompt_text)
        setOriginalPromptText(prompt.prompt_text)
        setPromptName(prompt.name)
        setPromptDescription(prompt.description || '')
        setHasChanges(false)
        toast.info('Reset to original')
      }
      
      // Also call parent's reset handler to delete modified version if it exists
      if (onReset) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/b8e98944-552b-4fa4-94d4-0555e01fc282',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemPromptEditor.tsx:278',message:'About to call onReset callback',data:{promptId:prompt.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        try {
          await onReset()
        } catch (error) {
          console.error('Error resetting:', error)
          toast.error('Failed to reset prompt')
        } finally {
          setIsResetting(false)
          setResetting(false)
        }
      } else {
        setIsResetting(false)
        setResetting(false)
      }
    } else {
      // For modified Lulu prompts or custom prompts with template_type
      if (prompt.template_type) {
        const originalText = getOriginalPromptText(prompt.template_type)
        if (originalText) {
          // Find the original template for name/description
          const template = templates.find((t) => t.template_type === prompt.template_type)
          setPromptText(originalText)
          setOriginalPromptText(originalText)
          setPromptName(template?.name || prompt.name)
          setPromptDescription(template?.description || prompt.description || '')
          setHasChanges(false)
          toast.success('Reset to original Lulu prompt from source files')
        } else {
          // Fallback: use template from database
          const template = templates.find((t) => t.template_type === prompt.template_type)
          if (template) {
            setPromptText(template.prompt_text)
            setOriginalPromptText(template.prompt_text)
            setPromptName(prompt.name)
            setPromptDescription(prompt.description || '')
            setHasChanges(false)
            toast.info('Reset to original')
          }
        }
        
        // Call parent's reset handler to delete modified version
        if (onReset) {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/b8e98944-552b-4fa4-94d4-0555e01fc282',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SystemPromptEditor.tsx:312',message:'About to call onReset callback (modified version)',data:{promptId:prompt.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          try {
            await onReset()
          } catch (error) {
            console.error('Error resetting:', error)
            toast.error('Failed to reset prompt')
          } finally {
            setIsResetting(false)
            setResetting(false)
          }
        } else {
          setIsResetting(false)
          setResetting(false)
        }
      } else {
        // For custom prompts without template_type, just reset the form
        setPromptText(prompt.prompt_text)
        setOriginalPromptText(prompt.prompt_text)
        setPromptName(prompt.name)
        setPromptDescription(prompt.description || '')
        setHasChanges(false)
        toast.info('Reset to original')
        setIsResetting(false)
        setResetting(false)
      }
    }
  }

  if (!prompt) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Select a prompt from the list to edit</p>
      </div>
    )
  }

  const isTemplate = prompt.is_template
  // Check if this is a Lulu prompt (either template or modified version)
  const isLuluPrompt = prompt.is_template || (prompt.template_type && templates.some(t => t.template_type === prompt.template_type))
  const characterCount = promptText.length
  const maxCharacters = 10000

  return (
    <>
      <div className="mb-20 space-y-4">
          {/* Name and Description - Hidden for Lulu prompts */}
          {!isLuluPrompt && (
            <Card>
              <CardHeader>
                <CardTitle>Prompt Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="prompt-name"
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    disabled={loading || saving || resetting}
                    placeholder="Enter prompt name"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Edit the name if creating a new custom prompt copy
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt-description">Description</Label>
                  <Input
                    id="prompt-description"
                    value={promptDescription}
                    onChange={(e) => setPromptDescription(e.target.value)}
                    disabled={loading || saving || resetting}
                    placeholder="Optional description"
                  />
                  <p className="text-xs text-muted-foreground">
                    Edit the description if creating a new custom prompt copy
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mobile Tab Switcher */}
          <div className="lg:hidden flex items-center gap-2 border-b">
            <Button
              variant={mobileView === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMobileView('edit')}
              className="rounded-b-none"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant={mobileView === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMobileView('preview')}
              className="rounded-b-none"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>

          {/* Split View: Editor and Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Editor */}
            <div className={`space-y-2 ${mobileView === 'preview' ? 'hidden lg:block' : ''}`}>
              <div className="flex items-center justify-between">
                <Label htmlFor="prompt-text">
                  System Prompt Text <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()} characters
                </span>
              </div>
              <Textarea
                id="prompt-text"
                ref={textareaRef}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="min-h-[400px] lg:min-h-[500px] font-mono text-sm resize-y"
                placeholder="Enter your system prompt text here... Use **bold** for emphasis, • for lists"
                disabled={loading || saving || resetting}
              />
              <p className="text-xs text-muted-foreground">
                💡 Tip: Use <strong>**bold**</strong> for emphasis, <strong>•</strong> for lists, and <strong>#</strong> for headers
              </p>
            </div>

            {/* Right: Preview */}
            <div className={`space-y-2 ${mobileView === 'edit' ? 'hidden lg:block' : ''}`}>
              <Label>Preview</Label>
              <div 
                ref={previewRef}
                className="min-h-[400px] lg:min-h-[500px] overflow-y-auto border rounded-md p-4 bg-muted/20"
              >
                <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
                  {promptText || 'Start typing to see preview...'}
                </MessageResponse>
              </div>
              <p className="text-xs text-muted-foreground">
                Live preview of how your prompt will be rendered
              </p>
            </div>
          </div>

          {/* Unsaved Changes Indicator */}
          {hasChanges && (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes. Don't forget to save!
              </AlertDescription>
            </Alert>
          )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {hasChanges && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
                  <span className="hidden sm:inline">Unsaved changes</span>
                  <span className="sm:hidden">Unsaved</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()} chars
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isLuluPrompt && (
                <div className="flex items-center gap-2 mr-2">
                  {togglingEnabled && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="prompt-enabled" className="text-sm cursor-pointer">
                      Enabled
                    </Label>
                    <Switch
                      id="prompt-enabled"
                      checked={isEnabled}
                      onCheckedChange={handleToggleEnabled}
                      disabled={loading || saving || resetting || togglingEnabled}
                    />
                  </div>
                </div>
              )}
              {(isLuluPrompt || (!isLuluPrompt && onReset)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={loading || saving || resetting || !canReset}
                  className="flex-1 sm:flex-initial"
                >
                  {resetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="hidden sm:inline">Resetting...</span>
                      <span className="sm:hidden">Resetting</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Reset</span>
                      <span className="sm:hidden">Reset</span>
                    </>
                  )}
                </Button>
              )}
              {isLuluPrompt ? (
                // Lulu Prompt (template or modified): "Save Changes" button only
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={loading || saving || !hasChanges}
                  className="flex-1 sm:flex-initial"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="hidden sm:inline">Saving...</span>
                      <span className="sm:hidden">Saving</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Save Changes</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </Button>
              ) : (
                // Custom Prompt: Both "Save Changes" and "Save as New Custom Prompt"
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    disabled={loading || saving || !hasChanges || !promptName.trim()}
                    className="flex-1 sm:flex-initial"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="hidden sm:inline">Saving...</span>
                        <span className="sm:hidden">Saving</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Save Changes</span>
                        <span className="sm:hidden">Save</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAsNew}
                    disabled={loading || saving || !promptText.trim() || !promptName.trim()}
                    className="flex-1 sm:flex-initial"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Save as New Custom Prompt</span>
                    <span className="sm:hidden">New</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
