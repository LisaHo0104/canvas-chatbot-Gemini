import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// POST: Apply a system prompt (set it as the current active prompt for the user)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify the prompt exists and is accessible (template or user's own prompt)
    const { data: prompt, error: fetchError } = await supabase
      .from('system_prompts')
      .select('id, name, prompt_text, is_template, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !prompt) {
      return NextResponse.json({ error: 'System prompt not found' }, { status: 404 })
    }

    // Check access: templates are accessible by all, user prompts only by owner
    if (!prompt.is_template && prompt.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update user_context_selections to set current_system_prompt_id
    const { data: selection, error: updateError } = await supabase
      .from('user_context_selections')
      .upsert(
        {
          user_id: user.id,
          current_system_prompt_id: id,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select('current_system_prompt_id')
      .single()

    if (updateError) {
      console.error('Error applying system prompt:', updateError)
      return NextResponse.json({ error: 'Failed to apply system prompt' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      prompt: {
        id: prompt.id,
        name: prompt.name,
        prompt_text: prompt.prompt_text,
      },
    })
  } catch (error) {
    console.error('Apply system prompt error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
