import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// GET: Export current selections as JSON
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

    // Get current selections
    const { data, error } = await supabase
      .from('user_context_selections')
      .select('selected_courses, selected_assignments, selected_modules, last_synced_at')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching selections:', error)
      return NextResponse.json({ error: 'Failed to fetch selections' }, { status: 500 })
    }

    const courses = (data?.selected_courses as number[]) || []
    const assignments = (data?.selected_assignments as number[]) || []
    const modules = (data?.selected_modules as number[]) || []

    // Create export object
    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      profile_name: null as string | null,
      selections: {
        courses,
        assignments,
        modules,
      },
      metadata: {
        last_synced_at: data?.last_synced_at || null,
        total_courses: courses.length,
        total_assignments: assignments.length,
        total_modules: modules.length,
      },
    }

    // Return as JSON with download headers
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="context-profile-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
