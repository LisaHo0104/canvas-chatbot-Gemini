import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// POST: Apply preset to current selections
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the preset
    const { data: preset, error: presetError } = await supabase
      .from('context_presets')
      .select('selected_courses, selected_assignments, selected_modules')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (presetError || !preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
    }

    // Apply preset to user_context_selections
    const { data, error } = await supabase
      .from('user_context_selections')
      .upsert(
        {
          user_id: user.id,
          selected_courses: preset.selected_courses || [],
          selected_assignments: preset.selected_assignments || [],
          selected_modules: preset.selected_modules || [],
          current_preset_id: id,
        },
        {
          onConflict: 'user_id',
        },
      )
      .select('selected_courses, selected_assignments, selected_modules, last_synced_at, current_preset_id')
      .single()

    if (error) {
      console.error('Error applying preset:', error)
      return NextResponse.json({ error: 'Failed to apply preset' }, { status: 500 })
    }

    return NextResponse.json({
      courses: (data?.selected_courses as number[]) || [],
      assignments: (data?.selected_assignments as number[]) || [],
      modules: (data?.selected_modules as number[]) || [],
      last_synced_at: data?.last_synced_at || null,
      current_preset_id: data?.current_preset_id || null,
    })
  } catch (error) {
    console.error('Apply preset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
