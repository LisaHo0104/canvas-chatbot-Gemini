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

describe('ChatPage model storage sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = jest.fn(async (url: string, init?: any) => {
      if (typeof url === 'string' && url.includes('/api/ai-providers')) {
        return { ok: true, json: async () => ({ providers: [{ id: 'p1', provider_name: 'openrouter', model_name: 'anthropic/claude-3.5-sonnet', is_active: true }] }) }
      }
      if (typeof url === 'string' && url.includes('/api/chat')) {
        // Echo the request for assertion
        const body = JSON.parse(init?.body || '{}')
        return { ok: true, json: async () => ({ response: 'ok', usage: {}, body }) }
      }
      return { ok: true, json: async () => ({}) }
    })
    localStorage.clear()
  })

  it('updates selectedModel via storage event and sends model_override', async () => {
    render(<ChatPage />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/ai-providers', expect.any(Object)))

    // Simulate settings change
    localStorage.setItem('preferredModel', 'openai/gpt-4')
    window.dispatchEvent(new StorageEvent('storage', { key: 'preferredModel', newValue: 'openai/gpt-4' }))

    // Send a message
    const sendButton = screen.getByRole('button', { name: /send/i })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      const call = (global.fetch as jest.Mock).mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('/api/chat'))
      expect(call).toBeTruthy()
      const body = JSON.parse(call![1].body)
      expect(body.model_override).toBe('openai/gpt-4')
    })
  })
})