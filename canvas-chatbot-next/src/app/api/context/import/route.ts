import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// POST: Import selections from JSON file
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
    const { selections, applyDirectly, presetName, profileName } = body
    // Support both presetName (legacy) and profileName
    const nameToUse = profileName || presetName

    // Validate import data
    if (!selections || typeof selections !== 'object') {
      return NextResponse.json({ error: 'Invalid import data: selections required' }, { status: 400 })
    }

    if (!Array.isArray(selections.courses) || !Array.isArray(selections.assignments) || !Array.isArray(selections.modules)) {
      return NextResponse.json(
        { error: 'Invalid import data: courses, assignments, and modules must be arrays' },
        { status: 400 },
      )
    }

    // Ensure all values are numbers
    const selectedCourses = selections.courses.filter((id: any) => typeof id === 'number')
    const selectedAssignments = selections.assignments.filter((id: any) => typeof id === 'number')
    const selectedModules = selections.modules.filter((id: any) => typeof id === 'number')

    if (applyDirectly) {
      // Apply directly to current selections
      const { data, error } = await supabase
        .from('user_context_selections')
        .upsert(
          {
            user_id: user.id,
            selected_courses: selectedCourses,
            selected_assignments: selectedAssignments,
            selected_modules: selectedModules,
          },
          {
            onConflict: 'user_id',
          },
        )
        .select('selected_courses, selected_assignments, selected_modules, last_synced_at')
        .single()

      if (error) {
        console.error('Error applying imported selections:', error)
        return NextResponse.json({ error: 'Failed to apply imported selections' }, { status: 500 })
      }

      return NextResponse.json({
        courses: (data?.selected_courses as number[]) || [],
        assignments: (data?.selected_assignments as number[]) || [],
        modules: (data?.selected_modules as number[]) || [],
        last_synced_at: data?.last_synced_at || null,
        applied: true,
      })
    } else {
      // Save as new profile
      if (!nameToUse || typeof nameToUse !== 'string' || nameToUse.trim().length === 0) {
        return NextResponse.json({ error: 'Profile name is required when saving as profile' }, { status: 400 })
      }

      // Check if profile with same name already exists
      const { data: existing } = await supabase
        .from('context_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', nameToUse.trim())
        .single()

      if (existing) {
        return NextResponse.json({ error: 'A profile with this name already exists' }, { status: 400 })
      }

      // Create the profile
      const { data, error } = await supabase
        .from('context_profiles')
        .insert({
          user_id: user.id,
          name: nameToUse.trim(),
          description: (body.profileDescription || body.presetDescription)?.trim() || null,
          selected_courses: selectedCourses,
          selected_assignments: selectedAssignments,
          selected_modules: selectedModules,
        })
        .select('id, name, description, selected_courses, selected_assignments, selected_modules, created_at, updated_at')
        .single()

      if (error) {
        console.error('Error creating profile from import:', error)
        return NextResponse.json({ error: 'Failed to create profile from import' }, { status: 500 })
      }

      return NextResponse.json({
        profile: data,
        applied: false,
      })
    }
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
