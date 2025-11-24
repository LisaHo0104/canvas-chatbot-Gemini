'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, ChevronLeft, ChevronRight, Trash2, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@supabase/ssr'

let supabase: any = null

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (supabaseUrl && supabaseAnonKey) {
    supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
} catch (error) {
  console.error('Error creating Supabase client:', error)
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  lastMessage: Date
  created_at: Date
  updated_at: Date
}

interface EnhancedSidebarProps {
  user: any
  sessions: ChatSession[]
  currentSession: ChatSession | null
  onSessionSelect: (session: ChatSession) => void
  onNewSession: () => void
  onSessionDelete?: (sessionId: string) => void
  onSessionRename?: (sessionId: string, newTitle: string) => void
}

export default function EnhancedSidebar({
  user,
  sessions,
  currentSession,
  onSessionSelect,
  onNewSession,
  onSessionDelete,
  onSessionRename
}: EnhancedSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([])
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // Load sidebar state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebar-collapsed')
      if (savedState !== null) {
        try {
          setIsCollapsed(JSON.parse(savedState))
        } catch (error) {
          console.warn('Failed to parse sidebar state from localStorage:', error)
          setIsCollapsed(false)
        }
      }
    }
  }, [])

  // Save sidebar state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed))
    }
  }, [isCollapsed])

  // Filter sessions based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSessions(sessions)
    } else {
      const filtered = sessions.filter(session =>
        session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(session.messages) && session.messages.some(msg =>
          msg.content.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      )
      setFilteredSessions(filtered)
    }
  }, [searchTerm, sessions])

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getLastMessagePreview = (session: ChatSession) => {
    const msgs = Array.isArray(session.messages) ? session.messages : []
    const lastMessage = msgs[msgs.length - 1]
    if (!lastMessage) return 'No messages yet'

    const preview = lastMessage.content.substring(0, 80)
    return preview.length < lastMessage.content.length ? `${preview}...` : preview
  }

  const handleSessionDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        if (supabase) {
          await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId)
        }

        onSessionDelete?.(sessionId)
      } catch (error) {
        console.error('Error deleting session:', error)
        alert('Failed to delete conversation')
      }
    }
  }

  const handleSessionRename = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setEditingSession(sessionId)
      setEditTitle(session.title)
    }
  }

  const saveSessionRename = async () => {
    if (editingSession && editTitle.trim()) {
      try {
        if (supabase) {
          await supabase
            .from('chat_sessions')
            .update({ title: editTitle.trim() })
            .eq('id', editingSession)
        }

        onSessionRename?.(editingSession, editTitle.trim())
        setEditingSession(null)
        setEditTitle('')
      } catch (error) {
        console.error('Error renaming session:', error)
        alert('Failed to rename conversation')
      }
    }
  }

  const cancelEdit = () => {
    setEditingSession(null)
    setEditTitle('')
  }

  if (isCollapsed) {
    return (
      <div className="relative h-full min-h-0">
        <Button onClick={() => setIsCollapsed(false)} aria-label="Expand sidebar" variant="ghost" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-r-lg shadow-lg text-muted-foreground">
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div className="absolute left-0 top-0 h-full w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-4 z-10 box-border">
          <Button onClick={() => setIsCollapsed(false)} aria-label="Expand sidebar" variant="ghost" size="icon" className="text-muted-foreground">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button onClick={onNewSession} aria-label="New chat" size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Main Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out box-border">
        {/* Header with Toggle */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Conversations</h2>
          <Button onClick={() => setIsCollapsed(true)} aria-label="Collapse sidebar" variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Search Section */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none text-sm"
              aria-label="Search conversations"
            />
          </div>
        </div>

        {/* New Chat Button - Fixed at top */}
        <div className="p-4 border-b border-slate-200">
          <Button onClick={onNewSession} className="w-full">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Conversation History */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
          {filteredSessions.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              {searchTerm ? (
                <div>
                  <p className="mb-2">No conversations found</p>
                  <p className="text-xs text-slate-400">Try adjusting your search terms</p>
                </div>
              ) : (
                <div>
                  <p className="mb-2">No conversations yet</p>
                  <p className="text-xs text-slate-400">Start a new chat to get started</p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative p-4 hover:bg-slate-50 transition-colors cursor-pointer ${currentSession?.id === session.id ? 'bg-slate-100 border-r-2 border-slate-900' : ''
                    }`}
                  onClick={() => onSessionSelect(session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingSession === session.id ? (
                        <div className="mb-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') saveSessionRename()
                              else if (e.key === 'Escape') cancelEdit()
                            }}
                            onBlur={saveSessionRename}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <h3 className="font-medium text-slate-900 truncate text-sm">
                          {session.title}
                        </h3>
                      )}

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {getLastMessagePreview(session)}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-400">
                          {formatDate(session.lastMessage)}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">
                          {formatTime(session.lastMessage)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons - Show on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <Button onClick={(e) => handleSessionRename(session.id, e)} aria-label="Rename conversation" variant="ghost" size="icon" className="text-muted-foreground">
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button onClick={(e) => handleSessionDelete(session.id, e)} aria-label="Delete conversation" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}