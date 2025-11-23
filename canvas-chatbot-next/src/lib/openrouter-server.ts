import { OpenRouter } from '@openrouter/sdk'

export function getOpenRouterClient(apiKey?: string) {
  const key = apiKey || process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY || ''
  if (!key) throw new Error('OpenRouter API key is missing')
  const headers: Record<string, string> = {
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': process.env.OPENROUTER_APP_TITLE || 'Canvas Chatbot',
  }
  return new OpenRouter({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1', headers })
}