// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill for ReadableStream
global.ReadableStream = class ReadableStream {
  constructor(underlyingSource) {
    this.underlyingSource = underlyingSource
  }
}

// Polyfill for TransformStream
global.TransformStream = class TransformStream {
  constructor(transformer) {
    this.transformer = transformer
  }
}

import { AIProviderService } from '@/lib/ai-provider-service'
import { supabase } from '@/lib/supabase'
import { encrypt, decrypt } from '@/lib/crypto'

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      order: jest.fn(),
      gte: jest.fn(),
      lt: jest.fn(),
    })),
  },
}))

jest.mock('@/lib/crypto', () => ({
  encrypt: jest.fn((text) => `encrypted_${text}`),
  decrypt: jest.fn((text) => text.replace('encrypted_', '')),
}))

// Mock the OpenRouter service to avoid importing complex dependencies
jest.mock('@/lib/openrouter-service', () => ({
  OpenRouterService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({
      content: 'Test response from OpenRouter',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
    }),
    testConnection: jest.fn().mockResolvedValue({
      success: true,
      models: [{ id: 'gpt-4', name: 'GPT-4' }]
    }),
    getAvailableModels: jest.fn().mockResolvedValue([
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' }
    ])
  }))
}))

describe('AIProviderService', () => {
  let service: AIProviderService
  const mockUserId = 'test-user-id'
  const mockProviderId = 'test-provider-id'
  const mockEncryptedKey = 'encrypted_test-api-key'
  const mockDecryptedKey = 'test-api-key'

  const mockProvider = {
    id: mockProviderId,
    user_id: mockUserId,
    provider_name: 'openrouter',
    model_name: 'gpt-4',
    api_key: mockEncryptedKey,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    service = new AIProviderService()
    ;(decrypt as jest.Mock).mockReturnValue(mockDecryptedKey)
  })

  describe('generateResponse', () => {
    const mockQuery = 'What is the capital of France?'
    const mockCanvasContext = 'Course: History 101'
    const mockHistory = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
    ]
    const mockSessionId = 'test-session-id'

    it('should generate response using OpenRouter provider', async () => {
      // Mock provider fetch
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProvider,
          error: null,
        }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      // Mock usage tracking
      const mockInsert = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'usage-id' },
            error: null,
          }),
        }),
      }
      ;(supabase.from as jest.Mock).mockReturnValueOnce(mockInsert)

      const result = await service.generateResponse(
        mockUserId,
        mockQuery,
        mockCanvasContext,
        mockHistory,
        mockSessionId
      )

      expect(result.success).toBe(true)
      expect(result.response).toBe('Test response from OpenRouter')
      expect(result.providerType).toBe('openrouter')
      expect(result.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      })
    })

    it('should handle provider not found', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      await expect(service.generateResponse(
        mockUserId,
        mockQuery,
        mockCanvasContext,
        mockHistory,
        mockSessionId
      )).rejects.toThrow('AI provider not found')
    })
  })

  describe('testProviderConnection', () => {
    it('should successfully test OpenRouter provider connection', async () => {
      // Mock provider fetch
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProvider,
          error: null,
        }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      const result = await service.testProviderConnection(mockUserId, mockProviderId)

      expect(result.success).toBe(true)
      expect(result.models).toHaveLength(1)
      expect(result.models?.[0].id).toBe('gpt-4')
    })

    it('should handle provider not found', async () => {
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      await expect(service.testProviderConnection(mockUserId, 'non-existent-id'))
        .rejects.toThrow('AI provider not found')
    })
  })

  describe('getProviderUsageStats', () => {
    it('should return usage statistics for a provider', async () => {
      const mockUsageData = [
        {
          id: 'usage-1',
          provider_id: mockProviderId,
          request_count: 10,
          total_tokens: 1000,
          total_cost: 0.02,
          created_at: new Date().toISOString(),
        },
        {
          id: 'usage-2',
          provider_id: mockProviderId,
          request_count: 5,
          total_tokens: 500,
          total_cost: 0.01,
          created_at: new Date().toISOString(),
        },
      ]

      // Mock usage data fetch
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockUsageData,
          error: null,
        }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      const result = await service.getProviderUsageStats(mockUserId, mockProviderId, 30)

      expect(result.totalRequests).toBe(15)
      expect(result.totalTokens).toBe(1500)
      expect(result.totalCost).toBe(0.03)
      expect(result.usageData).toHaveLength(2)
    })

    it('should handle no usage data', async () => {
      // Mock empty usage data
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      const result = await service.getProviderUsageStats(mockUserId, mockProviderId, 30)

      expect(result.totalRequests).toBe(0)
      expect(result.totalTokens).toBe(0)
      expect(result.totalCost).toBe(0)
      expect(result.usageData).toHaveLength(0)
    })

    it('should handle database errors', async () => {
      // Mock database error
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      await expect(service.getProviderUsageStats(mockUserId, mockProviderId, 30))
        .rejects.toThrow('Failed to fetch usage statistics')
    })
  })

  describe('error handling', () => {
    it('should handle decryption errors', async () => {
      // Mock decryption error
      ;(decrypt as jest.Mock).mockImplementation(() => {
        throw new Error('Decryption failed')
      })

      // Mock provider fetch
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProvider,
          error: null,
        }),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      await expect(service.generateResponse(
        mockUserId,
        'test query',
        mockCanvasContext,
        mockHistory,
        mockSessionId
      )).rejects.toThrow('Decryption failed')
    })

    it('should handle unexpected errors gracefully', async () => {
      // Mock provider fetch with unexpected error
      const mockSelect = {
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      }
      ;(supabase.from as jest.Mock).mockReturnValue(mockSelect)

      await expect(service.generateResponse(
        mockUserId,
        'test query',
        mockCanvasContext,
        mockHistory,
        mockSessionId
      )).rejects.toThrow('Unexpected error')
    })
  })
})