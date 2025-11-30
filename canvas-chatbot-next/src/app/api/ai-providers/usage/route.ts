import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AIProviderService } from '@/lib/ai-provider-service'
import { rateLimitMiddleware } from '@/lib/rate-limit'

async function getUsageStatsHandler(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
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
    const providerId = searchParams.get('providerId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    const providerService = new AIProviderService()
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
