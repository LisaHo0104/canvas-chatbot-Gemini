import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenRouterProvider } from '@/lib/ai-sdk/openrouter'
import { getDefaultModelId } from '@/lib/ai-sdk/openrouter'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, operation, context, model } = body

    if (!text || !operation) {
      return NextResponse.json(
        { error: 'Missing required fields: text and operation' },
        { status: 400 }
      )
    }

    if (!['regenerate', 'expand', 'simplify', 'rephrase'].includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid operation. Must be one of: regenerate, expand, simplify, rephrase' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Please log in first' }, {
        status: 401,
      })
    }

    // Get model from request or use default
    const selectedModel = model || getDefaultModelId()
    const openrouter = createOpenRouterProvider()

    // Build prompt based on operation
    let systemPrompt = ''
    let userPrompt = ''

    switch (operation) {
      case 'regenerate':
        systemPrompt = 'You are a helpful writing assistant. Regenerate the following text with improved clarity, flow, and quality while maintaining the same meaning and key information.'
        userPrompt = `Regenerate this text:\n\n${text}`
        break
      case 'expand':
        systemPrompt = 'You are a helpful writing assistant. Expand the following text by adding more detail, examples, explanations, and context while maintaining the original meaning and structure.'
        userPrompt = `Expand this text with more detail and context:\n\n${text}`
        break
      case 'simplify':
        systemPrompt = 'You are a helpful writing assistant. Simplify the following text by using simpler language, shorter sentences, and clearer explanations while maintaining all key information and meaning.'
        userPrompt = `Simplify this text:\n\n${text}`
        break
      case 'rephrase':
        systemPrompt = 'You are a helpful writing assistant. Rephrase the following text using different wording and sentence structure while maintaining the exact same meaning and information.'
        userPrompt = `Rephrase this text:\n\n${text}`
        break
    }

    // Add context if provided
    if (context) {
      userPrompt += `\n\nContext: ${context}`
    }

    // Generate text using AI
    const result = await generateText({
      model: openrouter.chat(selectedModel),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 2000,
    })

    return NextResponse.json({
      text: result.text,
      operation,
    })
  } catch (error) {
    console.error('Error in AI edit API:', error)
    return NextResponse.json(
      { error: 'Failed to process AI edit request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
