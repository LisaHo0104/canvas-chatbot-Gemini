import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SettingsPage from '@/app/settings/page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: 'user-1', email: 'u@example.com' } } },
        error: null
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ single: jest.fn(async () => ({ data: { canvas_api_url: null }, error: null })) }))
      }))
    }))
  }))
}))

describe('SettingsPage - Canvas Configuration', () => {
  beforeEach(() => {
    ;(global as any).fetch = jest.fn(async (url: string, opts: any) => {
      if (url === '/api/auth/canvas-login') {
        return {
          ok: true,
          json: async () => ({ success: true, message: 'Welcome, Test User!' })
        } as any
      }
      return { ok: false, json: async () => ({}) } as any
    })
  })

  it('renders Canvas configuration section and fields', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText(/settings/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/canvas configuration/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/canvas institution/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/canvas api token/i)).toBeInTheDocument()
  })

  it('submits Canvas configuration successfully', async () => {
    render(<SettingsPage />)

    const tokenInput = await screen.findByLabelText(/canvas api token/i)
    fireEvent.change(tokenInput, { target: { value: 'test-token-123' } })

    const saveButton = screen.getByRole('button', { name: /save canvas settings/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText(/welcome, test user/i)).toBeInTheDocument()
    })
  })
})