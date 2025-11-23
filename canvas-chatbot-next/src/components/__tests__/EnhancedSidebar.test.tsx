import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EnhancedSidebar from '@/components/EnhancedSidebar'
import { ChatSession, Message } from '@/types/chat'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    from: jest.fn(() => ({
      delete: jest.fn(() => ({ eq: jest.fn() })),
      update: jest.fn(() => ({ eq: jest.fn() })),
    })),
  })),
}))

describe('EnhancedSidebar', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_name: 'Test User',
  }

  const mockSessions: ChatSession[] = [
    {
      id: 'session-1',
      title: 'Test Session 1',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello, how are you?',
          timestamp: new Date('2024-01-01T10:00:00'),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'I am doing well, thank you!',
          timestamp: new Date('2024-01-01T10:01:00'),
        },
      ],
      lastMessage: new Date('2024-01-01T10:01:00'),
      created_at: new Date('2024-01-01T10:00:00'),
      updated_at: new Date('2024-01-01T10:01:00'),
    },
    {
      id: 'session-2',
      title: 'Canvas Course Discussion',
      messages: [
        {
          id: 'msg-3',
          role: 'user',
          content: 'What are my current courses?',
          timestamp: new Date('2024-01-02T14:00:00'),
        },
      ],
      lastMessage: new Date('2024-01-02T14:00:00'),
      created_at: new Date('2024-01-02T14:00:00'),
      updated_at: new Date('2024-01-02T14:00:00'),
    },
  ]

  const mockProps = {
    user: mockUser,
    sessions: mockSessions,
    currentSession: mockSessions[0],
    onSessionSelect: jest.fn(),
    onNewSession: jest.fn(),
    onSettingsClick: jest.fn(),
    onLogout: jest.fn(),
    onSessionDelete: jest.fn(),
    onSessionRename: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    })
  })

  describe('Layout and Structure', () => {
    test('renders sidebar with all required sections', () => {
      render(<EnhancedSidebar {...mockProps} />)
      
      // Check for header
      expect(screen.getByText('Conversations')).toBeInTheDocument()
      
      // Check for search section
      expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument()
      
      // Check for new chat button
      expect(screen.getByText('New Chat')).toBeInTheDocument()
      
      // Check for conversation list
      expect(screen.getByText('Test Session 1')).toBeInTheDocument()
      expect(screen.getByText('Canvas Course Discussion')).toBeInTheDocument()
      
      // Check for user info and settings
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    test('displays collapsed sidebar when collapsed state is true', () => {
      // Mock localStorage to return collapsed state
      ;(window.localStorage.getItem as jest.Mock).mockReturnValue('true')
      
      const { rerender } = render(<EnhancedSidebar {...mockProps} />)
      
      // Force re-render to pick up localStorage mock
      rerender(<EnhancedSidebar {...mockProps} />)
      
      // In collapsed state, we should see the expand button
      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    test('filters conversations based on search term', async () => {
      const user = userEvent.setup()
      render(<EnhancedSidebar {...mockProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      
      // Search for "Canvas"
      await user.type(searchInput, 'Canvas')
      
      // Should show only the Canvas session
      expect(screen.getByText('Canvas Course Discussion')).toBeInTheDocument()
      expect(screen.queryByText('Test Session 1')).not.toBeInTheDocument()
      
      // Clear search
      await user.clear(searchInput)
      
      // Both sessions should be visible again
      expect(screen.getByText('Test Session 1')).toBeInTheDocument()
      expect(screen.getByText('Canvas Course Discussion')).toBeInTheDocument()
    })

    test('shows no results message when search yields no matches', async () => {
      const user = userEvent.setup()
      render(<EnhancedSidebar {...mockProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      
      // Search for non-existent term
      await user.type(searchInput, 'NonExistent')
      
      expect(screen.getByText('No conversations found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search terms')).toBeInTheDocument()
    })

    test('searches within message content', async () => {
      const user = userEvent.setup()
      render(<EnhancedSidebar {...mockProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      
      // Search for content within messages
      await user.type(searchInput, 'courses')
      
      // Should find the Canvas session that contains "courses" in the message
      expect(screen.getByText('Canvas Course Discussion')).toBeInTheDocument()
    })
  })

  describe('Interaction Tests', () => {
    test('calls onSessionSelect when conversation is clicked', async () => {
      const user = userEvent.setup()
      render(<EnhancedSidebar {...mockProps} />)
      
      const sessionElement = screen.getByText('Test Session 1').closest('div[class*="cursor-pointer"]')
      expect(sessionElement).toBeInTheDocument()
      
      if (sessionElement) {
        await user.click(sessionElement)
      }
      
      expect(mockProps.onSessionSelect).toHaveBeenCalledWith(mockSessions[0])
    })

    test('calls onNewSession when New Chat button is clicked', async () => {
      const user = userEvent.setup()
      render(<EnhancedSidebar {...mockProps} />)
      
      const newChatButton = screen.getByText('New Chat')
      await user.click(newChatButton)
      
      expect(mockProps.onNewSession).toHaveBeenCalled()
    })

    test('calls onSettingsClick when Settings button is clicked', async () => {
      const user = userEvent.setup()
      render(<EnhancedSidebar {...mockProps} />)
      
      const settingsButton = screen.getByText('Settings')
      await user.click(settingsButton)
      
      expect(mockProps.onSettingsClick).toHaveBeenCalled()
    })

    test('calls onLogout when Logout button is clicked', async () => {
      const user = userEvent.setup()
      render(<EnhancedSidebar {...mockProps} />)
      
      const logoutButton = screen.getByText('Logout')
      await user.click(logoutButton)
      
      expect(mockProps.onLogout).toHaveBeenCalled()
    })
  })

  describe('Sidebar Toggle', () => {
    test('collapses and expands sidebar', async () => {
      const user = userEvent.setup()
      render(<EnhancedSidebar {...mockProps} />)
      
      // Find and click collapse button
      const collapseButton = screen.getByLabelText('Collapse sidebar')
      await user.click(collapseButton)
      
      // Should now show the collapsed state
      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
      
      // Click expand button
      const expandButton = screen.getByLabelText('Expand sidebar')
      await user.click(expandButton)
      
      // Should be back to expanded state
      expect(screen.getByText('Conversations')).toBeInTheDocument()
    })

    test('persists sidebar state in localStorage', async () => {
      const user = userEvent.setup()
      render(<EnhancedSidebar {...mockProps} />)
      
      // Collapse the sidebar
      const collapseButton = screen.getByLabelText('Collapse sidebar')
      await user.click(collapseButton)
      
      // Check that localStorage was called
      expect(window.localStorage.setItem).toHaveBeenCalledWith('sidebar-collapsed', 'true')
    })
  })

  describe('Conversation Management', () => {
    test('shows conversation timestamps', () => {
      render(<EnhancedSidebar {...mockProps} />)
      
      // Should show formatted timestamps (using actual dates from mock data)
      expect(screen.getByText('1/1/2024')).toBeInTheDocument()
      expect(screen.getByText('1/2/2024')).toBeInTheDocument()
    })

    test('shows last message preview', () => {
      render(<EnhancedSidebar {...mockProps} />)
      
      // Should show message previews (last messages from each session)
      expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument()
      expect(screen.getByText('What are my current courses?')).toBeInTheDocument()
    })

    test('highlights current session', () => {
      render(<EnhancedSidebar {...mockProps} />)
      
      // Current session should have special styling - check the parent container
      const sessionContainer = screen.getByText('Test Session 1').closest('div[class*="cursor-pointer"]')
      expect(sessionContainer).toHaveClass('bg-slate-100')
      expect(sessionContainer).toHaveClass('border-r-2')
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<EnhancedSidebar {...mockProps} />)
      
      expect(screen.getByLabelText('Search conversations')).toBeInTheDocument()
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument()
    })

    test('keyboard navigation works', async () => {
      const user = userEvent.setup()
      render(<EnhancedSidebar {...mockProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search conversations...')
      
      // Focus the search input directly
      searchInput.focus()
      expect(searchInput).toHaveFocus()
      
      // Type and press Enter
      await user.type(searchInput, 'test{Enter}')
      
      // Should still be focused
      expect(searchInput).toHaveFocus()
    })
  })

  describe('Responsive Design', () => {
    test('displays properly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      window.dispatchEvent(new Event('resize'))
      
      render(<EnhancedSidebar {...mockProps} />)
      
      // Should still render all elements
      expect(screen.getByText('Conversations')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    test('handles empty sessions gracefully', () => {
      render(<EnhancedSidebar {...mockProps} sessions={[]} />)
      
      expect(screen.getByText('No conversations yet')).toBeInTheDocument()
      expect(screen.getByText('Start a new chat to get started')).toBeInTheDocument()
    })

    test('handles missing user data gracefully', () => {
      render(<EnhancedSidebar {...mockProps} user={null} />)
      
      // Should still render without errors
      expect(screen.getByText('Conversations')).toBeInTheDocument()
    })
  })
})