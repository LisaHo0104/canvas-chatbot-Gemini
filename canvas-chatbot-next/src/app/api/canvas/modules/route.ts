import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { CanvasAPIService } from '@/lib/canvas-api'
import { rateLimitMiddleware } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 120

async function getModulesHandler(request: NextRequest) {
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
    const courseIdParam = url.searchParams.get('courseId')
    const courseId = courseIdParam ? Number(courseIdParam) : NaN
    if (!courseId || Number.isNaN(courseId)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid courseId' }), { status: 400 })
    }

    const includeItems = (url.searchParams.get('includeItems') ?? 'true') === 'true'
    const includeContentDetails = (url.searchParams.get('includeContentDetails') ?? 'false') === 'true'
    const perPage = Number(url.searchParams.get('perPage') || '50')

    console.log('[DEBUG] Modules API called', { courseId, includeItems, includeContentDetails, perPage })

    const api = new CanvasAPIService(canvasApiKey, canvasApiUrl)
    const modules = await api.getModules(courseId, { includeItems, includeContentDetails, perPage })
    return new Response(JSON.stringify({ modules }), { status: 200 })
  } catch (error) {
    console.error('Modules API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const statusCode = errorMessage.includes('404') || errorMessage.includes('not found') ? 404 : 500
    return new Response(JSON.stringify({ error: errorMessage }), { status: statusCode })
  }
}

export const GET = rateLimitMiddleware(getModulesHandler)

