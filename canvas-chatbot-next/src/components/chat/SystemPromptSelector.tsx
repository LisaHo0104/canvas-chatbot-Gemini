'use client'

import { useState, useEffect } from 'react'
import { FileCode, FileText, Copy, CheckIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { PromptInputButton } from '@/components/ai-elements/prompt-input'
import { getModeBadgeColors, getModeColors, type ModeType } from '@/lib/mode-colors'
import {
  PromptInputCommand,
  PromptInputCommandInput,
  PromptInputCommandList,
  PromptInputCommandEmpty,
  PromptInputCommandGroup,
  PromptInputCommandItem,
  PromptInputCommandSeparator,
} from '@/components/ai-elements/prompt-input'
import { SystemPrompt } from '@/components/context/SystemPromptManager'

interface SystemPromptSelectorProps {
  selectedPromptIds: string[]
  onSelectionChange: (promptIds: string[]) => void
  mode?: string | null
}

export function SystemPromptSelector({
  selectedPromptIds,
  onSelectionChange,
  mode,
}: SystemPromptSelectorProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<SystemPrompt[]>([])
  const [userPrompts, setUserPrompts] = useState<SystemPrompt[]>([])
  const [enabledPromptIds, setEnabledPromptIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load enabled prompts from context selection
      const selectionResponse = await fetch('/api/context/selection')
      if (selectionResponse.ok) {
        const selectionData = await selectionResponse.json()
        setEnabledPromptIds(selectionData.enabled_system_prompt_ids || [])
      }

      // Load all prompts
      const promptsResponse = await fetch('/api/system-prompts')
      if (promptsResponse.ok) {
        const promptsData = await promptsResponse.json()
        setTemplates(promptsData.templates || [])
        setUserPrompts(promptsData.userPrompts || [])
      }
    } catch (error) {
      console.error('Error loading system prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mapping between modes and system prompt template types
  const MODE_TO_TEMPLATE_TYPE: Record<string, string> = {
    'rubric': 'rubric_analysis',
    'quiz': 'quiz_generation',
    'study-plan': 'study_plan',
  }

  // Determine which template is active based on mode
  const getActiveTemplateType = (): string | null => {
    if (!mode) {
      return 'default'
    }
    return MODE_TO_TEMPLATE_TYPE[mode] || null
  }

  const activeTemplateType = getActiveTemplateType()
  
  // Get mode type for color utilities
  const modeType: ModeType = mode === 'rubric' ? 'rubric' : mode === 'quiz' ? 'quiz' : mode === 'study-plan' ? 'study-plan' : null

  const isBetaFeature = (templateType: string | null | undefined): boolean => {
    return templateType === 'quiz_generation' || templateType === 'study_plan' || templateType === 'rubric_analysis'
  }

  // Get mode type from template type
  const getModeFromTemplateType = (templateType: string | null | undefined): ModeType => {
    if (templateType === 'quiz_generation') return 'quiz'
    if (templateType === 'rubric_analysis') return 'rubric'
    if (templateType === 'study_plan') return 'study-plan'
    return null
  }

  // Filter prompts based on enabled state and search query
  // Templates are always available (system-wide), user prompts require enabled state
  const availableTemplates = templates.filter(
    (t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Separate modified Lulu prompts from custom user prompts
  const templateTypes = new Set(templates.map(t => t.template_type).filter(Boolean))
  const modifiedLuluPrompts = userPrompts.filter(
    (p) => p.template_type && templateTypes.has(p.template_type) && 
           enabledPromptIds.includes(p.id) && 
           p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const customUserPrompts = userPrompts.filter(
    (p) => (!p.template_type || !templateTypes.has(p.template_type)) &&
           enabledPromptIds.includes(p.id) && 
           p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggle = (promptId: string) => {
    const isSelected = selectedPromptIds.includes(promptId)
    const newSelection = isSelected
      ? selectedPromptIds.filter((id) => id !== promptId)
      : [...selectedPromptIds, promptId]
    onSelectionChange(newSelection)
  }

  const allPrompts = [...availableTemplates, ...modifiedLuluPrompts, ...customUserPrompts]
  const hasAvailablePrompts = allPrompts.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PromptInputButton type="button" size="sm" variant="outline">
          <FileCode className="text-muted-foreground" size={12} />
          <span>
            Prompts: {selectedPromptIds.length}
          </span>
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <PromptInputCommand>
          <PromptInputCommandInput
            placeholder="Search system prompts..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <PromptInputCommandList>
            {loading ? (
              <PromptInputCommandEmpty>
                <div className="flex items-center gap-2 justify-center py-4">
                  <span>Loading prompts...</span>
                </div>
              </PromptInputCommandEmpty>
            ) : !hasAvailablePrompts ? (
              <PromptInputCommandEmpty>
                {templates.length === 0 && userPrompts.length === 0
                  ? 'No prompts available.'
                  : 'No prompts match your search. Go to Context Management to enable user prompts.'}
              </PromptInputCommandEmpty>
            ) : (
              <>
                {(availableTemplates.length > 0 || modifiedLuluPrompts.length > 0) && (
                  <>
                    <PromptInputCommandGroup heading="Lulu Prompts">
                      {availableTemplates.map((template) => {
                        const isActive = activeTemplateType !== null && template.template_type === activeTemplateType
                        const isSelected = selectedPromptIds.includes(template.id)
                        const templateModeType = getModeFromTemplateType(template.template_type)
                        const templateModeColors = templateModeType ? getModeColors(templateModeType) : null
                        return (
                          <PromptInputCommandItem
                            key={template.id}
                            value={template.id}
                            disabled
                            onSelect={() => {
                              // No-op: Lulu prompts are auto-selected based on mode
                            }}
                            className={isActive || isSelected ? '' : 'opacity-75 cursor-not-allowed'}
                          >
                            <FileText className={`size-4 ${templateModeColors ? templateModeColors.text : ''}`} />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-medium text-sm ${templateModeColors ? templateModeColors.text : ''}`}>{template.name}</span>
                                {isBetaFeature(template.template_type) && (
                                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors(templateModeType)}`}>Beta</Badge>
                                )}
                              </div>
                              {template.description && (
                                <span className="text-muted-foreground text-xs">
                                  {template.description}
                                </span>
                              )}
                            </div>
                            {(isActive || isSelected) && <CheckIcon className="ml-auto size-4" />}
                          </PromptInputCommandItem>
                        )
                      })}
                      {modifiedLuluPrompts.map((prompt) => {
                        const isSelected = selectedPromptIds.includes(prompt.id)
                        // Find the corresponding template to check if it's active
                        const correspondingTemplate = templates.find(t => t.template_type === prompt.template_type)
                        const isActive = correspondingTemplate && activeTemplateType !== null && correspondingTemplate.template_type === activeTemplateType
                        const promptModeType = getModeFromTemplateType(prompt.template_type)
                        const promptModeColors = promptModeType ? getModeColors(promptModeType) : null
                        return (
                          <PromptInputCommandItem
                            key={prompt.id}
                            value={prompt.id}
                            disabled
                            onSelect={() => {
                              // No-op: Lulu prompts are auto-selected based on mode
                            }}
                            className={isActive || isSelected ? '' : 'opacity-75 cursor-not-allowed'}
                          >
                            <FileText className={`size-4 ${promptModeColors ? promptModeColors.text : ''}`} />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-medium text-sm ${promptModeColors ? promptModeColors.text : ''}`}>{prompt.name}</span>
                                {isBetaFeature(prompt.template_type) && (
                                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 border ${getModeBadgeColors(promptModeType)}`}>Beta</Badge>
                                )}
                              </div>
                              {prompt.description && (
                                <span className="text-muted-foreground text-xs">
                                  {prompt.description}
                                </span>
                              )}
                            </div>
                            {(isActive || isSelected) && <CheckIcon className="ml-auto size-4" />}
                          </PromptInputCommandItem>
                        )
                      })}
                    </PromptInputCommandGroup>
                    {customUserPrompts.length > 0 && (
                      <PromptInputCommandSeparator />
                    )}
                  </>
                )}
                {customUserPrompts.length > 0 && (
                  <PromptInputCommandGroup heading="My Prompts">
                    {customUserPrompts.map((prompt) => {
                      const isSelected = selectedPromptIds.includes(prompt.id)
                      return (
                        <PromptInputCommandItem
                          key={prompt.id}
                          value={prompt.id}
                          onSelect={() => handleToggle(prompt.id)}
                        >
                          <Copy className="size-4" />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{prompt.name}</span>
                            {prompt.description && (
                              <span className="text-muted-foreground text-xs">
                                {prompt.description}
                              </span>
                            )}
                          </div>
                          {isSelected && <CheckIcon className="ml-auto size-4" />}
                        </PromptInputCommandItem>
                      )
                    })}
                  </PromptInputCommandGroup>
                )}
              </>
            )}
          </PromptInputCommandList>
        </PromptInputCommand>
      </PopoverContent>
    </Popover>
  )
}
