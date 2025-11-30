import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { decrypt } from '@/lib/crypto'
import { AIProviderService } from '@/lib/ai-provider-service'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { generateObject, convertToModelMessages, jsonSchema, type UIMessage } from 'ai'
import { createOpenRouterProvider, getDefaultModelId } from '@/lib/ai-sdk/openrouter'
import { SYSTEM_PROMPT } from '@/lib/system-prompt'

async function suggestionsHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      messages: incomingMessages,
      provider_id,
      model,
      model_override,
      max_suggestions = 4,
    } = body

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
          },
        },
      },
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Please log in first' }), { status: 401 })
    }

    let apiKey = process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenRouter API key not configured' }), { status: 500 })
    }

    let selectedModel = getDefaultModelId(typeof model === 'string' ? model : undefined)
    if (provider_id) {
      const providerService = new AIProviderService()
      try {
        const providers = await providerService.getUserProviders(user.id)
        const picked = providers.find((p: any) => p.id === provider_id)
        if (picked) {
          apiKey = decrypt(picked.api_key_encrypted)
          selectedModel =
            typeof model_override === 'string' && model_override.trim().length > 0
              ? model_override
              : picked.model_name
        }
      } catch {}
    }

    const openrouter = createOpenRouterProvider(apiKey)

    const sanitizedIncoming: any[] = Array.isArray(incomingMessages)
      ? (incomingMessages as UIMessage[]).map((m: any) => ({
          role: m.role,
          parts: Array.isArray(m.parts)
            ? m.parts.filter((p: any) => p?.type === 'text' || p?.type === 'file' || p?.type === 'reasoning')
            : [],
        }))
      : []

    const uiMessages: any[] = [
      { role: 'system', parts: [{ type: 'text', text: `${SYSTEM_PROMPT}` }] },
      ...sanitizedIncoming,
      {
        role: 'user',
        parts: [
          {
            type: 'text',
            text:
              `Based on the chat context and the last assistant reply, propose ${Math.max(1, Math.min(6, Number(max_suggestions) || 4))} short, actionable follow-up suggestions that a student using Canvas would likely click next. Keep each under 12 words, specific and helpful. Return ONLY valid JSON matching the schema.`,
          },
        ],
      },
    ]

    const messages = convertToModelMessages(uiMessages)

    const { object } = await generateObject({
      model: openrouter.chat(selectedModel),
      schema: jsonSchema<{ suggestions: string[] }>({
        type: 'object',
        properties: {
          suggestions: { type: 'array', items: { type: 'string' } },
        },
        required: ['suggestions'],
      }),
      schemaName: 'NextStepSuggestions',
      schemaDescription: 'Follow-up suggestions for Canvas assistant UI',
      messages,
    })

    const suggestions: string[] = Array.isArray(object?.suggestions)
      ? object.suggestions.filter((s) => typeof s === 'string' && s.trim().length > 0).slice(0, Math.max(1, Math.min(6, Number(max_suggestions) || 4)))
      : []

    return new Response(JSON.stringify({ suggestions }), { status: 200 })
  } catch (error) {
    console.error('Suggestions API error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500 },
    )
  }
}

export const POST = rateLimitMiddleware(suggestionsHandler)
