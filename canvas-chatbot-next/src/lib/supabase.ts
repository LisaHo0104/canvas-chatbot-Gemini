import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  canvas_api_key?: string // Encrypted Canvas API key
  canvas_url?: string
  user_name?: string
  canvas_user_id?: string
}

export interface ChatMessage {
  id: string
  user_id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  metadata?: Record<string, any>
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface CanvasAPICache {
  id: string
  user_id: string
  cache_key: string
  data: any
  created_at: string
  expires_at: string
}