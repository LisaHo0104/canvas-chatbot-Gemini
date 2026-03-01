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

async function moduleKeywordsHandler(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Please log in first' }), { status: 401 })
    }

    const url = new URL(request.url)
    const courseIdParam = url.searchParams.get('courseId')
    const moduleIdParam = url.searchParams.get('moduleId')
    const requested = Number(url.searchParams.get('count') || '30')
    const targetCount = Number.isFinite(requested) ? Math.max(10, Math.min(60, requested)) : 30
    console.log('[DEBUG] Module Flashcards API: keyword count resolved', { requested, targetCount })

    const courseId = courseIdParam ? Number(courseIdParam) : NaN
    const moduleId = moduleIdParam ? Number(moduleIdParam) : NaN
    if (!courseId || Number.isNaN(courseId) || !moduleId || Number.isNaN(moduleId)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid courseId/moduleId' }), { status: 400 })
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
    console.log('[DEBUG] Module Flashcards API: fetch pages', { courseId, moduleId })

    const modules = await api.getModules(courseId, { includeItems: true, includeContentDetails: true, perPage: 50 })
    const target = modules.find((m: any) => Number(m?.id) === Number(moduleId))
    if (!target) {
      return new Response(JSON.stringify({ error: 'Module not found' }), { status: 404 })
    }

    let pages: Array<{ title: string; body: string; url: string; htmlUrl?: string }> = []
    const pageItems = Array.isArray(target.items) ? target.items.filter((it: any) => String(it?.type) === 'Page') : []
    const pageFetchResults = await Promise.allSettled(
      pageItems.map(async (it: any) => {
        const candidateUrl = String((it as any)?.content_details?.page_url || it?.html_url || it?.url || '')
        const page = await api.getPageContent(courseId, candidateUrl)
        return {
          title: String(page?.title || it?.title || ''),
          body: String(page?.body || ''),
          url: String(page?.url || it?.html_url || candidateUrl || ''),
          htmlUrl: String((page as any)?.html_url || it?.html_url || candidateUrl || '')
        }
      })
    )
    const failures: Array<{ id?: any; title?: any }> = []
    pageFetchResults.forEach((res, idx) => {
      const it = pageItems[idx]
      if (res.status === 'fulfilled') {
        pages.push(res.value)
      } else {
        failures.push({ id: it?.id, title: it?.title })
      }
    })
    console.log('[DEBUG] Module pages processed summary', { totalItems: pageItems.length, success: pages.length, failures: failures.length })
    if (pages.length === 0) {
      return new Response(JSON.stringify({ error: 'No Canvas page content found in this module' }), { status: 404 })
    }

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

    const combinedText = pages
      .map((p, idx) => {
        const src = p.htmlUrl || p.url
        const text = cleanText(p.body)
        return `# Page ${idx + 1}: ${p.title}\nSource: ${src}\n\n${text}`
      })
      .join('\n\n')
    if (!combinedText.trim()) {
      return new Response(JSON.stringify({ error: 'No page content found in this module' }), { status: 404 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenRouter API key not configured' }), { status: 500 })
    }
    const selectedModel = await getDefaultModelId()
    const openrouter = createOpenRouterProvider(apiKey)
    const conn = await new OpenRouterService(apiKey).testConnection()
    if (!conn.success) {
      console.error('[DEBUG] Module Flashcards API: OpenRouter connection failed', { error: conn.error })
      return new Response(JSON.stringify({ error: conn.error || 'AI provider connection failed' }), { status: 500 })
    }

    console.log('[DEBUG] Module Flashcards model', selectedModel)
    console.log('[DEBUG] Module Flashcards prompt: generate summary and succinct keyword definitions')
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
      schemaName: 'ModuleSummaryKeywords',
      schemaDescription: 'Generate a concise study summary and ONLY core concept flashcard keywords with short definitions based ONLY on the Canvas module pages.',
      messages: [
        { role: 'system', content: 'You are an expert tutor. Use ENGLISH ONLY. Avoid hallucinations. Work from the provided Canvas pages only.' },
        { role: 'user', content: `Task A — Summary:\nWrite a concise study summary (8–12 sentences) of the module.\n\nTask B — Core Concepts ONLY:\nExtract exactly ${targetCount} CORE CONCEPT terms (definitions and named concepts only) across all pages.\n- DO NOT include methods, steps, examples, people, generic words, or trivial phrases.\n- Prefer formal definitions verbatim when present; otherwise write a clear 1–2 sentence definition.\n- Tag each card with category="core".\nIf fewer than ${targetCount} core concepts exist, return as many as available.\n\nCanvas Module Pages:\n${combinedText.substring(0, 28000)}` },
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

    console.log('[DEBUG] Module Flashcards API: generated cards', { count: cards.length, hasSummary: !!summary })
    return new Response(JSON.stringify({ summary, cards }), { status: 200 })
  } catch (error) {
    console.error('Module Keywords API error:', error)
    const msg = typeof (error as any)?.message === 'string' ? (error as any).message : ''
    return new Response(JSON.stringify({ error: msg ? `Internal error: ${msg}` : 'Internal server error' }), { status: 500 })
  }
}

export const GET = rateLimitMiddleware(moduleKeywordsHandler)
