import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// GET: List user's study plan progress for an artifact
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

    const url = new URL(request.url)
    const artifactId = url.searchParams.get('artifact_id')

    if (!artifactId) {
      return NextResponse.json({ error: 'artifact_id is required' }, { status: 400 })
    }

    // Verify artifact exists and belongs to user
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .select('id')
      .eq('id', artifactId)
      .eq('user_id', user.id)
      .single()

    if (artifactError || !artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('study_plan_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('artifact_id', artifactId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching study plan progress:', error)
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
    }

    return NextResponse.json({
      progress: data || [],
    })
  } catch (error) {
    console.error('Study plan progress GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST: Create or update milestone progress
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
    const { artifact_id, milestone_id, status, notes } = body

    // Validate input
    if (!artifact_id || typeof artifact_id !== 'string') {
      return NextResponse.json({ error: 'artifact_id is required' }, { status: 400 })
    }

    if (!milestone_id || typeof milestone_id !== 'string') {
      return NextResponse.json({ error: 'milestone_id is required' }, { status: 400 })
    }

    // Verify artifact exists and belongs to user
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .select('id, artifact_type')
      .eq('id', artifact_id)
      .eq('user_id', user.id)
      .single()

    if (artifactError || !artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    if (artifact.artifact_type !== 'study_plan') {
      return NextResponse.json({ error: 'Artifact is not a study plan' }, { status: 400 })
    }

    // Check if progress record exists
    const { data: existing, error: existingError } = await supabase
      .from('study_plan_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('artifact_id', artifact_id)
      .eq('milestone_id', milestone_id)
      .single()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (status !== undefined) {
      const validStatuses = ['not_started', 'in_progress', 'completed']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
      }
      updateData.status = status
      updateData.completed_at = status === 'completed' ? new Date().toISOString() : null
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    let data
    let error

    if (existing) {
      // Update existing record
      const result = await supabase
        .from('study_plan_progress')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()
      
      data = result.data
      error = result.error
    } else {
      // Create new record
      const result = await supabase
        .from('study_plan_progress')
        .insert({
          user_id: user.id,
          artifact_id: artifact_id,
          milestone_id: milestone_id,
          status: status || 'not_started',
          notes: notes || null,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .select()
        .single()
      
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Error saving study plan progress:', error)
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
    }

    return NextResponse.json({ progress: data })
  } catch (error) {
    console.error('Study plan progress POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// DELETE: Delete all progress for an artifact (reset)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const artifactId = url.searchParams.get('artifact_id')
    const milestoneId = url.searchParams.get('milestone_id')

    if (!artifactId) {
      return NextResponse.json({ error: 'artifact_id is required' }, { status: 400 })
    }

    // Verify artifact exists and belongs to user
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .select('id')
      .eq('id', artifactId)
      .eq('user_id', user.id)
      .single()

    if (artifactError || !artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    let query = supabase
      .from('study_plan_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('artifact_id', artifactId)

    // If milestone_id is provided, only delete that specific milestone's progress
    if (milestoneId) {
      query = query.eq('milestone_id', milestoneId)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting study plan progress:', error)
      return NextResponse.json({ error: 'Failed to delete progress' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Study plan progress DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
