import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AIProviderService } from '@/lib/ai-provider-service'
import { rateLimitMiddleware } from '@/lib/rate-limit'

async function testProviderHandler(request: NextRequest) {
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

    const { providerId } = await request.json()

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    const providerService = new AIProviderService({
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }: any) => {
          request.cookies.set(name, value)
        })
      }
    })
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