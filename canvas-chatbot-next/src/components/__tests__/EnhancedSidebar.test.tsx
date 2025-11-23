import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EnhancedSidebar from '../EnhancedSidebar'
import { supabase } from '@/lib/supabase'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      order: jest.fn(),
    })),
  },
}))

// Mock next/navigation
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => '/chat',
}))

// Mock sonner toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  promise: jest.fn(),
}

jest.mock('sonner', () => ({
  toast: mockToast,
}))

describe('EnhancedSidebar', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  const mockProviders = [
    {
      id: 'provider-1',
      provider_name: 'openrouter',
      model_name: 'gpt-4',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'provider-2',
      provider_name: 'openrouter',
      model_name: 'claude-3-sonnet',
      is_active: false,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful authentication
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    // Mock providers fetch
    const mockSelect = {
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockProviders,
        error: null,
      }),
    }
    ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)
  })

  it('renders sidebar with navigation links', async () => {
    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Canvas Chatbot')).toBeInTheDocument()
    })

    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('AI Providers')).toBeInTheDocument()
  })

  it('renders active AI provider information', async () => {
    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Active Provider')).toBeInTheDocument()
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
      expect(screen.getByText('OpenRouter')).toBeInTheDocument()
    })
  })

  it('shows provider switching dropdown', async () => {
    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Switch Provider')).toBeInTheDocument()
    })

    const switchButton = screen.getByText('Switch Provider')
    fireEvent.click(switchButton)

    expect(screen.getByText('GPT-4')).toBeInTheDocument()
    expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument()
  })

  it('switches provider successfully', async () => {
    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Switch Provider')).toBeInTheDocument()
    })

    // Mock provider update
    const mockUpdate = {
      eq: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: { success: true },
              error: null,
            }),
          }),
        }),
      }),
    }
    
    ;(supabase.from as jest.Mock).mockReturnValueOnce(mockUpdate)

    const switchButton = screen.getByText('Switch Provider')
    fireEvent.click(switchButton)

    const claudeOption = screen.getByText('Claude 3 Sonnet')
    fireEvent.click(claudeOption)

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Provider switched to Claude 3 Sonnet')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('handles provider switch failure', async () => {
    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Switch Provider')).toBeInTheDocument()
    })

    // Mock provider update failure
    const mockUpdate = {
      eq: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Failed to switch provider' },
            }),
          }),
        }),
      }),
    }
    
    ;(supabase.from as jest.Mock).mockReturnValueOnce(mockUpdate)

    const switchButton = screen.getByText('Switch Provider')
    fireEvent.click(switchButton)

    const claudeOption = screen.getByText('Claude 3 Sonnet')
    fireEvent.click(claudeOption)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to switch provider')
    })
  })

  it('shows provider status indicators', async () => {
    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Active Provider')).toBeInTheDocument()
    })

    // Check for active status indicator
    const activeProvider = screen.getByText('GPT-4').closest('div')
    expect(activeProvider).toHaveClass('bg-green-100', 'text-green-800')
    
    // Check for inactive providers in dropdown
    const switchButton = screen.getByText('Switch Provider')
    fireEvent.click(switchButton)

    const claudeOption = screen.getByText('Claude 3 Sonnet').closest('button')
    expect(claudeOption).toHaveClass('text-gray-600')
  })

  it('navigates to settings page', async () => {
    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    const settingsLink = screen.getByText('Settings')
    fireEvent.click(settingsLink)

    expect(mockPush).toHaveBeenCalledWith('/settings')
  })

  it('navigates to AI providers page', async () => {
    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('AI Providers')).toBeInTheDocument()
    })

    const providersLink = screen.getByText('AI Providers')
    fireEvent.click(providersLink)

    expect(mockPush).toHaveBeenCalledWith('/settings/ai-providers')
  })

  it('navigates to chat page', async () => {
    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Chat')).toBeInTheDocument()
    })

    const chatLink = screen.getByText('Chat')
    fireEvent.click(chatLink)

    expect(mockPush).toHaveBeenCalledWith('/chat')
  })

  it('handles authentication errors', async () => {
    // Mock authentication failure
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('shows loading state while fetching providers', () => {
    render(<EnhancedSidebar />)
    
    expect(screen.getByText('Loading providers...')).toBeInTheDocument()
  })

  it('handles no providers available', async () => {
    // Mock empty providers
    const mockSelect = {
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }
    
    ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('No active providers')).toBeInTheDocument()
      expect(screen.getByText('Add Provider')).toBeInTheDocument()
    })
  })

  it('shows provider usage information', async () => {
    const mockUsageStats = {
      totalRequests: 42,
      totalTokens: 12500,
      totalCost: 0.025,
    }

    // Mock usage stats fetch
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsageStats,
    })

    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('42 requests')).toBeInTheDocument()
      expect(screen.getByText('12.5K tokens')).toBeInTheDocument()
      expect(screen.getByText('$0.025')).toBeInTheDocument()
    })
  })

  it('handles usage stats fetch failure gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch usage stats' }),
    })

    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Active Provider')).toBeInTheDocument()
      // Should still show provider info even if usage stats fail
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
    })
  })

  it('renders responsive design', async () => {
    const { container } = render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Canvas Chatbot')).toBeInTheDocument()
    })

    // Check for responsive classes
    const sidebar = container.querySelector('.sidebar')
    expect(sidebar).toHaveClass('sidebar', 'sidebar-responsive')
  })

  it('shows provider connection status', async () => {
    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(screen.getByText('Active Provider')).toBeInTheDocument()
    })

    // Should show connection status indicator
    const statusIndicator = screen.getByRole('status')
    expect(statusIndicator).toHaveClass('bg-green-500')
  })

  it('handles provider fetch errors', async () => {
    // Mock database error
    const mockSelect = {
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    }
    
    ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

    render(<EnhancedSidebar />)
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load AI providers')
    })
  })
})