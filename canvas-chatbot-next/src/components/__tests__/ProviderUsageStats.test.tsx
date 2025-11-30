import { render, screen, fireEvent } from '@testing-library/react'
import ProviderUsageStats from '../ProviderUsageStats'

describe('ProviderUsageStats', () => {
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

  const mockProvider = {
    id: 'test-provider-id',
    provider_name: 'openrouter',
    model_name: 'gpt-4',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  it('renders usage statistics correctly', () => {
    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={mockUsageStats}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByText('Usage Statistics')).toBeInTheDocument()
    expect(screen.getByText('GPT-4')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument() // total requests
    expect(screen.getByText('12,500')).toBeInTheDocument() // total tokens
    expect(screen.getByText('$0.025')).toBeInTheDocument() // total cost
  })

  it('renders usage chart when data is available', () => {
    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={mockUsageStats}
        onClose={jest.fn()}
      />
    )

    // Check for chart elements (assuming recharts is used)
    expect(screen.getByRole('img')).toBeInTheDocument() // Chart should be present
  })

  it('handles empty usage data', () => {
    const emptyStats = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      usageData: [],
    }

    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={emptyStats}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByText('No usage data available')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // total requests
    expect(screen.getByText('0')).toBeInTheDocument() // total tokens
    expect(screen.getByText('$0.00')).toBeInTheDocument() // total cost
  })

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn()
    
    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={mockUsageStats}
        onClose={mockOnClose}
      />
    )

    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('displays cost per token calculation', () => {
    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={mockUsageStats}
        onClose={jest.fn()}
      />
    )

    // Cost per token should be totalCost / totalTokens = 0.025 / 12500 = 0.000002
    expect(screen.getByText('$0.000002')).toBeInTheDocument()
  })

  it('renders date range information', () => {
    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={mockUsageStats}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument()
    expect(screen.getByText('Jan 2, 2024')).toBeInTheDocument()
  })

  it('handles single day usage data', () => {
    const singleDayStats = {
      totalRequests: 10,
      totalTokens: 2500,
      totalCost: 0.005,
      usageData: [
        {
          date: '2024-01-01',
          request_count: 10,
          total_tokens: 2500,
          total_cost: 0.005,
        },
      ],
    }

    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={singleDayStats}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('2,500')).toBeInTheDocument()
    expect(screen.getByText('$0.005')).toBeInTheDocument()
  })

  it('renders average daily usage statistics', () => {
    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={mockUsageStats}
        onClose={jest.fn()}
      />
    )

    // Average daily requests: 42 / 2 days = 21
    expect(screen.getByText('21.0')).toBeInTheDocument()
    // Average daily tokens: 12500 / 2 days = 6250
    expect(screen.getByText('6,250')).toBeInTheDocument()
    // Average daily cost: 0.025 / 2 days = 0.0125
    expect(screen.getByText('$0.013')).toBeInTheDocument()
  })

  it('handles very small cost values', () => {
    const smallCostStats = {
      totalRequests: 1,
      totalTokens: 10,
      totalCost: 0.00001,
      usageData: [
        {
          date: '2024-01-01',
          request_count: 1,
          total_tokens: 10,
          total_cost: 0.00001,
        },
      ],
    }

    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={smallCostStats}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByText('$0.000010')).toBeInTheDocument() // total cost
    expect(screen.getByText('$0.000001')).toBeInTheDocument() // cost per token
  })

  it('renders responsive layout', () => {
    const { container } = render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={mockUsageStats}
        onClose={jest.fn()}
      />
    )

    // Check for responsive classes
    const modal = container.querySelector('.modal')
    expect(modal).toHaveClass('modal', 'modal-lg')
  })

  it('displays loading state while fetching data', () => {
    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={null}
        onClose={jest.fn()}
        loading={true}
      />
    )

    expect(screen.getByText('Loading usage statistics...')).toBeInTheDocument()
  })

  it('handles error state', () => {
    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={null}
        onClose={jest.fn()}
        error="Failed to fetch usage statistics"
      />
    )

    expect(screen.getByText('Error loading usage statistics')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch usage statistics')).toBeInTheDocument()
  })

  it('renders export functionality', () => {
    render(
      <ProviderUsageStats
        provider={mockProvider}
        usageStats={mockUsageStats}
        onClose={jest.fn()}
        showExport={true}
      />
    )

    expect(screen.getByText('Export Data')).toBeInTheDocument()
    
    const exportButton = screen.getByText('Export Data')
    fireEvent.click(exportButton)

    // Should trigger download (implementation depends on actual export logic)
    expect(screen.getByText('Exporting...')).toBeInTheDocument()
  })
})