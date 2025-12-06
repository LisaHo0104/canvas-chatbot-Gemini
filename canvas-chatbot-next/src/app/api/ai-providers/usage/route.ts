import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { AIProviderService } from '@/lib/ai-provider-service'
import { rateLimitMiddleware } from '@/lib/rate-limit'

async function getUsageStatsHandler(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    const providerService = new AIProviderService(supabase)
    const stats = await providerService.getProviderUsageStats(user.id, providerId, days)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Get usage stats API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Apply rate limiting
export const GET = rateLimitMiddleware(getUsageStatsHandler)
