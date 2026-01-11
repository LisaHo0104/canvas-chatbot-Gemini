import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { CanvasContextService } from '@/lib/canvas-context'

export const runtime = 'nodejs'
export const maxDuration = 120

// POST: Refresh Canvas data and update last sync timestamp
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Canvas credentials
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('canvas_api_key_encrypted, canvas_api_url')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.canvas_api_key_encrypted || !profile?.canvas_api_url) {
      return NextResponse.json({ error: 'Canvas not configured' }, { status: 400 })
    }

    let apiKey: string
    let baseUrl: string
    try {
      apiKey = decrypt(profile.canvas_api_key_encrypted)
      baseUrl = profile.canvas_api_url
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt Canvas API key' }, { status: 500 })
    }

    // Fetch fresh data from Canvas
    const ctx = new CanvasContextService(apiKey, baseUrl)
    const graph = await ctx.buildStaticEntityMap(30)

    // Update last_synced_at in database
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('user_context_selections')
      .upsert(
        {
          user_id: user.id,
          last_synced_at: now,
        },
        {
          onConflict: 'user_id',
        },
      )

    if (updateError) {
      console.error('Error updating last_synced_at:', updateError)
      // Don't fail the request if timestamp update fails, but log it
    }

    return NextResponse.json({
      courses: graph.courses,
      last_synced_at: now,
    })
  } catch (error) {
    console.error('Context sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
