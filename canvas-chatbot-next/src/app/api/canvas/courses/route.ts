import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { CanvasAPIService } from '@/lib/canvas-api'
import { rateLimitMiddleware } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 120

async function getCoursesHandler(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Please log in first' }), { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('canvas_api_key_encrypted, canvas_api_url')
      .eq('id', user.id)
      .single()

    if (userError) {
      return new Response(JSON.stringify({ error: 'Failed to load user profile' }), { status: 500 })
    }

    let canvasApiKey: string | undefined
    let canvasApiUrl: string | undefined
    if (userData?.canvas_api_key_encrypted && userData?.canvas_api_url) {
      try {
        canvasApiKey = decrypt(userData.canvas_api_key_encrypted)
        canvasApiUrl = userData.canvas_api_url
      } catch {
        return new Response(JSON.stringify({ error: 'Failed to decrypt Canvas API key' }), { status: 500 })
      }
    }

    if (!canvasApiKey || !canvasApiUrl) {
      return new Response(JSON.stringify({ error: 'Canvas connection missing' }), { status: 400 })
    }

    const url = new URL(request.url)
    const searchTerm = url.searchParams.get('searchTerm') || undefined
    const enrollmentState = (url.searchParams.get('enrollmentState') as 'active' | 'completed' | 'all') || 'active'
    const perPage = Number(url.searchParams.get('perPage') || '100')

    console.log('[DEBUG] Courses API called', { enrollmentState, perPage, searchTerm: searchTerm || '' })

    const api = new CanvasAPIService(canvasApiKey, canvasApiUrl)
    const courses = await api.getCourses({ enrollmentState, perPage, searchTerm })
    return new Response(JSON.stringify({ courses }), { status: 200 })
  } catch (error) {
    console.error('Courses API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}

export const GET = rateLimitMiddleware(getCoursesHandler)

