'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Settings, Menu, X, ChevronLeft, ChevronRight, Trash2, Edit3 } from 'lucide-react'
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
  onSettingsClick: () => void
  onLogout: () => void
  onSessionDelete?: (sessionId: string) => void
  onSessionRename?: (sessionId: string, newTitle: string) => void
}

export default function EnhancedSidebar({
  user,
  sessions,
  currentSession,
  onSessionSelect,
  onNewSession,
  onSettingsClick,
  onLogout,
  onSessionDelete,
  onSessionRename
}: EnhancedSidebarProps) {
  const router = useRouter()
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
      <div className="relative">
        {/* Collapsed Sidebar Toggle */}
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed left-0 top-1/2 transform -translate-y-1/2 z-50 bg-slate-900 text-white p-2 rounded-r-lg shadow-lg hover:bg-slate-800 transition-all duration-300"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Mini sidebar for quick access */}
        <div className="fixed left-0 top-0 h-full w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 space-y-4 z-40">
          <button
            onClick={onNewSession}
            className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={onSettingsClick}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Main Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out">
        {/* Header with Toggle */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Conversations</h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
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
          <button
            onClick={onNewSession}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Conversation History */}
        <div className="flex-1 overflow-y-auto">
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
                      <button
                        onClick={(e) => handleSessionRename(session.id, e)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
                        aria-label="Rename conversation"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleSessionDelete(session.id, e)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Info & Settings - Fixed at bottom */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-slate-600">
                  {user?.user_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.user_name || user?.email}
                </p>
                <p className="text-xs text-slate-500">Online</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
            >
              Logout
            </button>
          </div>

          <button
            onClick={onSettingsClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>
    </div>
  )
}