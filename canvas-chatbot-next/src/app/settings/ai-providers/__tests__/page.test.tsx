import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AIProvidersSettingsPage from '../page'
import { supabase } from '@/lib/supabase'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

describe('AIProvidersSettingsPage', () => {
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
      config: {},
      usage_stats: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'provider-2',
      provider_name: 'openrouter',
      model_name: 'claude-3-sonnet',
      is_active: false,
      config: {},
      usage_stats: {},
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

      // Mock successful authentication
      ; (supabase.auth.getUser as jest.Mock).mockResolvedValue({
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
      ; (supabase.from as jest.Mock).mockReturnValue(mockSelect)
  })

  it('renders loading state initially', () => {
    render(<AIProvidersSettingsPage />)
    
    expect(screen.getByText('AI Provider Settings')).toBeInTheDocument()
    // The component uses a Spinner component, not text
  })

  it('renders providers list after loading', async () => {
    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Your AI Providers')).toBeInTheDocument()
      expect(screen.getByText('Openrouter')).toBeInTheDocument() // Provider name is capitalized
      expect(screen.getByText('Model: gpt-4')).toBeInTheDocument()
    })

    // Check for active provider indicator
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows add provider form when add button is clicked', async () => {
    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Add Provider')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Provider')
    fireEvent.click(addButton)

    expect(screen.getByText('Add AI Provider')).toBeInTheDocument()
    expect(screen.getByLabelText('Provider')).toBeInTheDocument()
    expect(screen.getByLabelText('Model')).toBeInTheDocument()
    expect(screen.getByLabelText('API Key')).toBeInTheDocument()
  })

  it('validates API key input', async () => {
    const user = userEvent.setup()
    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Provider')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Provider')
    fireEvent.click(addButton)

    const apiKeyInput = screen.getByLabelText('API Key')
    const submitButton = screen.getByText('Add Provider')

    // Try to submit empty form
    await user.click(submitButton)

    expect(mockToast.error).toHaveBeenCalledWith('Please enter an API key')
  })

  it('tests provider connection successfully', async () => {
    // Mock successful connection test
    const mockTestResponse = {
      success: true,
      models: [
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
      ],
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockTestResponse,
    })

    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Provider')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Provider')
    fireEvent.click(addButton)

    const apiKeyInput = screen.getByLabelText('API Key')
    const testButton = screen.getByText('Test Connection')

    await userEvent.type(apiKeyInput, 'test-api-key')
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Connection successful!')
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
      expect(screen.getByText('Claude 3 Sonnet')).toBeInTheDocument()
    })
  })

  it('handles connection test failure', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid API key' }),
    })

    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Provider')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Provider')
    fireEvent.click(addButton)

    const apiKeyInput = screen.getByLabelText('API Key')
    const testButton = screen.getByText('Test Connection')

    await userEvent.type(apiKeyInput, 'invalid-api-key')
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Connection failed: Invalid API key')
    })
  })

  it('adds new provider successfully', async () => {
    const user = userEvent.setup()

    // Mock successful provider creation
    const mockInsert = {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'new-provider-id',
            provider_name: 'openrouter',
            model_name: 'gpt-4',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    }

      ; (supabase.from as jest.Mock).mockReturnValueOnce(mockInsert)

    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Add Provider')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Provider')
    fireEvent.click(addButton)

    const apiKeyInput = screen.getByLabelText('API Key')
    const modelSelect = screen.getByLabelText('Model')
    const submitButton = screen.getByText('Add Provider')

    await user.type(apiKeyInput, 'new-api-key')
    await user.selectOptions(modelSelect, 'gpt-4')

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('AI provider added successfully!')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('toggles provider active status', async () => {
    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
    })

    // Mock update operation
    const mockUpdate = {
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...mockProviders[0], is_active: false },
            error: null,
          }),
        }),
      }),
    }

      ; (supabase.from as jest.Mock).mockReturnValueOnce(mockUpdate)

    const toggleButton = screen.getAllByText('Toggle Active')[0]
    fireEvent.click(toggleButton)

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Provider status updated!')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('deletes provider with confirmation', async () => {
    window.confirm = jest.fn().mockReturnValue(true)

    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
    })

    // Mock delete operation
    const mockDelete = {
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    }

      ; (supabase.from as jest.Mock).mockReturnValueOnce(mockDelete)

    const deleteButton = screen.getAllByText('Delete')[0]
    fireEvent.click(deleteButton)

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this provider?')

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Provider deleted successfully!')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('cancels deletion when user declines confirmation', async () => {
    window.confirm = jest.fn().mockReturnValue(false)

    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
    })

    const deleteButton = screen.getAllByText('Delete')[0]
    fireEvent.click(deleteButton)

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this provider?')
    expect(mockToast.success).not.toHaveBeenCalled()
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('handles authentication errors', async () => {
    // Mock authentication failure
    ; (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('handles database errors gracefully', async () => {
    // Mock database error
    const mockSelect = {
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    }

      ; (supabase.from as jest.Mock).mockReturnValue(mockSelect)

    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load AI providers')
    })
  })

  it('shows usage statistics when available', async () => {
    const mockUsageStats = {
      totalRequests: 42,
      totalTokens: 12500,
      totalCost: 0.025,
      usageData: [
        {
          date: '2024-01-01',
          request_count: 20,
          total_tokens: 5000,
          total_cost: 0.01,
        },
        {
          date: '2024-01-02',
          request_count: 22,
          total_tokens: 7500,
          total_cost: 0.015,
        },
      ],
    }

    // Mock usage stats fetch
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsageStats,
    })

    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
    })

    const usageButton = screen.getAllByText('View Usage')[0]
    fireEvent.click(usageButton)

    await waitFor(() => {
      expect(screen.getByText('Usage Statistics')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument() // total requests
      expect(screen.getByText('12,500')).toBeInTheDocument() // total tokens
      expect(screen.getByText('$0.025')).toBeInTheDocument() // total cost
    })
  })

  it('handles usage stats fetch errors', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch usage stats' }),
    })

    render(<AIProvidersSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
    })

    const usageButton = screen.getAllByText('View Usage')[0]
    fireEvent.click(usageButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to fetch usage statistics')
    })
  })
})