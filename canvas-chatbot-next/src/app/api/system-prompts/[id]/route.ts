import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// GET: Fetch a specific system prompt
export async function GET(
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

    // Fetch the prompt (templates are viewable by all, user prompts only by owner)
    const { data, error } = await supabase
      .from('system_prompts')
      .select('id, name, description, prompt_text, is_template, template_type, user_id, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching system prompt:', error)
      return NextResponse.json({ error: 'Failed to fetch system prompt' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'System prompt not found' }, { status: 404 })
    }

    // Check access: templates are viewable by all, user prompts only by owner
    if (!data.is_template && data.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ prompt: data })
  } catch (error) {
    console.error('System prompt GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// PUT: Update a system prompt (only user's custom prompts, not templates)
export async function PUT(
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
    const body = await request.json()
    const { name, description, prompt_text } = body

    // First, verify the prompt exists and belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('system_prompts')
      .select('id, user_id, is_template')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'System prompt not found' }, { status: 404 })
    }

    // Cannot update templates
    if (existing.is_template) {
      return NextResponse.json({ error: 'Cannot update system templates' }, { status: 403 })
    }

    // Verify ownership
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Validate input
    const updateData: any = {}
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Prompt name cannot be empty' }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (prompt_text !== undefined) {
      if (!prompt_text || typeof prompt_text !== 'string' || prompt_text.trim().length === 0) {
        return NextResponse.json({ error: 'Prompt text cannot be empty' }, { status: 400 })
      }
      updateData.prompt_text = prompt_text.trim()
    }

    // Check for duplicate name if name is being updated
    if (updateData.name) {
      const { data: duplicate } = await supabase
        .from('system_prompts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_template', false)
        .eq('name', updateData.name)
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json({ error: 'A prompt with this name already exists' }, { status: 400 })
      }
    }

    // Update the prompt
    const { data, error } = await supabase
      .from('system_prompts')
      .update(updateData)
      .eq('id', id)
      .select('id, name, description, prompt_text, is_template, template_type, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error updating system prompt:', error)
      return NextResponse.json({ error: 'Failed to update system prompt' }, { status: 500 })
    }

    return NextResponse.json({ prompt: data })
  } catch (error) {
    console.error('System prompt PUT error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// DELETE: Delete a system prompt (only user's custom prompts, not templates)
export async function DELETE(
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

    // First, verify the prompt exists and belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('system_prompts')
      .select('id, user_id, is_template')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'System prompt not found' }, { status: 404 })
    }

    // Cannot delete templates
    if (existing.is_template) {
      return NextResponse.json({ error: 'Cannot delete system templates' }, { status: 403 })
    }

    // Verify ownership
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the prompt
    const { error } = await supabase
      .from('system_prompts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting system prompt:', error)
      return NextResponse.json({ error: 'Failed to delete system prompt' }, { status: 500 })
    }

    // Also clear current_system_prompt_id if this was the active prompt
    await supabase
      .from('user_context_selections')
      .update({ current_system_prompt_id: null })
      .eq('user_id', user.id)
      .eq('current_system_prompt_id', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('System prompt DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
