import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('Rate Limiting', () => {
  const mockIdentifier = 'test-user-123'
  const mockWindowMs = 60000 // 1 minute
  const mockMaxRequests = 10
  
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RATE_LIMIT_WINDOW_MS = mockWindowMs.toString()
    process.env.RATE_LIMIT_MAX_REQUESTS = mockMaxRequests.toString()
  })

  describe('checkRateLimit', () => {
    it('should allow requests when under rate limit', async () => {
      const mockRateLimit = {
        identifier: mockIdentifier,
        request_count: 5,
        window_start: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
      }

      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockRateLimit,
          error: null,
        }),
      }

      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      const result = await checkRateLimit(mockIdentifier)
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
      expect(result.reset).toBeGreaterThan(Date.now())
    })

    it('should block requests when over rate limit', async () => {
      const mockRateLimit = {
        identifier: mockIdentifier,
        request_count: 15, // Over the limit
        window_start: new Date(Date.now() - 30000).toISOString(),
      }

      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockRateLimit,
          error: null,
        }),
      }

      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      const result = await checkRateLimit(mockIdentifier)
      
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.reset).toBeGreaterThan(Date.now())
    })

    it('should allow requests when no rate limit record exists', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      const result = await checkRateLimit(mockIdentifier)
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(mockMaxRequests)
      expect(result.reset).toBeGreaterThan(Date.now())
    })

    it('should reset window when expired', async () => {
      const expiredWindowStart = new Date(Date.now() - mockWindowMs - 1000).toISOString()
      const mockRateLimit = {
        identifier: mockIdentifier,
        request_count: 15,
        window_start: expiredWindowStart,
      }

      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockRateLimit,
          error: null,
        }),
      }

      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      const result = await checkRateLimit(mockIdentifier)
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(mockMaxRequests)
    })

    it('should handle database errors', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      }

      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      await expect(checkRateLimit(mockIdentifier)).rejects.toThrow('Database error')
    })
  })

  describe('incrementRateLimit', () => {
    it('should increment existing rate limit record', async () => {
      const mockRateLimit = {
        identifier: mockIdentifier,
        request_count: 5,
        window_start: new Date(Date.now() - 30000).toISOString(),
      }

      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockRateLimit,
          error: null,
        }),
      }

      const mockUpdate = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockRateLimit, request_count: 6 },
          error: null,
        }),
      }

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockUpdate)

      const result = await incrementRateLimit(mockIdentifier)
      
      expect(result.request_count).toBe(6)
      expect(mockUpdate.eq).toHaveBeenCalledWith('identifier', mockIdentifier)
    })

    it('should create new rate limit record if not exists', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      const mockInsert = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            identifier: mockIdentifier,
            request_count: 1,
            window_start: expect.any(String),
          },
          error: null,
        }),
      }

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockInsert)

      const result = await incrementRateLimit(mockIdentifier)
      
      expect(result.request_count).toBe(1)
      expect(mockInsert.select).toHaveBeenCalled()
    })

    it('should reset window when expired', async () => {
      const expiredWindowStart = new Date(Date.now() - mockWindowMs - 1000).toISOString()
      const mockRateLimit = {
        identifier: mockIdentifier,
        request_count: 15,
        window_start: expiredWindowStart,
      }

      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockRateLimit,
          error: null,
        }),
      }

      const mockUpdate = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            identifier: mockIdentifier,
            request_count: 1,
            window_start: expect.any(String),
          },
          error: null,
        }),
      }

      ;(supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockUpdate)

      const result = await incrementRateLimit(mockIdentifier)
      
      expect(result.request_count).toBe(1)
      expect(mockUpdate.select).toHaveBeenCalledWith()
    })
  })
})