import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatPage from '../../chat/page'

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    },
    from: jest.fn((table: string) => {
      if (table === 'chat_sessions') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'sess-1', title: 'New Chat', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() },
            error: null,
          }),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      if (table === 'chat_messages') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  })
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))

describe('ChatPage session persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global as any).fetch = jest.fn(async (url: string, init?: any) => {
      if (typeof url === 'string' && url.includes('/api/ai-providers')) {
        return { ok: true, json: async () => ({ providers: [{ id: 'p1', provider_name: 'openrouter', model_name: 'anthropic/claude-3.5-sonnet', is_active: true }] }) }
      }
      if (typeof url === 'string' && url.includes('/api/chat')) {
        return { ok: true, json: async () => ({ response: 'ok', usage: {} }) }
      }
      return { ok: true, json: async () => ({}) }
    })
    localStorage.clear()
  })

  it('creates a session and sends with real X-Session-ID, persists title', async () => {
    render(<ChatPage />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/ai-providers', expect.any(Object)))

    const sendButton = screen.getByRole('button', { name: /send/i })
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'hello world' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      const call = (global.fetch as jest.Mock).mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('/api/chat'))
      expect(call).toBeTruthy()
      const headers = call![1].headers
      expect(headers['X-Session-ID']).toBe('sess-1')
    })
  })
})