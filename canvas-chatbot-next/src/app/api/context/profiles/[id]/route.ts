import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// GET: Get profile details
export async function GET(
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

    const { data, error } = await supabase
      .from('context_profiles')
      .select('id, name, description, selected_courses, selected_assignments, selected_modules, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }
      console.error('Error fetching profile:', error)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// PATCH: Update profile
export async function PATCH(
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

    // Verify profile belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from('context_profiles')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const updateData: any = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Profile name cannot be empty' }, { status: 400 })
      }
      updateData.name = body.name.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    if (body.courses !== undefined || body.assignments !== undefined || body.modules !== undefined) {
      if (body.courses !== undefined) {
        if (!Array.isArray(body.courses)) {
          return NextResponse.json({ error: 'courses must be an array' }, { status: 400 })
        }
        updateData.selected_courses = body.courses.filter((id: any) => typeof id === 'number')
      }

      if (body.assignments !== undefined) {
        if (!Array.isArray(body.assignments)) {
          return NextResponse.json({ error: 'assignments must be an array' }, { status: 400 })
        }
        updateData.selected_assignments = body.assignments.filter((id: any) => typeof id === 'number')
      }

      if (body.modules !== undefined) {
        if (!Array.isArray(body.modules)) {
          return NextResponse.json({ error: 'modules must be an array' }, { status: 400 })
        }
        updateData.selected_modules = body.modules.filter((id: any) => typeof id === 'number')
      }
    }

    // Check if new name conflicts with existing profile
    if (updateData.name) {
      const { data: nameConflict } = await supabase
        .from('context_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', updateData.name)
        .neq('id', id)
        .single()

      if (nameConflict) {
        return NextResponse.json({ error: 'A profile with this name already exists' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('context_profiles')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, name, description, selected_courses, selected_assignments, selected_modules, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// DELETE: Delete profile
export async function DELETE(
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

    // Verify profile belongs to user and delete
    const { error } = await supabase
      .from('context_profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting profile:', error)
      return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
