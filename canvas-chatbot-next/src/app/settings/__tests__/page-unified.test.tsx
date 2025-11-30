import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsPage from '../page'

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1', email: 'test@example.com' } } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { canvas_api_url: 'https://swinburne.instructure.com/api/v1' }, error: null }),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('Unified Settings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as any) = jest.fn(async (url: string) => {
      if (url.includes('/api/auth/canvas-login')) {
        return {
          ok: true,
          json: async () => ({ message: 'Canvas configuration saved' }),
        }
      }
      return {
        ok: true,
        json: async () => ({}),
      }
    })
  })

  it('renders both sections', async () => {
    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
    expect(screen.getByText('Canvas Configuration')).toBeInTheDocument()
    expect(screen.getByText('AI Providers Configuration')).toBeInTheDocument()
  })

  it('submits Canvas form successfully', async () => {
    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByLabelText('Canvas API Token')).toBeInTheDocument()
    })
    const tokenInput = screen.getByLabelText('Canvas API Token')
    fireEvent.change(tokenInput, { target: { value: 'test-token' } })
    const saveButton = screen.getByRole('button', { name: 'Save Canvas Settings' })
    fireEvent.click(saveButton)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/canvas-login', expect.any(Object))
      expect(screen.getByText('Canvas configuration saved')).toBeInTheDocument()
    })
  })
})