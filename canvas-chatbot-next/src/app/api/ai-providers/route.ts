import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AIProviderService, ProviderConfig } from '@/lib/ai-provider-service'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'

async function providersHandler(request: NextRequest) {
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

    switch (request.method) {
      case 'GET':
        return await getProviders(providerService, user.id)
      case 'POST':
        return await createProvider(providerService, user.id, request)
      case 'PUT':
        return await updateProvider(providerService, user.id, request)
      case 'DELETE':
        return await deleteProvider(providerService, user.id, request)
      default:
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        )
    }
  } catch (error) {
    console.error('Providers API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getProviders(providerService: AIProviderService, userId: string) {
  try {
    const providers = await providerService.getUserProviders(userId)
    return NextResponse.json({ providers })
  } catch (error) {
    console.error('Error fetching providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI providers' },
      { status: 500 }
    )
  }
}

async function createProvider(providerService: AIProviderService, userId: string, request: NextRequest) {
  try {
    const { provider, apiKey, model, config } = await request.json()

    if (!provider || !apiKey || !model) {
      return NextResponse.json(
        { error: 'Provider, API key, and model are required' },
        { status: 400 }
      )
    }

    if (!['openrouter'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be openrouter' },
        { status: 400 }
      )
    }

    const providerConfig: ProviderConfig = {
      provider: provider as 'openrouter',
      apiKey,
      model,
      config: config || {}
    }

    const newProvider = await providerService.createProvider(userId, providerConfig)
    return NextResponse.json({ provider: newProvider })
  } catch (error) {
    console.error('Error creating provider:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create AI provider' },
      { status: 500 }
    )
  }
}

async function updateProvider(providerService: AIProviderService, userId: string, request: NextRequest) {
  try {
    const { providerId, updates } = await request.json()

    if (!providerId || !updates) {
      return NextResponse.json(
        { error: 'Provider ID and updates are required' },
        { status: 400 }
      )
    }

    const updatedProvider = await providerService.updateProvider(userId, providerId, updates)
    return NextResponse.json({ provider: updatedProvider })
  } catch (error) {
    console.error('Error updating provider:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update AI provider' },
      { status: 500 }
    )
  }
}

async function deleteProvider(providerService: AIProviderService, userId: string, request: NextRequest) {
  try {
    const { providerId } = await request.json()

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      )
    }

    await providerService.deleteProvider(userId, providerId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting provider:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete AI provider' },
      { status: 500 }
    )
  }
}

// Apply rate limiting
export const POST = rateLimitMiddleware(providersHandler)
export const GET = rateLimitMiddleware(providersHandler)
export const PUT = rateLimitMiddleware(providersHandler)
export const DELETE = rateLimitMiddleware(providersHandler)
