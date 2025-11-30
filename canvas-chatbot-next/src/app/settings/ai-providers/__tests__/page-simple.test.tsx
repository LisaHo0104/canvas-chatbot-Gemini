import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AIProvidersSettingsPage from '../page'

// Mock fetch API
global.fetch = jest.fn()

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
    
    // Mock successful providers fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: mockProviders }),
    })
  })

  it('renders loading state initially', () => {
    render(<AIProvidersSettingsPage />)
    
    expect(screen.getByText('AI Provider Settings')).toBeInTheDocument()
  })

  it('renders providers list after loading', async () => {
    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Your AI Providers')).toBeInTheDocument()
      expect(screen.getByText('Openrouter')).toBeInTheDocument()
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

    await waitFor(() => {
      expect(screen.getByText('Add AI Provider')).toBeInTheDocument()
      expect(screen.getByLabelText('Provider')).toBeInTheDocument()
      expect(screen.getByLabelText('Model')).toBeInTheDocument()
      expect(screen.getByLabelText('API Key')).toBeInTheDocument()
    })
  })

  it('handles provider creation successfully', async () => {
    const user = userEvent.setup()
    
    // Mock successful provider creation
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Add Provider')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Provider')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByLabelText('API Key')).toBeInTheDocument()
    })

    const apiKeyInput = screen.getByLabelText('API Key')
    await user.type(apiKeyInput, 'test-api-key')

    const submitButton = screen.getByText('Add')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'openrouter',
          apiKey: 'test-api-key',
          model: 'anthropic/claude-3.5-sonnet'
        })
      })
    })
  })

  it('handles provider creation failure', async () => {
    const user = userEvent.setup()
    
    // Mock failed provider creation
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid API key' }),
    })

    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Add Provider')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Provider')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByLabelText('API Key')).toBeInTheDocument()
    })

    const apiKeyInput = screen.getByLabelText('API Key')
    await user.type(apiKeyInput, 'invalid-api-key')

    const submitButton = screen.getByText('Add')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid API key')).toBeInTheDocument()
    })
  })

  it('tests provider connection successfully', async () => {
    // Mock successful connection test
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    // Mock alert
    global.alert = jest.fn()

    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Connection')).toBeInTheDocument()
    })

    const testButton = screen.getAllByText('Test Connection')[0]
    fireEvent.click(testButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: 'provider-1' })
      })
      expect(global.alert).toHaveBeenCalledWith('Connection test successful!')
    })
  })

  it('sets provider as active', async () => {
    // Mock successful activation
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Set Active')).toBeInTheDocument()
    })

    const setActiveButton = screen.getByText('Set Active')
    fireEvent.click(setActiveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-providers/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: 'provider-2' })
      })
    })
  })

  it('deletes provider with confirmation', async () => {
    // Mock user confirmation
    global.confirm = jest.fn().mockReturnValue(true)
    
    // Mock successful deletion
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getAllByText('Delete')).toBeInTheDocument()
    })

    const deleteButton = screen.getAllByText('Delete')[0]
    fireEvent.click(deleteButton)

    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this AI provider?')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-providers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: 'provider-1' })
      })
    })
  })

  it('cancels deletion when user declines confirmation', async () => {
    // Mock user declining confirmation
    global.confirm = jest.fn().mockReturnValue(false)

    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getAllByText('Delete')).toBeInTheDocument()
    })

    const deleteButton = screen.getAllByText('Delete')[0]
    fireEvent.click(deleteButton)

    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this AI provider?')
    expect(global.fetch).not.toHaveBeenCalledWith('/api/ai-providers', expect.any(Object))
  })

  it('shows usage statistics modal', async () => {
    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getAllByText('Usage Stats')).toBeInTheDocument()
    })

    const usageButton = screen.getAllByText('Usage Stats')[0]
    fireEvent.click(usageButton)

    await waitFor(() => {
      expect(screen.getByText('Provider Usage Statistics')).toBeInTheDocument()
    })
  })

  it('handles fetch errors gracefully', async () => {
    // Mock fetch error
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to fetch providers' }),
    })

    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch providers')).toBeInTheDocument()
    })
  })

  it('handles empty providers list', async () => {
    // Mock empty providers
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: [] }),
    })

    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('No AI providers configured')).toBeInTheDocument()
      expect(screen.getByText('Add your first AI provider to start using the chat functionality.')).toBeInTheDocument()
      expect(screen.getByText('Add Your First Provider')).toBeInTheDocument()
    })
  })

  it('handles network errors', async () => {
    // Mock network error
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('fetches OpenRouter models when API key is entered', async () => {
    const user = userEvent.setup()
    
    // Mock successful models fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        models: [
          { id: 'gpt-4', name: 'GPT-4' },
          { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' }
        ] 
      }),
    })

    render(<AIProvidersSettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Add Provider')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add Provider')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByLabelText('Provider')).toBeInTheDocument()
    })

    // Change to OpenRouter provider
    const providerSelect = screen.getByLabelText('Provider')
    await user.selectOptions(providerSelect, 'openrouter')

    // Enter API key
    const apiKeyInput = screen.getByLabelText('API Key')
    await user.type(apiKeyInput, 'test-openrouter-api-key-longer-than-20-chars')

    // Wait for debounced fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/openrouter/models'))
    }, { timeout: 2000 })
  })
})