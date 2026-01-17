import { useState, useMemo, useRef } from 'react'
import { startTransition } from 'react'
import type { SelectedContext } from '../types'

export function useSuggestions(hasContext: boolean, selectedContext: SelectedContext) {
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionsVisible, setSuggestionsVisible] = useState<boolean>(true)
  const lastAssistantIdRef = useRef<string | null>(null)
  const lastUpdatedAssistantIdRef = useRef<string | null>(null)
  const suppressAutoSuggestionsRef = useRef<boolean>(false)

  const staticSuggestions = useMemo(() => {
    if (hasContext) {
      return [
        'Tell me more about my selected items',
        'List upcoming deadlines for these courses',
        'Summarize announcements for my context',
        'What should I focus on first?',
      ]
    }
    return [
      'Show my current courses',
      'List upcoming deadlines',
      'Summarize latest Canvas announcements',
      'What modules need attention this week?',
    ]
  }, [hasContext])

  const rubricSuggestions = useMemo(() => {
    if (selectedContext.assignments.length > 0) {
      return [
        'Analyze the rubric for my selected assignments',
        'What are the key criteria for these assignments?',
        'Help me understand these rubric requirements',
        'Show me examples for these criteria',
      ]
    }
    return [
      'Analyze the rubric for assignments I mention',
      'What are the key criteria in the rubric?',
      'Help me understand the rubric requirements',
      'Show me examples for each criterion',
    ]
  }, [selectedContext.assignments.length])

  const quizSuggestions = useMemo(() => {
    if (hasContext) {
      return [
        'Generate a quiz for my selected context',
        'Create a practice test from these items',
        'Give me some practice questions',
        'Help me study for my upcoming quiz',
      ]
    }
    return [
      'Generate a quiz for modules I mention',
      'Create a practice test for my assignment',
      'Help me study for an upcoming quiz',
      'Give me practice questions for my course',
    ]
  }, [hasContext])

  const studyPlanSuggestions = useMemo(() => {
    if (hasContext) {
      return [
        'Create a study plan for my selected items',
        'How should I prioritize these tasks?',
        'Help me organize my study schedule',
        'Break down these topics into a plan',
      ]
    }
    return [
      'Create a study plan for courses I mention',
      'How should I prioritize my assignments?',
      'Help me organize my week',
      'Break down my modules into a study schedule',
    ]
  }, [hasContext])

  const assignmentPlanSuggestions = useMemo(() => {
    if (selectedContext.assignments.length > 0) {
      return [
        'Help me plan this assignment',
        'Create a plan for completing this assignment',
        'Break down this assignment into steps',
        'What should I do first for this assignment?',
      ]
    }
    return [
      'Help me plan an assignment',
      'Create an assignment plan',
      'Break down my assignment into manageable steps',
      'Guide me through completing my assignment',
    ]
  }, [selectedContext.assignments.length])

  const regenerateAllSuggestions = async (
    uiMessages: any[],
    activeProvider: any,
    selectedModel: string,
    selectedContext: SelectedContext,
    mode: string | null
  ) => {
    setLoadingSuggestions(true)
    setSuggestionsVisible(true)
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: uiMessages,
          provider_id: activeProvider?.id,
          model: selectedModel,
          model_override: activeProvider?.provider_name === 'openrouter' ? selectedModel : selectedModel,
          max_suggestions: 4,
          selected_context: selectedContext,
          mode: mode,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
        startTransition(() => {
          setDynamicSuggestions(suggestions)
        })
      }
    } catch (e) {
      console.error('Failed to regenerate suggestions', e)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  return {
    dynamicSuggestions,
    setDynamicSuggestions,
    loadingSuggestions,
    setLoadingSuggestions,
    suggestionsVisible,
    setSuggestionsVisible,
    lastAssistantIdRef,
    lastUpdatedAssistantIdRef,
    suppressAutoSuggestionsRef,
    staticSuggestions,
    rubricSuggestions,
    quizSuggestions,
    studyPlanSuggestions,
    assignmentPlanSuggestions,
    regenerateAllSuggestions,
  }
}
