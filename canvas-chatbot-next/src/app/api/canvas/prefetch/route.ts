import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { CanvasContextService } from '@/lib/canvas-context'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] /api/canvas/prefetch invoked')
    const supabase = createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('canvas_api_key_encrypted, canvas_api_url')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.canvas_api_key_encrypted || !profile?.canvas_api_url) {
      return new Response(JSON.stringify({ error: 'Canvas not configured' }), { status: 400 })
    }

    let apiKey: string
    let baseUrl: string
    try {
      apiKey = decrypt(profile.canvas_api_key_encrypted)
      baseUrl = profile.canvas_api_url
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to decrypt Canvas API key' }), { status: 500 })
    }

    const ctx = new CanvasContextService(apiKey, baseUrl)
    const graph = await ctx.buildStaticEntityMap(30)

    return new Response(JSON.stringify(graph), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[DEBUG] Prefetch error', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500 },
    )
  }
}

