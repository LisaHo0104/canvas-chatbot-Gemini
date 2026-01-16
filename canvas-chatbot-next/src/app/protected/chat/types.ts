export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  provider_type?: 'configured' | 'legacy'
  provider_id?: string
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  lastMessage: Date
  created_at: Date
  updated_at: Date
}

export interface AvailableContext {
  courses: Array<{ id: number; name: string; code?: string }>
  assignments: Array<{ id: number; name: string; course_id?: number }>
  modules: Array<{ id: number; name: string; course_id?: number }>
}

export interface SelectedContext {
  courses: number[]
  assignments: number[]
  modules: number[]
}

export interface ArtifactPanelData {
  type: 'quiz' | 'rubric' | 'note'
  data: any
  messageId?: string
}

export interface EditingState {
  messageId: string
  partIndex: number
  originalText: string
  generatedText: string | null
  loading: boolean
  error: string | null
  operation: 'improve' | 'shorten' | 'expand' | 'rewrite'
}

export interface TextSelection {
  text: string
  range: Range | null
  bounds: DOMRect | null
  messageId: string
  partIndex: number
}
