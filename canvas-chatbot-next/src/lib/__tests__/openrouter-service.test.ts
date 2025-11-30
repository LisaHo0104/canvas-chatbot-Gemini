import { OpenRouterService } from '@/lib/openrouter-service'
import { OpenRouterModel } from '@/lib/openrouter-service'

jest.mock('@openrouter/sdk', () => {
  const MockOpenRouter = function(options: any) {
    return {
      chat: {
        completions: {
          create: (MockOpenRouter as any).__create || jest.fn()
        }
      }
    }
  }
  return { OpenRouter: MockOpenRouter }
})
const setCreateMock = (fn: any) => {
  ;(jest.requireMock('@openrouter/sdk') as any).OpenRouter.__create = fn
}

describe('OpenRouterService', () => {
  let service: OpenRouterService
  const mockApiKey = 'test-api-key'
  const mockModel = 'gpt-4'

  beforeEach(() => {
    jest.clearAllMocks()
    service = new OpenRouterService(mockApiKey, mockModel)
  })

  describe('constructor', () => {
    it('should initialize with provided API key and model', () => {
      expect(service).toBeInstanceOf(OpenRouterService)
    })

    it('should use default model if not provided', () => {
      const serviceWithoutModel = new OpenRouterService(mockApiKey)
      expect(serviceWithoutModel).toBeInstanceOf(OpenRouterService)
    })
  })

  describe('generateResponse', () => {
    const mockUserQuery = 'What is the capital of France?'
    const mockCanvasContext = 'Course: History 101'
    const mockHistory = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
    ]

    it('should successfully generate a response', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'The capital of France is Paris.' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      }
      const create = jest.fn().mockResolvedValue(mockResponse)
      setCreateMock(create)
      const result = await service.generateResponse(mockUserQuery, mockCanvasContext, mockHistory)
      expect(result.content).toBe('The capital of France is Paris.')
      expect(result.usage).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150 })
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: mockModel }))
    })

    it('should include the provided model in request payload', async () => {
      const customModel = 'openai/gpt-4'
      const svc = new OpenRouterService(mockApiKey, customModel)
      const mockResponse = {
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }
      const create = jest.fn().mockResolvedValue(mockResponse)
      setCreateMock(create)
      await svc.generateResponse('q', 'ctx', [])
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: customModel }))
    })

    it('should handle API errors', async () => {
      const create = jest.fn().mockRejectedValue(new Error('invalid_api_key'))
      setCreateMock(create)
      await expect(service.generateResponse(mockUserQuery, mockCanvasContext, mockHistory))
        .rejects.toThrow('Invalid OpenRouter API key. Please check your configuration.')
    })

    it('should handle quota exceeded errors', async () => {
      const create = jest.fn().mockRejectedValue(new Error('insufficient_quota'))
      setCreateMock(create)
      await expect(service.generateResponse(mockUserQuery, mockCanvasContext, mockHistory))
        .rejects.toThrow('OpenRouter quota exceeded. Please check your account balance.')
    })

    it('should handle model not found errors', async () => {
      const create = jest.fn().mockRejectedValue(new Error('model_not_found'))
      setCreateMock(create)
      await expect(service.generateResponse(mockUserQuery, mockCanvasContext, mockHistory))
        .rejects.toThrow(`Model '${mockModel}' not found on OpenRouter.`)
    })

    it('should handle network errors', async () => {
      const create = jest.fn().mockRejectedValue(new Error('Network error'))
      setCreateMock(create)
      await expect(service.generateResponse(mockUserQuery, mockCanvasContext, mockHistory))
        .rejects.toThrow('Failed to generate response from OpenRouter')
    })

    it('should format messages correctly with context', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Response with context',
          },
        }],
      }

      const create = jest.fn().mockResolvedValue(mockResponse)
      setCreateMock(create)
      await service.generateResponse(mockUserQuery, mockCanvasContext, mockHistory)
      const callArg = create.mock.calls[0][0]
      expect(callArg.messages).toEqual(expect.arrayContaining([
        { role: 'system', content: expect.stringContaining('Course: History 101') },
        { role: 'user', content: mockUserQuery },
      ]))
    })
  })

  describe('testConnection', () => {
    it('should successfully test connection', async () => {
      const mockModels: OpenRouterModel[] = [
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockModels }),
      })

      const result = await service.testConnection()

      expect(result.success).toBe(true)
      expect(result.models).toHaveLength(2)
      expect(result.models?.[0].id).toBe('gpt-4')
    })

    it('should handle connection test failures', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } }),
      })

      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid API key')
      expect(result.models).toBeUndefined()
    })

    it('should handle network errors during connection test', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'))

      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
    })
  })

  describe('getAvailableModels', () => {
    it('should fetch and return available models', async () => {
      const mockModels: OpenRouterModel[] = [
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
        { id: 'llama-2-70b', name: 'Llama 2 70B' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockModels }),
      })

      const result = await service.getAvailableModels()

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('gpt-4')
      expect(result[1].name).toBe('Claude 3 Sonnet')
    })

    it('should handle API errors when fetching models', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: { message: 'Server error' } }),
      })

      await expect(service.getAvailableModels()).rejects.toThrow('Failed to fetch available models from OpenRouter')
    })

    it('should handle network errors when fetching models', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'))

      await expect(service.getAvailableModels()).rejects.toThrow('Failed to fetch available models from OpenRouter')
    })
  })

  describe('error handling', () => {
    it('should handle malformed JSON responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const create = jest.fn().mockResolvedValue({})
      setCreateMock(create)
      const result = await service.generateResponse('test query', '', [])
      expect(result.content).toBe('')
    })

    it('should handle missing choices in response', async () => {
      const mockResponse = {
        // Missing choices array
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await expect(service.generateResponse('test query', '', []))
        .rejects.toThrow('Failed to generate response from OpenRouter')
    })

    it('should handle empty choices array', async () => {
      const mockResponse = {
        choices: [],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }

      const create = jest.fn().mockResolvedValue(mockResponse)
      setCreateMock(create)
      const result = await service.generateResponse('test query', '', [])

      expect(result.content).toBe('')
      expect(result.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 0,
      })
    })
  })
})