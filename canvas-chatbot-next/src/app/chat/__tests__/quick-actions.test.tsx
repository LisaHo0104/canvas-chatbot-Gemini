import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatPage from '../../chat/page'

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: { full_name: 'Test User', canvas_api_url: null }, error: null })
    }))
  })
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))

describe('ChatPage quick action chips', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = jest.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/ai-providers')) {
        return { ok: true, json: async () => ({ providers: [] }) }
      }
      return { ok: true, json: async () => ({}) }
    })
  })

  it('renders chips and sets input when clicked', async () => {
    render(<ChatPage />)

    // Chips are above input area
    const group = await screen.findByRole('group', { name: /quick actions/i })
    expect(group).toBeInTheDocument()

    const coursesChip = screen.getByRole('button', { name: /current courses/i })
    const deadlinesChip = screen.getByRole('button', { name: /upcoming deadlines/i })
    expect(coursesChip).toBeInTheDocument()
    expect(deadlinesChip).toBeInTheDocument()

    const input = screen.getByPlaceholderText('Ask about your courses, assignments, modules...')

    fireEvent.click(coursesChip)
    await waitFor(() => expect(input).toHaveValue('What are my current courses?'))

    fireEvent.click(deadlinesChip)
    await waitFor(() => expect(input).toHaveValue('What are my upcoming deadlines?'))

    // Ensure no card footers remain in welcome cards
    const footers = document.querySelectorAll('[data-slot="card-footer"]')
    expect(footers.length).toBe(0)
  })
})