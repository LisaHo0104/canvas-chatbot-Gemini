import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// GET: List user's profiles
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
      .from('context_profiles')
      .select('id, name, description, selected_courses, selected_assignments, selected_modules, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching profiles:', error)
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
    }

    return NextResponse.json({
      profiles: data || [],
    })
  } catch (error) {
    console.error('Profiles GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST: Create new profile
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
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 })
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

    // Check if profile with same name already exists for this user
    const { data: existing } = await supabase
      .from('context_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A profile with this name already exists' }, { status: 400 })
    }

    // Create the profile
    const { data, error } = await supabase
      .from('context_profiles')
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
      console.error('Error creating profile:', error)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('Profiles POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
