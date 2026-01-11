import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// GET: List all system templates and user's custom prompts
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch system templates (is_template = true, user_id = NULL)
    const { data: templates, error: templatesError } = await supabase
      .from('system_prompts')
      .select('id, name, description, prompt_text, is_template, template_type, created_at, updated_at')
      .eq('is_template', true)
      .is('user_id', null)
      .order('template_type', { ascending: true })

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    // Fetch user's custom prompts (is_template = false, user_id = current_user)
    const { data: userPrompts, error: userPromptsError } = await supabase
      .from('system_prompts')
      .select('id, name, description, prompt_text, is_template, template_type, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_template', false)
      .order('created_at', { ascending: false })

    if (userPromptsError) {
      console.error('Error fetching user prompts:', userPromptsError)
      return NextResponse.json({ error: 'Failed to fetch user prompts' }, { status: 500 })
    }

    return NextResponse.json({
      templates: templates || [],
      userPrompts: userPrompts || [],
    })
  } catch (error) {
    console.error('System prompts GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST: Create a new user system prompt preset
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, prompt_text, template_type } = body

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt name is required' }, { status: 400 })
    }

    if (!prompt_text || typeof prompt_text !== 'string' || prompt_text.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt text is required' }, { status: 400 })
    }

    // If template_type is provided, check if user already has a modified version of this template
    if (template_type) {
      const { data: existingModified } = await supabase
        .from('system_prompts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_template', false)
        .eq('template_type', template_type)
        .single()

      if (existingModified) {
        // Update existing modified version instead of creating a new one
        const { data, error } = await supabase
          .from('system_prompts')
          .update({
            name: name.trim(),
            description: description?.trim() || null,
            prompt_text: prompt_text.trim(),
          })
          .eq('id', existingModified.id)
          .select('id, name, description, prompt_text, is_template, template_type, created_at, updated_at')
          .single()

        if (error) {
          console.error('Error updating system prompt:', error)
          return NextResponse.json({ error: 'Failed to update system prompt' }, { status: 500 })
        }

        return NextResponse.json({ prompt: data })
      }
    }

    // Check if prompt with same name already exists for this user (only if not a template modification)
    if (!template_type) {
      const { data: existing } = await supabase
        .from('system_prompts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_template', false)
        .eq('name', name.trim())
        .single()

      if (existing) {
        return NextResponse.json({ error: 'A prompt with this name already exists' }, { status: 400 })
      }
    }

    // Create the prompt (user's custom prompt, not a template)
    const { data, error } = await supabase
      .from('system_prompts')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        prompt_text: prompt_text.trim(),
        is_template: false,
        template_type: template_type || null,
      })
      .select('id, name, description, prompt_text, is_template, template_type, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error creating system prompt:', error)
      return NextResponse.json({ error: 'Failed to create system prompt' }, { status: 500 })
    }

    return NextResponse.json({ prompt: data })
  } catch (error) {
    console.error('System prompts POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
