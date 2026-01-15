import { NextRequest } from 'next/server'
import { createOpenRouterProvider } from '@/lib/ai-sdk/openrouter'
import { getDefaultModelId } from '@/lib/ai-sdk/openrouter'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = String(body?.text || '')
    const action = String(body?.action || 'regenerate')
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 })
    }
    const apiKey = process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OpenRouter API key not configured' }), { status: 500 })
    }
    const model = await getDefaultModelId()
    const provider = createOpenRouterProvider(apiKey)
    const prompt =
      `You are an editing assistant. Task: ${action}. Return only the improved text with no preface or explanation. Keep meaning.`
    console.log('[DEBUG] Edit API invoked', { action, length: text.length })
    const result = await provider.text(model, [{ role: 'system', content: prompt }, { role: 'user', content: text }])
    const output = await result.text()
    return new Response(JSON.stringify({ text: output }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), { status: 500 })
  }
}
