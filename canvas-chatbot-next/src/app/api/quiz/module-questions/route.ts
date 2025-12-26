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

    const modules = await api.getModules(courseId, { includeItems: true, includeContentDetails: true, perPage: 50 })
    const target = modules.find((m: any) => Number(m?.id) === Number(moduleId))
    if (!target) {
      return new Response(JSON.stringify({ error: 'Module not found' }), { status: 404 })
    }

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
    const pages: Array<{ title: string; body: string; url: string; htmlUrl?: string }> = []
    const failures: Array<{ id?: any; title?: any }> = []
    pageFetchResults.forEach((res, idx) => {
      const it = pageItems[idx]
      if (res.status === 'fulfilled') {
        pages.push(res.value)
      } else {
        failures.push({ id: it?.id, title: it?.title })
      }
    })
    console.log('[DEBUG] Pages processed summary', { totalItems: pageItems.length, success: pages.length, failures: failures.length })
    if (failures.length > 0) {
      return new Response(JSON.stringify({ error: 'Failed to retrieve some Canvas page content', failedItems: failures, processed: pages.length, total: pageItems.length }), { status: 500 })
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
    console.log('[DEBUG] QnA prompt: ignoring Links & Checklist for question generation')
    console.log('[DEBUG] QnA prompt: in-depth Pareto summary enabled')
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
      schemaDescription: 'Pareto-structured week summary and multiple-choice Q&A based on Canvas module page content, grouped by thematic sections, with citations to source pages',
      messages: [
        { role: 'system', content: 'You are an expert tutor. Avoid hallucinations. Use ONLY the provided Canvas pages. First, produce an in-depth Pareto-structured Week/Module summary strictly from the pages, then generate multiple-choice questions based on that summary. For each question, provide 4–5 plausible options, mark the correct option index (0-based), and include a concise explanation that cites the specific source page. Include sourceUrl and sourceTitle. Group questions into thematic sections: Core Concepts & Definitions; Differentiating Communication Types; Case Studies & Applications; Tutorial Activities & Theory; Critical Thinking. Do NOT generate questions about the summary sections "🔗 All Resources & Links" or "✅ Quick Action Checklist".' },
        { role: 'user', content: `Context:\nCourse ID: ${courseId}\nModule: ${String(target?.name || '')}\n\nTask A — In-Depth Pareto Summary (internal, before quiz):\nApply the Pareto Principle (80/20) BUT write with depth and specificity using ONLY the Canvas pages. Keep the Pareto structure, but:\n- Extract formal definitions verbatim (use quotation marks) and cite the page.\n- Enumerate frameworks/models (steps/components) present in pages with brief explanations.\n- Include at least one scenario/example per core concept where available.\n- Call out subtle distinctions and boundary conditions noted in pages.\n\n# 📚 ${String(target?.name || 'Module')} Summary (Pareto Method)\n\n## 🎯 Core Concepts (The 20% You MUST Know)\nThese are the MOST IMPORTANT concepts that will give you 80% of the understanding:\n### 1. [Most Critical Concept]\n**Why it matters:** [Explain real-world importance]\n**Key takeaway:** [One sentence summary]\n**What you need to remember:** [Specific actionable points]\n### 2. [Second Most Critical Concept]\n[Same structure]\n---\n## 📖 Supporting Details (The Other 80%)\n- **Distinctions & Boundaries:** nuanced differences and edge cases noted in pages.\n- **Methods/Processes:** concrete steps, workflows, or checklists from pages.\n- **Examples & Cases:** short summaries of any cases/tutorial scenarios.\n---\n## 🔗 All Resources & Links\nList EVERY Canvas page link you used (make clickable):\n- 📄 [Page Title] - [Source URL]\n- 🎥 [Video Title] - [Source URL]\n- 📁 [PDF Name] - [Source URL]\n---\n## ✅ Quick Action Checklist\n1. ☐ Read/watch the PRIMARY resources above (30 mins)\n2. ☐ Understand the core concepts listed\n3. ☐ Do one practice activity from the pages\n4. ☐ Review supporting details if time permits\n\nTask B — Practice Question Generation (in-depth):\nGenerate ${questionsCount} multiple-choice questions using ONLY the Canvas pages and the in-depth Pareto summary.\n- Make questions specific and challenging but fair.\n- Include scenario-based stems and distinctions between closely related concepts.\n- Require recognition of verbatim definitions and framework steps when present.\n- Each question: clear stem; 4–5 plausible options; correctIndex (0-based); short explanation (1–3 sentences); include sourceUrl and sourceTitle for the specific page.\n- Set 'section' to one of: Core Concepts & Definitions; Differentiating Communication Types; Case Studies & Applications; Tutorial Activities & Theory; Critical Thinking.\n- Base questions strictly on the provided pages.\n- Ignore the Pareto summary sections "🔗 All Resources & Links" and "✅ Quick Action Checklist" when drafting questions. Do not create questions about URLs or action checklists.\n\nCONTENT:\n${combinedText}` },
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
