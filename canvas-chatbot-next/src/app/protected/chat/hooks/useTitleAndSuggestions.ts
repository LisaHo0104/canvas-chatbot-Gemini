import { useEffect, useRef } from 'react'
import { startTransition } from 'react'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { mapUIMessagesToSessionMessages } from '../utils'
import type { ChatSession } from '../types'

let supabase: any = null

try {
  supabase = createSupabaseClient()
} catch (error) {
  console.error('Error creating Supabase client:', error)
}

export function useTitleAndSuggestions(
  uiMessages: any[],
  status: string,
  selectedModel: string,
  activeProvider: any,
  currentSession: ChatSession | null,
  selectedContext: { courses: number[]; assignments: number[]; modules: number[] },
  mode: string | null,
  setTitleGenerating: (value: boolean) => void,
  setLoadingSuggestions: (value: boolean) => void,
  setSuggestionsVisible: (value: boolean) => void,
  setDynamicSuggestions: (suggestions: string[]) => void,
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>,
  setCurrentSession: React.Dispatch<React.SetStateAction<ChatSession | null>>,
  lastAssistantIdRef: React.MutableRefObject<string | null>,
  lastUpdatedAssistantIdRef: React.MutableRefObject<string | null>,
  suppressAutoSuggestionsRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    const lastAssistant = [...uiMessages].reverse().find((m) => m.role === 'assistant')
    const isIdle = status !== 'streaming' && status !== 'submitted'
    if (!lastAssistant || !isIdle) return
    
    // Check if we've already processed this assistant message
    if (lastUpdatedAssistantIdRef.current === lastAssistant.id) return
    
    const finalAssistantText = lastAssistant.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => String(p.text || ''))
      .join('')
    if (!String(finalAssistantText || '').trim()) return

    const hasFinalText = lastAssistant.parts.some((p: any) => p.type === 'text' && String((p as any).text || '').trim().length > 0)
    if (!hasFinalText) return

    // Mark as processing to prevent duplicate runs
    lastUpdatedAssistantIdRef.current = lastAssistant.id
    
    const lastUser = [...uiMessages].reverse().find((m) => m.role === 'user')
    const lastUserText = lastUser
      ? lastUser.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => String(p.text || ''))
        .join('')
      : ''

    const mappedMessages = mapUIMessagesToSessionMessages(uiMessages)
    const needsTitle = !currentSession?.title || currentSession?.title === 'New Chat'
    const needsSuggestions = !suppressAutoSuggestionsRef.current && lastAssistantIdRef.current !== lastAssistant.id

    // Set loading states immediately
    if (needsTitle) {
      setTitleGenerating(true)
    }
    if (needsSuggestions) {
      setLoadingSuggestions(true)
      setSuggestionsVisible(true)
    }

    // Reset suppress flag if it was set
    if (suppressAutoSuggestionsRef.current) {
      suppressAutoSuggestionsRef.current = false
    }

    ; (async () => {
      try {
        const now = new Date()
        // Run title and suggestions generation in parallel
        const [titleResult, suggestionsResult] = await Promise.allSettled([
          needsTitle
            ? fetch('/api/session-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  messages: uiMessages,
                  model: selectedModel,
                  model_override: selectedModel,
                }),
              }).then(async (res) => {
                if (res.ok) {
                  const data = await res.json()
                  const title = typeof data?.title === 'string' ? data.title.trim() : ''
                  return title || null
                }
                return null
              })
            : Promise.resolve(null),
          needsSuggestions
            ? fetch('/api/suggestions', {
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
              }).then(async (res) => {
                if (res.ok) {
                  const data = await res.json()
                  const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
                  return suggestions
                }
                return []
              })
            : Promise.resolve([]),
        ])

        // Process title result
        let generatedTitle: string | null = null
        if (needsTitle) {
          if (titleResult.status === 'fulfilled' && titleResult.value) {
            generatedTitle = titleResult.value
          } else if (titleResult.status === 'rejected') {
            console.error('Failed to generate session title', titleResult.reason)
          }
        }

        // Process suggestions result
        if (needsSuggestions) {
          if (suggestionsResult.status === 'fulfilled') {
            const suggestions = suggestionsResult.value
            startTransition(() => {
              setDynamicSuggestions(suggestions)
              lastAssistantIdRef.current = lastAssistant.id
            })
          } else if (suggestionsResult.status === 'rejected') {
            console.error('Failed to load suggestions', suggestionsResult.reason)
          }
        }

        // Update title and session state
        const fallbackTitleBase = String(lastUserText || '').substring(0, 50)
        const fallbackTitle = fallbackTitleBase + (String(lastUserText || '').length > 50 ? '...' : '')
        const finalTitle = generatedTitle || fallbackTitle

        startTransition(() => {
          setSessions((prev) => {
            const updated = prev.map((s) => {
              if (!currentSession || s.id !== currentSession.id) return s
              return {
                ...s,
                title: finalTitle,
                messages: mappedMessages,
                lastMessage: now,
                updated_at: now,
              }
            })
            return updated.sort((a, b) => b.lastMessage.getTime() - a.lastMessage.getTime())
          })

          setCurrentSession((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              title: finalTitle,
              messages: mappedMessages,
              lastMessage: now,
              updated_at: now,
            }
          })
        })

        // Persist title to database (non-blocking)
        if (needsTitle && generatedTitle) {
          try {
            const id = currentSession?.id
            if (id && supabase) {
              await supabase
                .from('chat_sessions')
                .update({ title: finalTitle })
                .eq('id', id)
            }
          } catch (e) {
            console.error('Failed to persist session title', e)
          }
        }
      } catch (e) {
        console.error('Error in title/suggestions generation', e)
      } finally {
        if (needsTitle) {
          setTitleGenerating(false)
        }
        if (needsSuggestions) {
          setLoadingSuggestions(false)
        }
      }
    })()
  }, [uiMessages, status, selectedModel, activeProvider, currentSession, selectedContext, mode, setTitleGenerating, setLoadingSuggestions, setSuggestionsVisible, setDynamicSuggestions, setSessions, setCurrentSession, lastAssistantIdRef, lastUpdatedAssistantIdRef, suppressAutoSuggestionsRef])
}
