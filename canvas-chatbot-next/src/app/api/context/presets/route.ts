import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// GET: List user's presets
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
      .from('context_presets')
      .select('id, name, description, selected_courses, selected_assignments, selected_modules, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching presets:', error)
      return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 })
    }

    return NextResponse.json({
      presets: data || [],
    })
  } catch (error) {
    console.error('Presets GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST: Create new preset
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
    const { name, description, courses, assignments, modules } = body

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Preset name is required' }, { status: 400 })
    }

    if (!Array.isArray(courses) || !Array.isArray(assignments) || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'Invalid input: courses, assignments, and modules must be arrays' },
        { status: 400 },
      )
    }

    // Ensure all values are numbers
    const selectedCourses = courses.filter((id: any) => typeof id === 'number')
    const selectedAssignments = assignments.filter((id: any) => typeof id === 'number')
    const selectedModules = modules.filter((id: any) => typeof id === 'number')

    // Check if preset with same name already exists for this user
    const { data: existing } = await supabase
      .from('context_presets')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A preset with this name already exists' }, { status: 400 })
    }

    // Create the preset
    const { data, error } = await supabase
      .from('context_presets')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        selected_courses: selectedCourses,
        selected_assignments: selectedAssignments,
        selected_modules: selectedModules,
      })
      .select('id, name, description, selected_courses, selected_assignments, selected_modules, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error creating preset:', error)
      return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 })
    }

    return NextResponse.json({ preset: data })
  } catch (error) {
    console.error('Presets POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
