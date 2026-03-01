import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { CanvasAPIService } from '@/lib/canvas-api'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { createOpenRouterProvider, getDefaultModelId } from '@/lib/ai-sdk/openrouter'
import { generateObject, jsonSchema } from 'ai'
import { OpenRouterService } from '@/lib/openrouter-service'

export const runtime = 'nodejs'
export const maxDuration = 300

async function itemKeywordsHandler(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Please log in first' }), { status: 401 })
    }

    const url = new URL(request.url)
    const courseIdParam = url.searchParams.get('courseId')
    const moduleIdParam = url.searchParams.get('moduleId')
    const itemIdParam = url.searchParams.get('itemId')
    const requested = Number(url.searchParams.get('count') || '20')
    const targetCount = Number.isFinite(requested) ? Math.max(10, Math.min(40, requested)) : 20
    console.log('[DEBUG] Flashcards API: keyword count resolved', { requested, targetCount })

    const courseId = courseIdParam ? Number(courseIdParam) : NaN
    const moduleId = moduleIdParam ? Number(moduleIdParam) : NaN
    const itemId = itemIdParam ? Number(itemIdParam) : null
    if (!courseId || Number.isNaN(courseId) || !moduleId || Number.isNaN(moduleId) || !itemId || Number.isNaN(itemId)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid courseId/moduleId/itemId' }), { status: 400 })
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

    const api = new CanvasAPIService(canvasApiKey, canvasApiUrl)
    console.log('[DEBUG] Flashcards API: fetch module item page', { courseId, moduleId, itemId })

    const modules = await api.getModules(courseId, { includeItems: true, includeContentDetails: true, perPage: 50 })
    const target = modules.find((m: any) => Number(m?.id) === Number(moduleId))
    if (!target) {
      return new Response(JSON.stringify({ error: 'Module not found' }), { status: 404 })
    }
    const it = Array.isArray(target.items) ? target.items.find((x: any) => Number(x?.id) === Number(itemId)) : null
    if (!it) {
      return new Response(JSON.stringify({ error: 'Module item not found' }), { status: 404 })
    }
    if (String(it?.type) !== 'Page') {
      return new Response(JSON.stringify({ error: 'Item-level flashcards support Canvas Page items only' }), { status: 400 })
    }
    const candidateUrl = String((it as any)?.content_details?.page_url || it?.html_url || it?.url || '')
    const page = await api.getPageContent(courseId, candidateUrl)
    const title = String(page?.title || it?.title || '')
    const body = String(page?.body || '')
    const urlStr = String(page?.url || it?.html_url || candidateUrl || '')
    const htmlUrl = String((page as any)?.html_url || it?.html_url || candidateUrl || '')

    function cleanText(html: string): string {
      return html
        .replace(/<br\s*\/>?/gi, '\n')
        .replace(/<p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 30000)
    }
    function isAscii(str: string): boolean {
      return /^[\x00-\x7F]*$/.test(str || '')
    }

    const combinedText = `# Page: ${title}\nSource: ${htmlUrl || urlStr}\n\n${cleanText(body)}`
    if (!combinedText.trim()) {
      return new Response(JSON.stringify({ error: 'No page content found for this item' }), { status: 404 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenRouter API key not configured' }), { status: 500 })
    }
    const selectedModel = await getDefaultModelId()
    const openrouter = createOpenRouterProvider(apiKey)
    const conn = await new OpenRouterService(apiKey).testConnection()
    if (!conn.success) {
      console.error('[DEBUG] Flashcards API: OpenRouter connection failed', { error: conn.error })
      return new Response(JSON.stringify({ error: conn.error || 'AI provider connection failed' }), { status: 500 })
    }

    console.log('[DEBUG] Flashcards model', selectedModel)
    console.log('[DEBUG] Flashcards prompt: generate summary and succinct keyword definitions')
    const { object } = await generateObject({
      model: openrouter.chat(selectedModel),
      schema: jsonSchema<{ summary: string; cards: Array<{ word: string; definition: string; category: 'core' | 'detail' }> }>({
        type: 'object',
        properties: {
          summary: { type: 'string' },
          cards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                word: { type: 'string' },
                definition: { type: 'string' },
                category: { type: 'string', enum: ['core', 'detail'] },
              },
              required: ['word', 'definition', 'category'],
            },
          },
        },
        required: ['summary', 'cards'],
      }),
      schemaName: 'ItemSummaryKeywords',
      schemaDescription: 'Generate a concise study summary and ONLY core concepts (flashcard keywords) with short definitions based ONLY on the Canvas page content.',
      messages: [
        { role: 'system', content: 'You are an expert tutor. Use ENGLISH ONLY. Avoid hallucinations. Work from the provided Canvas page content only.' },
        { role: 'user', content: `Task A — Summary:\nWrite a concise study summary (6–10 sentences) of the page.\n\nTask B — Core Concepts ONLY:\nExtract exactly ${targetCount} CORE CONCEPT terms (definitions and named concepts only).\n- DO NOT include methods, steps, examples, people, generic words, or trivial phrases.\n- Prefer formal definitions verbatim when present; otherwise write a clear 1–2 sentence definition.\n- Tag each card with category="core".\nIf fewer than ${targetCount} core concepts exist, return as many as available.\n\nCanvas Page:\n${combinedText.substring(0, 28000)}` },
      ],
    })

    const summary = typeof object?.summary === 'string' ? object.summary : ''
    let rawCards = Array.isArray(object?.cards) ? object.cards : []
    const cards = rawCards
      .map((c: any) => ({
        word: String(c?.word || '').trim(),
        definition: String(c?.definition || '').trim(),
        category: String(c?.category || '').trim(),
      }))
      .filter(c => c.category === 'core' && !!c.word && !!c.definition && isAscii(c.word) && isAscii(c.definition))
      .slice(0, targetCount)

    console.log('[DEBUG] Flashcards API: generated cards', { count: cards.length, hasSummary: !!summary })
    return new Response(JSON.stringify({ summary, cards, page: { title, url: urlStr, htmlUrl } }), { status: 200 })
  } catch (error) {
    console.error('Item Keywords API error:', error)
    const msg = typeof (error as any)?.message === 'string' ? (error as any).message : ''
    return new Response(JSON.stringify({ error: msg ? `Internal error: ${msg}` : 'Internal server error' }), { status: 500 })
  }
}

export const GET = rateLimitMiddleware(itemKeywordsHandler)
