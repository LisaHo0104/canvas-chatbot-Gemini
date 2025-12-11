import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { CanvasAPIService } from '@/lib/canvas-api'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { createOpenRouterProvider, getDefaultModelId } from '@/lib/ai-sdk/openrouter'
import { generateObject, jsonSchema } from 'ai'

export const runtime = 'nodejs'
export const maxDuration = 300

async function moduleQuestionsHandler(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Please log in first' }), { status: 401 })
    }

    const url = new URL(request.url)
    const courseIdParam = url.searchParams.get('courseId')
    const moduleIdParam = url.searchParams.get('moduleId')
    const questionsCount = Math.max(10, Math.min(20, Number(url.searchParams.get('count') || '15')))
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
    console.log('[DEBUG] QnA API: fetch module and pages', { courseId, moduleId })

    const modules = await api.getModules(courseId, { includeItems: true, includeContentDetails: false, perPage: 50 })
    const target = modules.find((m: any) => Number(m?.id) === Number(moduleId))
    if (!target) {
      return new Response(JSON.stringify({ error: 'Module not found' }), { status: 404 })
    }

    const pageItems = Array.isArray(target.items) ? target.items.filter((it: any) => String(it?.type) === 'Page') : []
    const pages: Array<{ title: string; body: string; url: string; htmlUrl?: string }> = []
    for (const it of pageItems) {
      try {
        const page = await api.getPageContent(courseId, String(it?.html_url || it?.url || ''))
        pages.push({
          title: String(page?.title || it?.title || ''),
          body: String(page?.body || ''),
          url: String(page?.url || it?.html_url || ''),
          htmlUrl: String((page as any)?.html_url || it?.html_url || '')
        })
      } catch (e) {
        console.error('[DEBUG] Failed to get page content', { itemId: it?.id })
      }
    }

    function cleanText(html: string): string {
      return html
        .replace(/<br\s*\/>?/gi, '\n')
        .replace(/<p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 20000)
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

    console.log('[DEBUG] QnA model', selectedModel)
    const { object } = await generateObject({
      model: openrouter.chat(selectedModel),
      schema: jsonSchema<{ summary: string; questions: Array<{ question: string; options: string[]; correctIndex: number; explanation: string; sourceUrl?: string; sourceTitle?: string; section?: string }> }>({
        type: 'object',
        properties: {
          summary: { type: 'string' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                options: { type: 'array', items: { type: 'string' }, minItems: 4 },
                correctIndex: { type: 'integer', minimum: 0 },
                explanation: { type: 'string' },
                sourceUrl: { type: 'string' },
                sourceTitle: { type: 'string' },
                section: { type: 'string' },
              },
              required: ['question', 'options', 'correctIndex', 'explanation'],
            },
          },
        },
        required: ['summary', 'questions'],
      }),
      schemaName: 'ModuleQnA_MCQs',
      schemaDescription: 'Week summary and multiple-choice Q&A based on Canvas module page content, grouped by thematic sections, with citations to source pages',
      messages: [
        { role: 'system', content: 'You are an expert tutor. First, produce a detailed Week summary based only on the provided Canvas pages. Then create multiple-choice questions strictly based on that content. Avoid hallucinations. Provide 4–5 plausible options, mark the correct option index, and include a short explanation referencing the content. Include sourceUrl and sourceTitle for the specific page the question comes from. Group questions into thematic sections: Core Concepts & Definitions; Differentiating Communication Types; Case Studies & Applications; Tutorial Activities & Theory; Critical Thinking.' },
        { role: 'user', content: `Context:\nCourse ID: ${courseId}\nModule: ${String(target?.name || '')}\n\nTask A — Week/Module Summary (internal, before quiz):\nCreate a structured summary titled 'Detailed Breakdown of ${String(target?.name || 'Module')}: <Detected Topic>' using this outline:\n- Week/Module Overview: detected focus topic and learning objectives inferred from page titles and content.\n- Core Content & Concepts: define key terms, frameworks, and models that appear in the pages; extract formal definitions verbatim when provided.\n- Activities & Tutorials: list practical tasks, scenarios, video lectures, and readings-in-review with page titles and Source URLs.\n- Connections: link to previous/next weeks if mentioned and summarize progression.\n- Study Tips & Assignment Prep: actionable guidance based on the provided materials.\nCite each Canvas page using its Title and Source URL.\n\nTask B — Quiz Generation:\nUsing the Week/Module Summary and the Canvas content, generate ${questionsCount} multiple-choice questions. Requirements:\n- Prioritize Core Concepts & Definitions; ensure at least 10 questions in this section.\n- For each question: clear stem; 4–5 plausible options; correctIndex (0-based); short explanation (1–3 sentences) referencing the source; include sourceUrl/sourceTitle.\n- Set 'section' to one of: Core Concepts & Definitions; Differentiating Communication Types; Case Studies & Applications; Tutorial Activities & Theory; Critical Thinking.\n- Base each question strictly on the provided pages; avoid external knowledge unless it is explicitly contained in the pages.\n\nCONTENT:\n${combinedText}` },
      ],
    })

    const summary = typeof object?.summary === 'string' ? object.summary : ''
    const questions = Array.isArray(object?.questions) ? object.questions : []
    console.log('[DEBUG] QnA API: generated questions', { count: questions.length, pages: pages.length, hasSummary: !!summary })
    return new Response(JSON.stringify({ pages, summary, questions }), { status: 200 })
  } catch (error) {
    console.error('Module QnA API error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}

export const GET = rateLimitMiddleware(moduleQuestionsHandler)
