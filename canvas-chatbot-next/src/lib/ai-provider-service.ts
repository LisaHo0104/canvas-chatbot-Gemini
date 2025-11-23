import { CanvasAIAssistant, ConversationMessage, AIResponse } from './ai-assistant'
import { OpenRouterService } from './openrouter-service'
import { encrypt, decrypt } from './crypto'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export interface AIProvider {
  id: string
  provider_name: 'gemini' | 'openrouter'
  api_key_encrypted: string
  model_name: string
  is_active: boolean
  config: Record<string, any>
  usage_stats: Record<string, any>
  created_at: string
  updated_at: string
}

export interface AIProviderUsage {
  id: string
  user_id: string
  provider_id: string
  session_id?: string
  model_name: string
  request_type: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  response_time_ms?: number
  status: 'success' | 'error' | 'timeout'
  error_message?: string
  created_at: string
}

export interface ProviderConfig {
  provider: 'gemini' | 'openrouter'
  apiKey: string
  model: string
  config?: Record<string, any>
}

export class AIProviderService {
  private supabase: any

  constructor() {
    this.supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookies().getAll()
          },
          setAll(cookiesToSet: any[]) {
            // Note: In server components, we can't set cookies directly
            // This will be handled by the calling code
          },
        },
      }
    )
  }

  async getUserProviders(userId: string): Promise<AIProvider[]> {
    const { data, error } = await this.supabase
      .from('ai_providers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user providers:', error)
      throw new Error('Failed to fetch AI providers')
    }

    return data || []
  }

  async getActiveProvider(userId: string): Promise<AIProvider | null> {
    const { data, error } = await this.supabase
      .from('ai_providers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No active provider found
      }
      console.error('Error fetching active provider:', error)
      throw new Error('Failed to fetch active AI provider')
    }

    return data
  }

  async createProvider(userId: string, provider: ProviderConfig): Promise<AIProvider> {
    const encryptedApiKey = encrypt(provider.apiKey)
    
    const { data, error } = await this.supabase
      .from('ai_providers')
      .insert({
        user_id: userId,
        provider_name: provider.provider,
        api_key_encrypted: encryptedApiKey,
        model_name: provider.model,
        config: provider.config || {},
        usage_stats: {},
        is_active: false // Don't activate by default
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating provider:', error)
      throw new Error('Failed to create AI provider')
    }

    return data
  }

  async updateProvider(userId: string, providerId: string, updates: Partial<AIProvider>): Promise<AIProvider> {
    // If updating API key, encrypt it
    if (updates.api_key_encrypted) {
      updates.api_key_encrypted = encrypt(updates.api_key_encrypted)
    }

    const { data, error } = await this.supabase
      .from('ai_providers')
      .update(updates)
      .eq('id', providerId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating provider:', error)
      throw new Error('Failed to update AI provider')
    }

    return data
  }

  async deleteProvider(userId: string, providerId: string): Promise<void> {
    const { error } = await this.supabase
      .from('ai_providers')
      .delete()
      .eq('id', providerId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting provider:', error)
      throw new Error('Failed to delete AI provider')
    }
  }

  async setActiveProvider(userId: string, providerId: string): Promise<void> {
    // This is handled by the database trigger that ensures only one active provider per user
    const { error } = await this.supabase
      .from('ai_providers')
      .update({ is_active: true })
      .eq('id', providerId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error setting active provider:', error)
      throw new Error('Failed to set active AI provider')
    }
  }

  async generateResponse(
    userId: string,
    query: string,
    canvasContext: string,
    history: ConversationMessage[] = [],
    sessionId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now()
    const activeProvider = await this.getActiveProvider(userId)
    
    if (!activeProvider) {
      throw new Error('No active AI provider configured')
    }

    let response: AIResponse
    let status: 'success' | 'error' | 'timeout' = 'success'
    let errorMessage: string | undefined
    let responseTimeMs: number

    try {
      const apiKey = decrypt(activeProvider.api_key_encrypted)
      
      if (activeProvider.provider_name === 'gemini') {
        const assistant = new CanvasAIAssistant(apiKey, activeProvider.model_name)
        response = await assistant.generateResponse(query, canvasContext, history)
      } else if (activeProvider.provider_name === 'openrouter') {
        const service = new OpenRouterService(apiKey, activeProvider.model_name)
        response = await service.generateResponse(query, canvasContext, history)
      } else {
        throw new Error(`Unsupported provider: ${activeProvider.provider_name}`)
      }

      responseTimeMs = Date.now() - startTime
    } catch (error) {
      status = 'error'
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
      responseTimeMs = Date.now() - startTime
      
      // Log the error but still throw it
      console.error(`AI provider ${activeProvider.provider_name} error:`, error)
      throw error
    } finally {
      // Log usage regardless of success/failure
      try {
        await this.logUsage({
          userId,
          providerId: activeProvider.id,
          sessionId,
          modelName: activeProvider.model_name,
          requestType: 'chat',
          promptTokens: response?.usage?.promptTokens || 0,
          completionTokens: response?.usage?.completionTokens || 0,
          totalTokens: response?.usage?.totalTokens || 0,
          costUsd: this.calculateCost(activeProvider.provider_name, activeProvider.model_name, response?.usage?.totalTokens || 0),
          responseTimeMs,
          status,
          errorMessage
        })
      } catch (usageError) {
        console.error('Failed to log AI usage:', usageError)
      }
    }

    return response
  }

  async testProviderConnection(userId: string, providerId: string): Promise<{ success: boolean; error?: string }> {
    const provider = await this.getProviderById(userId, providerId)
    if (!provider) {
      return { success: false, error: 'Provider not found' }
    }

    try {
      const apiKey = decrypt(provider.api_key_encrypted)
      
      if (provider.provider_name === 'gemini') {
        // For Gemini, we'll test by creating a simple assistant and trying to generate a response
        const assistant = new CanvasAIAssistant(apiKey, provider.model_name)
        const testResponse = await assistant.generateResponse('Hello', 'Test context', [])
        return { success: testResponse.content.length > 0 }
      } else if (provider.provider_name === 'openrouter') {
        const service = new OpenRouterService(apiKey, provider.model_name)
        const result = await service.testConnection()
        return result
      } else {
        return { success: false, error: `Unsupported provider: ${provider.provider_name}` }
      }
    } catch (error) {
      console.error(`Provider connection test failed for ${provider.provider_name}:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      }
    }
  }

  async getProviderUsageStats(userId: string, providerId: string, days: number = 30): Promise<any> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await this.supabase
      .from('ai_provider_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('provider_id', providerId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching provider usage stats:', error)
      throw new Error('Failed to fetch usage statistics')
    }

    // Calculate aggregated stats
    const stats = {
      totalRequests: data?.length || 0,
      successfulRequests: data?.filter(u => u.status === 'success').length || 0,
      errorRequests: data?.filter(u => u.status === 'error').length || 0,
      totalTokens: data?.reduce((sum, u) => sum + u.total_tokens, 0) || 0,
      totalCost: data?.reduce((sum, u) => sum + parseFloat(u.cost_usd.toString()), 0) || 0,
      averageResponseTime: data?.filter(u => u.response_time_ms)
        .reduce((sum, u, _, arr) => sum + (u.response_time_ms || 0) / arr.length, 0) || 0,
      usageByDay: this.aggregateUsageByDay(data || [])
    }

    return stats
  }

  private async getProviderById(userId: string, providerId: string): Promise<AIProvider | null> {
    const { data, error } = await this.supabase
      .from('ai_providers')
      .select('*')
      .eq('id', providerId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching provider by ID:', error)
      throw new Error('Failed to fetch AI provider')
    }

    return data
  }

  private async logUsage(usage: {
    userId: string
    providerId: string
    sessionId?: string
    modelName: string
    requestType: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    costUsd: number
    responseTimeMs: number
    status: 'success' | 'error' | 'timeout'
    errorMessage?: string
  }): Promise<void> {
    const { error } = await this.supabase
      .from('ai_provider_usage')
      .insert({
        user_id: usage.userId,
        provider_id: usage.providerId,
        session_id: usage.sessionId,
        model_name: usage.modelName,
        request_type: usage.requestType,
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        total_tokens: usage.totalTokens,
        cost_usd: usage.costUsd,
        response_time_ms: usage.responseTimeMs,
        status: usage.status,
        error_message: usage.errorMessage
      })

    if (error) {
      console.error('Error logging AI provider usage:', error)
      // Don't throw here as this is a secondary operation
    }
  }

  private calculateCost(provider: string, model: string, tokens: number): number {
    // Simplified cost calculation - these are rough estimates
    const costPer1KTokens = {
      'gemini': {
        'gemini-2.0-flash': 0.0015, // $0.0015 per 1K tokens (input)
        'gemini-pro': 0.0025
      },
      'openrouter': {
        'anthropic/claude-3.5-sonnet': 0.003, // $0.003 per 1K tokens
        'openai/gpt-4': 0.03,
        'openai/gpt-3.5-turbo': 0.0005
      }
    }

    const modelCost = costPer1KTokens[provider as keyof typeof costPer1KTokens]?.[model as keyof typeof costPer1KTokens.gemini] || 0.001
    return (tokens / 1000) * modelCost
  }

  private aggregateUsageByDay(usage: any[]): Record<string, any> {
    const usageByDay: Record<string, any> = {}
    
    usage.forEach(u => {
      const day = new Date(u.created_at).toISOString().split('T')[0]
      if (!usageByDay[day]) {
        usageByDay[day] = {
          requests: 0,
          tokens: 0,
          cost: 0
        }
      }
      
      usageByDay[day].requests++
      usageByDay[day].tokens += u.total_tokens
      usageByDay[day].cost += parseFloat(u.cost_usd.toString())
    })

    return usageByDay
  }
}