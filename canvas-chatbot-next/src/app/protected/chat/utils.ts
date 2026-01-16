import type { Message, ChatSession } from './types'

export const formatDate = (date: Date): string => {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays > 1 && diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const mapUIMessagesToSessionMessages = (uiMessages: any[]): Message[] => {
  const now = new Date()
  return uiMessages
    .map((m: any) => {
      const text = (Array.isArray(m.parts) ? m.parts : [])
        .filter((p: any) => p.type === 'text')
        .map((p: any) => String(p.text || ''))
        .join('')
      if (!String(text || '').trim()) return null as any
      return {
        id: String(m.id || `${Date.now()}`),
        role: m.role,
        content: text,
        timestamp: now,
      } as Message
    })
    .filter(Boolean) as Message[]
}

// Mapping between modes and system prompt template types
export const MODE_TO_TEMPLATE_TYPE: Record<string, string> = {
  'rubric': 'rubric_analysis',
  'quiz': 'quiz_generation',
  'study-plan': 'study_plan',
  'note': 'note_generation',
}

export const TEMPLATE_TYPE_TO_MODE: Record<string, string | null> = {
  'rubric_analysis': 'rubric',
  'quiz_generation': 'quiz',
  'study_plan': 'study-plan',
  'note_generation': 'note',
  'default': null,
}
