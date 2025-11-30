// Basic unit tests for AIProviderService focusing on core functionality
import { AIProviderService } from '@/lib/ai-provider-service'

// Mock the dependencies with minimal setup
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
    })),
  },
}))

jest.mock('@/lib/crypto', () => ({
  encrypt: jest.fn((text) => `encrypted_${text}`),
  decrypt: jest.fn((text) => text.replace('encrypted_', '')),
}))

jest.mock('@/lib/openrouter-service', () => ({
  OpenRouterService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({
      content: 'Test response',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
    }),
    testConnection: jest.fn().mockResolvedValue({
      success: true,
      models: [{ id: 'gpt-4', name: 'GPT-4' }]
    }),
    getAvailableModels: jest.fn().mockResolvedValue([
      { id: 'gpt-4', name: 'GPT-4' }
    ])
  }))
}))

describe('AIProviderService - Basic Tests', () => {
  let service: AIProviderService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new AIProviderService()
  })

  describe('Service Initialization', () => {
    it('should create service instance successfully', () => {
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(AIProviderService)
    })

    it('should have required methods', () => {
      expect(typeof service.generateResponse).toBe('function')
      expect(typeof service.testProviderConnection).toBe('function')
      expect(typeof service.getProviderUsageStats).toBe('function')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid user ID', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Provider not found' }
        })
      })

      await expect(service.generateResponse(
        'invalid-user',
        'test query',
        'test context',
        [],
        'test-session'
      )).rejects.toThrow()
    })

    it('should handle missing provider configuration', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })

      await expect(service.generateResponse(
        'test-user',
        'test query',
        'test context',
        [],
        'test-session'
      )).rejects.toThrow('AI provider not found')
    })
  })

  describe('Provider Management', () => {
    it('should validate provider configuration', async () => {
      const mockProvider = {
        id: 'test-provider',
        user_id: 'test-user',
        provider_name: 'openrouter',
        model_name: 'gpt-4',
        api_key: 'encrypted_test-key',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProvider,
          error: null
        })
      })

      // Test should not throw when provider is valid
      await expect(service.generateResponse(
        'test-user',
        'test query',
        'test context',
        [],
        'test-session'
      )).resolves.toBeDefined()
    })
  })

  describe('Usage Statistics', () => {
    it('should handle empty usage data', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })

      const result = await service.getProviderUsageStats('test-user', 'test-provider', 30)
      
      expect(result.totalRequests).toBe(0)
      expect(result.totalTokens).toBe(0)
      expect(result.totalCost).toBe(0)
      expect(result.usageData).toHaveLength(0)
    })

    it('should handle database errors gracefully', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      })

      await expect(service.getProviderUsageStats('test-user', 'test-provider', 30))
        .rejects.toThrow('Failed to fetch usage statistics')
    })
  })

  describe('Connection Testing', () => {
    it('should handle connection test errors', async () => {
      const mockProvider = {
        id: 'test-provider',
        user_id: 'test-user',
        provider_name: 'openrouter',
        model_name: 'gpt-4',
        api_key: 'encrypted_test-key',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { supabase } = require('@/lib/supabase')
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProvider,
          error: null
        })
      })

      // Test should complete without throwing
      await expect(service.testProviderConnection('test-user', 'test-provider'))
        .resolves.toBeDefined()
    })
  })
})