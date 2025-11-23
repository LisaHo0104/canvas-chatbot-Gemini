import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { decrypt } from '@/lib/crypto'
import { CanvasContextService } from '@/lib/canvas-context'
import { AIProviderService } from '@/lib/ai-provider-service'
import { OpenRouterService } from '@/lib/openrouter-service'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'

async function chatHandler(request: NextRequest) {
  try {
    const { query, history = [], canvas_token, canvas_url, provider_id, model, model_override } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
            })
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please log in first' },
        { status: 401 }
      )
    }

    let canvasApiKey: string
    let canvasApiUrl: string
    if (canvas_token && canvas_url) {
      canvasApiKey = canvas_token
      canvasApiUrl = canvas_url
    } else {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('canvas_api_key_encrypted, canvas_api_url')
        .eq('id', user.id)
        .single()
      if (userError || !userData?.canvas_api_key_encrypted || !userData?.canvas_api_url) {
        return NextResponse.json(
          { error: 'Please configure your Canvas API credentials first' },
          { status: 400 }
        )
      }
      try {
        canvasApiKey = decrypt(userData.canvas_api_key_encrypted)
        canvasApiUrl = userData.canvas_api_url
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to decrypt Canvas API key' },
          { status: 500 }
        )
      }
    }

    // Build Canvas context
    const contextService = new CanvasContextService(canvasApiKey, canvasApiUrl)
    const canvasContext = await contextService.buildContext(query, user.id)
    if (typeof canvasContext === 'string' && canvasContext.startsWith('Error fetching Canvas data:')) {
      return NextResponse.json(
        { error: 'Invalid or missing Canvas credentials. Please update your Canvas API key and URL.' },
        { status: 400 }
      )
    }

    // Generate AI response
    let aiResponse
    const sessionId = request.headers.get('x-session-id') || 'default'
    
    // Preferred: OpenRouter-first flow
    if (provider_id) {
      const providerService = new AIProviderService()
      const overrideModel = typeof model_override === 'string' && model_override.trim().length > 0 ? model_override : undefined
      aiResponse = await providerService.generateResponse(
        user.id,
        query,
        canvasContext,
        history,
        sessionId,
        overrideModel
      )
    } else {
      const ownerKey = process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY
      if (!ownerKey) {
        return NextResponse.json(
          { error: 'OpenRouter API key not configured' },
          { status: 500 }
        )
      }
      const selectedModel = typeof model === 'string' && model.trim().length > 0
        ? model
        : 'anthropic/claude-3.5-sonnet'
      const openrouter = new OpenRouterService(ownerKey, selectedModel)
      aiResponse = await openrouter.generateResponse(query, canvasContext, history)
    }

    // Save chat message to database
    try {
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert([
          {
            user_id: user.id,
            session_id: sessionId,
            role: 'user',
            content: query,
            created_at: new Date().toISOString(),
          },
          {
            user_id: user.id,
            session_id: sessionId,
            role: 'assistant',
            content: aiResponse.content,
            created_at: new Date().toISOString(),
            metadata: {
              usage: aiResponse.usage,
              client_ip: getClientIP(request),
              provider_id: provider_id || null,
              provider_type: provider_id ? 'configured' : 'legacy'
            },
          },
        ])

      if (messageError) {
        console.error('Error saving chat message:', messageError)
      }
    } catch (error) {
      console.error('Error saving chat to database:', error)
      // Don't fail the request if database save fails
    }

    return NextResponse.json({
      response: aiResponse.content,
      usage: aiResponse.usage,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Apply rate limiting
export const POST = rateLimitMiddleware(chatHandler)