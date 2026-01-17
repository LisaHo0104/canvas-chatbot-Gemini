import { useState, useCallback } from 'react'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import type { ChatSession, Message } from '../types'

let supabase: any = null

try {
  supabase = createSupabaseClient()
} catch (error) {
  console.error('Error creating Supabase client:', error)
}

export function useSessionManagement() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  const loadChatSessions = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false })

      if (!error && data) {
        const loadedSessions = data.map((session: any) => ({
          id: session.id,
          title: session.title,
          messages: [],
          lastMessage: new Date(session.last_message_at),
          created_at: new Date(session.created_at),
          updated_at: new Date(session.updated_at),
        }))
        setSessions(loadedSessions)
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }, [])

  const createNewSession = useCallback(async (user: any): Promise<ChatSession | null> => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{ user_id: user.id, title: 'New Chat' }])
        .select()
        .single()

      if (error) {
        console.error('Error creating session:', error)
        return null
      }

      if (data) {
        const newSession: ChatSession = {
          id: data.id,
          title: data.title,
          messages: [],
          lastMessage: new Date(data.updated_at),
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
        }

        setSessions(prev => [newSession, ...prev])
        setCurrentSession(newSession)
        try {
          if (typeof window !== 'undefined') {
            ; (window as any).__currentSessionId = newSession.id
            localStorage.setItem('currentSessionId', newSession.id)
          }
        } catch { }
        return newSession
      }
    } catch (error) {
      console.error('Error creating session:', error)
    }
    return null
  }, [])

  const startEphemeralSession = useCallback(() => {
    setCurrentSession(null)
    try {
      if (typeof window !== 'undefined') {
        ; (window as any).__currentSessionId = undefined
        localStorage.removeItem('currentSessionId')
      }
    } catch { }
  }, [])

  const handleSessionSelect = useCallback(async (
    session: ChatSession,
    setUIMessages: (messages: any) => void,
    setSuggestionsVisible: (visible: boolean) => void,
    setDynamicSuggestions: (suggestions: string[]) => void,
    suppressAutoSuggestionsRef: React.MutableRefObject<boolean>,
    lastUpdatedAssistantIdRef: React.MutableRefObject<string | null>,
    handleCloseArtifact: () => void
  ) => {
    suppressAutoSuggestionsRef.current = true
    setSuggestionsVisible(false)
    setDynamicSuggestions([])
    handleCloseArtifact()
    
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, role, ui_parts, metadata, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      const loadedMessages = data.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: Array.isArray(msg.ui_parts)
          ? msg.ui_parts
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => String(p.text || ''))
            .join('')
          : '',
        timestamp: new Date(msg.created_at),
        provider_type: msg.metadata?.provider_type,
        provider_id: msg.metadata?.provider_id,
      }))

      setMessages(loadedMessages)
      const uiHistory = data.map((msg: any) => ({ id: msg.id, role: msg.role, parts: Array.isArray(msg.ui_parts) ? msg.ui_parts : [] }))
      setUIMessages(uiHistory as any)
      try {
        const lastAssistantInHistory = [...uiHistory].reverse().find((m: any) => m.role === 'assistant')
        if (lastAssistantInHistory?.id) {
          lastUpdatedAssistantIdRef.current = String(lastAssistantInHistory.id)
        }
      } catch { }
      setCurrentSession({ ...session, messages: loadedMessages })
      try {
        if (typeof window !== 'undefined') {
          ; (window as any).__currentSessionId = session.id
          localStorage.setItem('currentSessionId', session.id)
        }
      } catch { }
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, messages: loadedMessages } : s))
    } else {
      setCurrentSession(session)
      try {
        if (typeof window !== 'undefined') {
          ; (window as any).__currentSessionId = session.id
          localStorage.setItem('currentSessionId', session.id)
        }
      } catch { }
      setUIMessages([])
    }
  }, [])

  const handleSessionDelete = useCallback(async (sessionId: string, setUIMessages: (messages: any) => void) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    setCurrentSession(null)
    setUIMessages([])
    try {
      if (typeof window !== 'undefined') {
        ; (window as any).__currentSessionId = undefined
        localStorage.removeItem('currentSessionId')
      }
    } catch { }
  }, [])

  const handleSessionRename = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s))
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null)
    }
  }, [currentSession])

  return {
    sessions,
    setSessions,
    currentSession,
    setCurrentSession,
    messages,
    setMessages,
    loadChatSessions,
    createNewSession,
    startEphemeralSession,
    handleSessionSelect,
    handleSessionDelete,
    handleSessionRename,
  }
}
