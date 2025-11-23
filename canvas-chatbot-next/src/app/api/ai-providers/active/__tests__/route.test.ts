import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai-providers/active/route'
import { supabase } from '@/lib/supabase'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}))

// Mock the AI provider service
jest.mock('@/lib/ai-provider-service', () => ({
  AIProviderService: jest.fn().mockImplementation(() => ({
    setActiveProvider: jest.fn().mockResolvedValue(undefined),
  }))
}))

// Mock rate limit middleware
jest.mock('@/lib/rate-limit', () => ({
  rateLimitMiddleware: jest.fn().mockImplementation((handler) => handler)
}))

describe('AI Providers Active API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/ai-providers/active', () => {
    it('should successfully set active provider', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock the update operations for setting active provider
      const mockUpdate = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { success: true },
          error: null
        })
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockUpdate)

      const request = new NextRequest('http://localhost:3000/api/ai-providers/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId: 'test-provider-id' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
    })

    it('should return 401 when user is not authenticated', async () => {
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/ai-providers/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId: 'test-provider-id' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Please log in first' })
    })

    it('should return 400 when provider ID is missing', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/ai-providers/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ error: 'Provider ID is required' })
    })

    it('should handle invalid JSON in request body', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' }
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Create request with invalid JSON
      const request = new NextRequest('http://localhost:3000/api/ai-providers/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })
})