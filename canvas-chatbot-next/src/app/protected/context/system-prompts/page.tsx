'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, FileCode, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { SystemPromptEditor } from '@/components/context/SystemPromptEditor'
import { SystemPrompt } from '@/components/context/SystemPromptManager'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SystemPromptsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<SystemPrompt[]>([])
  const [userPrompts, setUserPrompts] = useState<SystemPrompt[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [enabledPromptIds, setEnabledPromptIds] = useState<string[]>([])
  // Keep a reference to the current prompt to prevent it from disappearing during reload
  const currentPromptRef = useRef<SystemPrompt | null>(null)
  const [currentSelections, setCurrentSelections] = useState<{
    courses: number[]
    assignments: number[]
    modules: number[]
  }>({
    courses: [],
    assignments: [],
    modules: [],
  })

  const supabase = createSupabaseClient()

  // Load prompts and select the one from query params
  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true)
      }

      // Get prompt ID from query params
      const promptId = searchParams.get('id')

      // Load enabled prompts and current selections
      const selectionResponse = await fetch('/api/context/selection')
      if (selectionResponse.ok) {
        const selectionData = await selectionResponse.json()
        setEnabledPromptIds(selectionData.enabled_system_prompt_ids || [])
        setCurrentSelections({
          courses: selectionData.courses || [],
          assignments: selectionData.assignments || [],
          modules: selectionData.modules || [],
        })
      }

      // Load prompts
      const promptsResponse = await fetch('/api/system-prompts')
      if (!promptsResponse.ok) {
        throw new Error('Failed to load prompts')
      }
      const promptsData = await promptsResponse.json()
      setTemplates(promptsData.templates || [])
      setUserPrompts(promptsData.userPrompts || [])

      // Select prompt from query params, or default to first template
      // For templates, show the effective prompt (modified version if exists, otherwise template)
      if (promptId) {
        const allPrompts = [...promptsData.templates, ...promptsData.userPrompts]
        const prompt = allPrompts.find((p: SystemPrompt) => p.id === promptId)
        if (prompt) {
          // If it's a template, check if there's a modified version
          if (prompt.is_template) {
            const modifiedVersion = promptsData.userPrompts.find(
              (up: SystemPrompt) => up.template_type === prompt.template_type
            )
            // Show modified version if it exists, otherwise show template
            const newSelectedId = modifiedVersion ? modifiedVersion.id : prompt.id
            setSelectedPromptId(newSelectedId)
          } else {
            setSelectedPromptId(promptId)
          }
        } else {
          // Prompt not found, redirect back
          router.push('/protected/context')
        }
      } else {
        // No prompt ID, select default template (or its modified version)
        const defaultTemplate = promptsData.templates.find(
          (t: SystemPrompt) => t.template_type === 'default'
        ) || promptsData.templates[0]
        if (defaultTemplate) {
          const modifiedVersion = promptsData.userPrompts.find(
            (up: SystemPrompt) => up.template_type === defaultTemplate.template_type
          )
          // Show modified version if it exists, otherwise show template
          const newSelectedId = modifiedVersion ? modifiedVersion.id : defaultTemplate.id
          setSelectedPromptId(newSelectedId)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load system prompts')
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [searchParams, router])


  // Handle save changes
  const handleSave = useCallback(async (promptId: string, promptText: string, name?: string, description?: string) => {
    setSaving(true)
    try {
      const prompt = [...templates, ...userPrompts].find((p) => p.id === promptId)
      if (!prompt) {
        throw new Error('Prompt not found')
      }

      // If it's a template, create or update a user copy
      if (prompt.is_template) {
        // Check if user already has a modified version of this template
        const existingModified = userPrompts.find(
          (up) => up.template_type === prompt.template_type
        )

        if (existingModified) {
          // Update existing modified version
          const response = await fetch(`/api/system-prompts/${existingModified.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt_text: promptText,
              name: name || prompt.name,
              description: description !== undefined ? description : prompt.description,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to save prompt')
          }

          toast.success('Changes saved successfully!')
          // Reload to get updated prompt (without showing loading spinner)
          await loadData(false) // Don't show loading spinner
        } else {
          // Create new user copy with template_type
          const response = await fetch('/api/system-prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name || prompt.name,
              description: description !== undefined ? description : prompt.description,
              prompt_text: promptText,
              template_type: prompt.template_type, // Preserve template_type to track it's a modified Lulu prompt
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to save prompt')
          }

          const data = await response.json()
          toast.success('Changes saved successfully!')
          // Update selected prompt and URL - the URL change will trigger loadData via useEffect
          if (data.prompt) {
            setSelectedPromptId(data.prompt.id)
            router.replace(`/protected/context/system-prompts?id=${data.prompt.id}`)
            // Don't call loadData() here - the URL change will trigger it via the searchParams useEffect
          }
        }
      } else {
        // Update existing user prompt
        const response = await fetch(`/api/system-prompts/${promptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt_text: promptText,
            ...(name && { name }),
            ...(description !== undefined && { description }),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to save prompt')
        }

        toast.success('Changes saved successfully!')
        // Reload to get updated prompt (without showing loading spinner)
        await loadData(false) // Don't show loading spinner
      }
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error saving:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [templates, userPrompts, router, loadData, enabledPromptIds, currentSelections])

  // Handle save as new template
  const handleSaveAsNew = useCallback(
    async (name: string, description: string, promptText: string) => {
      setSaving(true)
      try {
        const response = await fetch('/api/system-prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            prompt_text: promptText,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to save template')
        }

        const data = await response.json()
        
        // Auto-enable the new prompt
        try {
          const newEnabledIds = [...enabledPromptIds, data.prompt.id]
          await fetch('/api/context/selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courses: currentSelections.courses,
              assignments: currentSelections.assignments,
              modules: currentSelections.modules,
              enabled_system_prompt_ids: newEnabledIds,
            }),
          })
          setEnabledPromptIds(newEnabledIds)
        } catch (error) {
          console.error('Error enabling new prompt:', error)
          // Don't fail the whole operation if enabling fails
        }
        
        toast.success('New template created successfully!')
        // Redirect to the new prompt
        router.push(`/protected/context/system-prompts?id=${data.prompt.id}`)
      } catch (error) {
        console.error('Error saving as new:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to save template')
      } finally {
        setSaving(false)
      }
    },
    [router, enabledPromptIds, currentSelections]
  )

  // Handle toggle enabled
  const handleToggleEnabled = useCallback(
    async (promptId: string, enabled: boolean) => {
      const newEnabledIds = enabled
        ? [...enabledPromptIds, promptId]
        : enabledPromptIds.filter((id) => id !== promptId)

      setEnabledPromptIds(newEnabledIds)

      try {
        const response = await fetch('/api/context/selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courses: currentSelections.courses,
            assignments: currentSelections.assignments,
            modules: currentSelections.modules,
            enabled_system_prompt_ids: newEnabledIds,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to update enabled state')
        }
      } catch (error) {
        console.error('Error toggling enabled state:', error)
        // Revert on error
        setEnabledPromptIds(enabledPromptIds)
        throw error
      }
    },
    [enabledPromptIds, currentSelections]
  )

  // Handle reset to original Lulu prompt
  const handleReset = useCallback(async () => {
    if (!selectedPromptId) return

    const prompt = [...templates, ...userPrompts].find((p) => p.id === selectedPromptId)
    if (!prompt) return

    // Handle reset for templates or modified Lulu prompts (those with template_type)
    const isLuluPrompt = prompt.is_template || (prompt.template_type && templates.some(t => t.template_type === prompt.template_type))
    
    if (!isLuluPrompt) {
      // For custom prompts without template_type, just reset the form (handled by editor)
      return
    }

    try {
      setSaving(true)
      
      // Determine the template type
      const templateType = prompt.template_type
      if (!templateType) {
        toast.error('Cannot reset: No template type found')
        setSaving(false)
        return
      }
      
      // If the current prompt is a modified version (not a template), delete it directly
      if (!prompt.is_template && prompt.template_type) {
        const response = await fetch(`/api/system-prompts/${prompt.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to reset prompt')
        }

        // Remove from enabled list if it was enabled
        if (enabledPromptIds.includes(prompt.id)) {
          const newEnabledIds = enabledPromptIds.filter((id) => id !== prompt.id)
          try {
            await fetch('/api/context/selection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                courses: currentSelections.courses,
                assignments: currentSelections.assignments,
                modules: currentSelections.modules,
                enabled_system_prompt_ids: newEnabledIds,
              }),
            })
            setEnabledPromptIds(newEnabledIds)
          } catch (error) {
            console.error('Error updating enabled state:', error)
            // Don't fail the whole operation if this fails
          }
        }

        toast.success('Reset to original Lulu prompt')
        // Find and navigate to the original template
        const originalTemplate = templates.find(
          (t) => t.template_type === templateType
        )
        if (originalTemplate) {
          router.replace(`/protected/context/system-prompts?id=${originalTemplate.id}`)
          // Don't call loadData() here - the URL change will trigger it via the searchParams useEffect
        }
        return
      }
      
      // If viewing a template, find and delete the modified version
      const modifiedPrompt = userPrompts.find(
        (up) => up.template_type === templateType
      )

      // Find the original template
      const originalTemplate = templates.find(
        (t) => t.template_type === templateType
      )

      if (modifiedPrompt) {
        const response = await fetch(`/api/system-prompts/${modifiedPrompt.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to reset prompt')
        }

        // Remove from enabled list if it was enabled
        if (enabledPromptIds.includes(modifiedPrompt.id)) {
          const newEnabledIds = enabledPromptIds.filter((id) => id !== modifiedPrompt.id)
          try {
            await fetch('/api/context/selection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                courses: currentSelections.courses,
                assignments: currentSelections.assignments,
                modules: currentSelections.modules,
                enabled_system_prompt_ids: newEnabledIds,
              }),
            })
            setEnabledPromptIds(newEnabledIds)
          } catch (error) {
            console.error('Error updating enabled state:', error)
            // Don't fail the whole operation if this fails
          }
        }

        toast.success('Reset to original Lulu prompt')
        // Update URL to point to template if it exists
        if (originalTemplate) {
          router.replace(`/protected/context/system-prompts?id=${originalTemplate.id}`)
          // Don't call loadData() here - the URL change will trigger it via the searchParams useEffect
        }
      } else {
        // No modified version exists, just reset the form
        toast.info('Already at original Lulu prompt')
      }
    } catch (error) {
      console.error('Error resetting prompt:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reset prompt')
    } finally {
      setSaving(false)
    }
  }, [selectedPromptId, templates, userPrompts, enabledPromptIds, currentSelections, loadData, router])

  // Handle delete prompt
  const handleDeletePrompt = useCallback(
    async (promptId: string) => {
      const response = await fetch(`/api/system-prompts/${promptId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete prompt')
      }

      // If deleted prompt was selected, redirect back
      if (selectedPromptId === promptId) {
        router.push('/protected/context')
      } else {
        await loadData(false) // Don't show loading spinner
      }
    },
    [selectedPromptId, router, loadData]
  )

  // Quick save handler for header button
  const handleQuickSave = useCallback(() => {
    if (selectedPromptId && hasUnsavedChanges) {
      const prompt = [...templates, ...userPrompts].find((p) => p.id === selectedPromptId)
      if (prompt) {
        // Trigger save through editor - we'll need to expose this
        // For now, we'll use a ref or state to trigger save
      }
    }
  }, [selectedPromptId, hasUnsavedChanges, templates, userPrompts])

  // Track if we've done initial load to prevent double-loading
  const [hasInitialized, setHasInitialized] = useState(false)

  // Initial load - only run once on mount
  useEffect(() => {
    const initialize = async () => {
      // Check authentication
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession()
      if (authError || !session) {
        router.push('/auth/login')
        return
      }

      await loadData(true) // Show loading spinner on initial load
      setHasInitialized(true)
    }
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - removed loadData from deps to prevent re-triggering

  // Clear prompt ref when selectedPromptId changes to a different prompt
  useEffect(() => {
    if (currentPromptRef.current && currentPromptRef.current.id !== selectedPromptId) {
      currentPromptRef.current = null
    }
  }, [selectedPromptId])

  // Handle URL changes (e.g., from router.replace) - but skip initial mount
  useEffect(() => {
    if (!hasInitialized) return // Skip on initial mount
    
    loadData(false) // Don't show loading spinner on URL changes (save/reset operations)
  }, [searchParams, hasInitialized, loadData])

  // Get the effective prompt to show (modified version if exists, otherwise template)
  const getEffectivePrompt = useCallback((template: SystemPrompt): SystemPrompt => {
    const modified = userPrompts.find((up) => up.template_type === template.template_type)
    return modified || template
  }, [userPrompts])

  // Find the selected prompt, handling templates specially - memoized to prevent unnecessary recalculations
  const effectiveSelectedPrompt = useMemo(() => {
    if (!selectedPromptId) return null
    const prompt = [...templates, ...userPrompts].find((p) => p.id === selectedPromptId)
    // If prompt not found in current arrays, use the cached reference (prevents disappearing during reload)
    if (!prompt) {
      if (currentPromptRef.current && currentPromptRef.current.id === selectedPromptId) {
        return currentPromptRef.current
      }
      return null
    }
    
    // Update the cached reference when we find the prompt
    currentPromptRef.current = prompt
    
    // If it's a template, return it as-is (we already selected the effective one in loadData)
    // If it's a modified version, return it
    return prompt
  }, [selectedPromptId, templates, userPrompts])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading system prompts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/protected/context')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="mb-4">
            <Image
              src="/dog_magnify.png"
              alt="System Prompts Management"
              width={120}
              height={120}
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Edit System Prompt
                {effectiveSelectedPrompt && `: ${effectiveSelectedPrompt.name}`}
              </h1>
              {effectiveSelectedPrompt && (
                <Badge variant={effectiveSelectedPrompt.is_template ? 'secondary' : 'default'}>
                  {effectiveSelectedPrompt.is_template ? 'Template' : effectiveSelectedPrompt.template_type ? 'Lulu Prompt' : 'Custom'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {effectiveSelectedPrompt?.is_template 
                ? 'Edit this Lulu prompt. Your changes will be saved as a customized version.'
                : effectiveSelectedPrompt?.template_type
                ? 'Edit your customized version of this Lulu prompt. Use Reset to restore the original.'
                : 'Edit the system prompt text and save your changes'}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <SystemPromptEditor
          prompt={effectiveSelectedPrompt || null}
          templates={templates}
          loading={loading}
          enabled={effectiveSelectedPrompt ? enabledPromptIds.includes(effectiveSelectedPrompt.id) : false}
          onSave={handleSave}
          onSaveAsNew={handleSaveAsNew}
          onToggleEnabled={handleToggleEnabled}
          onReset={handleReset}
        />
      </div>
    </div>
  )
}
