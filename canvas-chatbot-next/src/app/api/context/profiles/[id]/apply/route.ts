import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// POST: Apply profile to current selections
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

    // Get the profile
    const { data: profile, error: profileError } = await supabase
      .from('context_profiles')
      .select('selected_courses, selected_assignments, selected_modules')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Apply profile to user_context_selections
    const { data, error } = await supabase
      .from('user_context_selections')
      .upsert(
        {
          user_id: user.id,
          selected_courses: profile.selected_courses || [],
          selected_assignments: profile.selected_assignments || [],
          selected_modules: profile.selected_modules || [],
          current_profile_id: id,
        },
        {
          onConflict: 'user_id',
        },
      )
      .select('selected_courses, selected_assignments, selected_modules, last_synced_at, current_profile_id')
      .single()

    if (error) {
      console.error('Error applying profile:', error)
      return NextResponse.json({ error: 'Failed to apply profile' }, { status: 500 })
    }

    return NextResponse.json({
      courses: (data?.selected_courses as number[]) || [],
      assignments: (data?.selected_assignments as number[]) || [],
      modules: (data?.selected_modules as number[]) || [],
      last_synced_at: data?.last_synced_at || null,
      current_profile_id: data?.current_profile_id || null,
    })
  } catch (error) {
    console.error('Apply profile error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
