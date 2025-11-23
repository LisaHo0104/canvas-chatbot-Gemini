import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { OpenRouterService } from '@/lib/openrouter-service'
import { rateLimitMiddleware } from '@/lib/rate-limit'

async function getModelsHandler(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get('apiKey')

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      )
    }

    // Create temporary service to fetch models
    const service = new OpenRouterService(apiKey)
    const models = await service.getAvailableModels()

    return NextResponse.json({ models })
  } catch (error) {
    console.error('Get OpenRouter models API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

// Apply rate limiting
export const GET = rateLimitMiddleware(getModelsHandler)