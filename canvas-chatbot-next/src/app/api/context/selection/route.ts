import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// Helper function to normalize response items (handles both legacy number format and new object format)
function normalizeResponseItems(items: any): Array<{ id: number; name: string; code?: string }> {
  if (!Array.isArray(items)) return []
  return items.map(item => {
    if (typeof item === 'number') {
      // Legacy format: just an ID
      return { id: item, name: `Item ${item}` }
    } else if (typeof item === 'object' && item !== null) {
      // New format: object with id, name, code?
      return {
        id: item.id || item,
        name: item.name || `Item ${item.id || item}`,
        code: item.code,
      }
    }
    return { id: item, name: `Item ${item}` }
  })
}

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
      .select('selected_courses, selected_assignments, selected_modules, last_synced_at, current_profile_id, current_system_prompt_id, enabled_system_prompt_ids')
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
          current_profile_id: null,
          current_system_prompt_id: null,
          enabled_system_prompt_ids: [],
        })
      }
      console.error('Error fetching context selections:', error)
      return NextResponse.json({ error: 'Failed to fetch context selections' }, { status: 500 })
    }

    return NextResponse.json({
      courses: normalizeResponseItems(data?.selected_courses || []),
      assignments: normalizeResponseItems(data?.selected_assignments || []),
      modules: normalizeResponseItems(data?.selected_modules || []),
      last_synced_at: data?.last_synced_at || null,
      current_profile_id: data?.current_profile_id || null,
      current_system_prompt_id: data?.current_system_prompt_id || null,
      enabled_system_prompt_ids: (data?.enabled_system_prompt_ids as string[]) || [],
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
    const { courses, modules, enabled_system_prompt_ids, current_profile_id } = body

    // Validate input
    if (!Array.isArray(courses) || !Array.isArray(body.assignments) || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'Invalid input: courses, assignments, and modules must be arrays' },
        { status: 400 },
      )
    }

    // Normalize to objects with {id, name, code?} format
    // Support both number arrays (backward compatibility) and object arrays
    const normalizeToObjects = (items: any[]): Array<{ id: number; name: string; code?: string }> => {
      return items.map(item => {
        if (typeof item === 'number') {
          // Legacy format: just an ID
          return { id: item, name: `Item ${item}` }
        } else if (typeof item === 'object' && item !== null && typeof item.id === 'number') {
          // New format: object with id, name, code?
          return {
            id: item.id,
            name: item.name || `Item ${item.id}`,
            code: item.code,
          }
        }
        return null
      }).filter((item): item is { id: number; name: string; code?: string } => item !== null)
    }

    const selectedCourses = normalizeToObjects(courses)
    const selectedAssignments = normalizeToObjects(body.assignments)
    const selectedModules = normalizeToObjects(modules)

    // Extract IDs for profile sync (numbers only)
    const extractIds = (items: Array<{ id: number; name: string; code?: string }>): number[] => {
      return items.map(item => item.id)
    }

    // Validate enabled_system_prompt_ids if provided
    let enabledPromptIds: string[] = []
    if (enabled_system_prompt_ids !== undefined) {
      if (!Array.isArray(enabled_system_prompt_ids)) {
        return NextResponse.json(
          { error: 'Invalid input: enabled_system_prompt_ids must be an array' },
          { status: 400 },
        )
      }
      enabledPromptIds = enabled_system_prompt_ids.filter((id: any) => typeof id === 'string')
    }

    // Get current profile_id from database if not provided in body
    let activeProfileId: string | null = current_profile_id !== undefined ? current_profile_id : null
    if (activeProfileId === undefined) {
      const { data: existing } = await supabase
        .from('user_context_selections')
        .select('current_profile_id')
        .eq('user_id', user.id)
        .single()
      activeProfileId = existing?.current_profile_id || null
    }

    // Build update object
    const updateData: any = {
      user_id: user.id,
      selected_courses: selectedCourses,
      selected_assignments: selectedAssignments,
      selected_modules: selectedModules,
    }

    // Only update current_profile_id if explicitly provided (null to clear, or a profile ID)
    if (current_profile_id !== undefined) {
      updateData.current_profile_id = current_profile_id
    }

    // Only update enabled_system_prompt_ids if provided
    if (enabled_system_prompt_ids !== undefined) {
      updateData.enabled_system_prompt_ids = enabledPromptIds
    }

    // Upsert the context selections
    const { data, error } = await supabase
      .from('user_context_selections')
      .upsert(updateData, {
        onConflict: 'user_id',
      })
      .select('selected_courses, selected_assignments, selected_modules, last_synced_at, current_profile_id, current_system_prompt_id, enabled_system_prompt_ids')
      .single()

    if (error) {
      console.error('Error saving context selections:', error)
      return NextResponse.json({ error: 'Failed to save context selections' }, { status: 500 })
    }

    // Auto-sync to active profile if one is set
    if (activeProfileId && data?.current_profile_id === activeProfileId) {
      try {
        // Update the profile with the new selections
        const { error: profileError } = await supabase
          .from('context_profiles')
          .update({
            selected_courses: extractIds(selectedCourses),
            selected_assignments: extractIds(selectedAssignments),
            selected_modules: extractIds(selectedModules),
          })
          .eq('id', activeProfileId)
          .eq('user_id', user.id)

        if (profileError) {
          console.error('Error syncing to profile:', profileError)
          // Don't fail the request if profile sync fails, just log it
        }
      } catch (syncError) {
        console.error('Error syncing to profile:', syncError)
        // Don't fail the request if profile sync fails
      }
    }

    return NextResponse.json({
      courses: normalizeResponseItems(data?.selected_courses || []),
      assignments: normalizeResponseItems(data?.selected_assignments || []),
      modules: normalizeResponseItems(data?.selected_modules || []),
      last_synced_at: data?.last_synced_at || null,
      current_profile_id: data?.current_profile_id || null,
      current_system_prompt_id: data?.current_system_prompt_id || null,
      enabled_system_prompt_ids: (data?.enabled_system_prompt_ids as string[]) || [],
    })
  } catch (error) {
    console.error('Context selection POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
