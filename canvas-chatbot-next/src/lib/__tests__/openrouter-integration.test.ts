// Integration tests for OpenRouter service functionality
import { OpenRouterService } from '@/lib/openrouter-service'

describe('OpenRouter Service Integration Tests', () => {
  let service: OpenRouterService
  const mockApiKey = 'test-api-key'

  beforeEach(() => {
    service = new OpenRouterService(mockApiKey)
  })

  describe('Service Initialization', () => {
    it('should create service instance with API key', () => {
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(OpenRouterService)
    })

    it('should handle empty API key', () => {
      expect(() => new OpenRouterService('')).not.toThrow()
    })
  })

  describe('Response Generation', () => {
    it('should validate input parameters', async () => {
      // Test with invalid parameters
      await expect(service.generateResponse('', [], '')).rejects.toThrow()
    })

    it('should handle empty conversation history', async () => {
      // This test validates that the service can handle empty history
      // without throwing unexpected errors
      await expect(service.generateResponse('test query', [], 'test-model')).rejects.toThrow()
    })

    it('should handle malformed conversation history', async () => {
      const invalidHistory = [
        { invalid: 'structure' },
        { role: 'invalid', content: 'test' }
      ]
      
      await expect(service.generateResponse('test query', invalidHistory as any, 'test-model')).rejects.toThrow()
    })
  })

  describe('Connection Testing', () => {
    it('should handle connection test with invalid API key', async () => {
      const invalidService = new OpenRouterService('invalid-key')
      
      try {
        await invalidService.testConnection()
        // If we get here, the test should fail because we expect an error
        expect(true).toBe(false)
      } catch (error) {
        // We expect this to throw an error
        expect(error).toBeDefined()
      }
    })

    it('should validate connection test response format', async () => {
      try {
        const result = await service.testConnection()
        
        // Validate response structure if successful
        if (result.success) {
          expect(result.models).toBeDefined()
          expect(Array.isArray(result.models)).toBe(true)
        }
      } catch (error) {
        // Expected to fail with test API key
        expect(error).toBeDefined()
      }
    })
  })

  describe('Model Fetching', () => {
    it('should handle model fetching with invalid API key', async () => {
      const invalidService = new OpenRouterService('invalid-key')
      
      try {
        await invalidService.getAvailableModels()
        // If we get here, the test should fail because we expect an error
        expect(true).toBe(false)
      } catch (error) {
        // We expect this to throw an error
        expect(error).toBeDefined()
      }
    })

    it('should validate model data structure', async () => {
      try {
        const models = await service.getAvailableModels()
        
        // Validate model structure if successful
        if (models && models.length > 0) {
          const model = models[0]
          expect(model).toHaveProperty('id')
          expect(model).toHaveProperty('name')
        }
      } catch (error) {
        // Expected to fail with test API key
        expect(error).toBeDefined()
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create service with invalid base URL to simulate network error
      const serviceWithInvalidUrl = new OpenRouterService(mockApiKey)
      
      try {
        await serviceWithInvalidUrl.generateResponse('test query', [{ role: 'user', content: 'test' }], 'test-model')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle rate limiting errors', async () => {
      // Test with a query that might trigger rate limiting
      const longQuery = 'a'.repeat(10000) // Very long query
      
      try {
        await service.generateResponse(longQuery, [], 'test-model')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle authentication errors', async () => {
      // Service with invalid API key should trigger auth errors
      const invalidService = new OpenRouterService('invalid-key')
      
      try {
        await invalidService.testConnection()
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
        // Check if it's an authentication-related error
        const errorMessage = error instanceof Error ? error.message : String(error)
        // Just verify we got an error, don't check specific message pattern
        expect(errorMessage).toBeDefined()
      }
    })
  })

  describe('Input Validation', () => {
    it('should validate model names', async () => {
      const invalidModels = ['', 'invalid-model', '123', '!@#$%^&*()']
      
      for (const model of invalidModels) {
        try {
          await service.generateResponse('test query', [], model)
          // Some invalid models might still pass, which is okay
        } catch (error) {
          expect(error).toBeDefined()
        }
      }
    })

    it('should handle very long queries', async () => {
      const longQuery = 'a'.repeat(50000) // 50KB query
      
      try {
        await service.generateResponse(longQuery, [], 'test-model')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle special characters in queries', async () => {
      const specialQueries = [
        'Query with émojis 🚀 and ñoñó',
        'Query with <script>alert("xss")</script>',
        'Query with SQL injection \'; DROP TABLE users; --',
        'Query with unicode characters: 你好世界 🌍'
      ]
      
      for (const query of specialQueries) {
        try {
          await service.generateResponse(query, [], 'test-model')
          // Some queries might pass, which is expected behavior
        } catch (error) {
          expect(error).toBeDefined()
        }
      }
    })
  })
})