import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// GET: Fetch user's current context selections
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

    const { data, error } = await supabase
      .from('user_context_selections')
      .select('selected_courses, selected_assignments, selected_modules, last_synced_at, current_preset_id')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If no record exists, return empty selections
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          courses: [],
          assignments: [],
          modules: [],
          last_synced_at: null,
          current_preset_id: null,
        })
      }
      console.error('Error fetching context selections:', error)
      return NextResponse.json({ error: 'Failed to fetch context selections' }, { status: 500 })
    }

    return NextResponse.json({
      courses: (data?.selected_courses as number[]) || [],
      assignments: (data?.selected_assignments as number[]) || [],
      modules: (data?.selected_modules as number[]) || [],
      last_synced_at: data?.last_synced_at || null,
      current_preset_id: data?.current_preset_id || null,
    })
  } catch (error) {
    console.error('Context selection GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST: Save/update user's context selections
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
    const { courses, modules } = body

    // Validate input
    if (!Array.isArray(courses) || !Array.isArray(body.assignments) || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'Invalid input: courses, assignments, and modules must be arrays' },
        { status: 400 },
      )
    }

    // Ensure all values are numbers
    const selectedCourses = courses.filter((id: any) => typeof id === 'number')
    const selectedAssignments = body.assignments.filter((id: any) => typeof id === 'number')
    const selectedModules = modules.filter((id: any) => typeof id === 'number')

    // Upsert the context selections
    // Clear current_preset_id when manually changing selections (not from preset)
    const { data, error } = await supabase
      .from('user_context_selections')
      .upsert(
        {
          user_id: user.id,
          selected_courses: selectedCourses,
          selected_assignments: selectedAssignments,
          selected_modules: selectedModules,
          current_preset_id: null, // Clear preset when manually changing selections
        },
        {
          onConflict: 'user_id',
        },
      )
      .select('selected_courses, selected_assignments, selected_modules, last_synced_at, current_preset_id')
      .single()

    if (error) {
      console.error('Error saving context selections:', error)
      return NextResponse.json({ error: 'Failed to save context selections' }, { status: 500 })
    }

    return NextResponse.json({
      courses: (data?.selected_courses as number[]) || [],
      assignments: (data?.selected_assignments as number[]) || [],
      modules: (data?.selected_modules as number[]) || [],
      last_synced_at: data?.last_synced_at || null,
      current_preset_id: data?.current_preset_id || null,
    })
  } catch (error) {
    console.error('Context selection POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
