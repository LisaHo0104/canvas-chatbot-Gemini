import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { AIProviderService } from '@/lib/ai-provider-service'
import { rateLimitMiddleware } from '@/lib/rate-limit'

async function testProviderHandler(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Please log in first' },
        { status: 401 }
      )
    }

    const { providerId } = await request.json()

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    const providerService = new AIProviderService(supabase)
    const result = await providerService.testProviderConnection(user.id, providerId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Test provider API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Apply rate limiting
export const POST = rateLimitMiddleware(testProviderHandler)
