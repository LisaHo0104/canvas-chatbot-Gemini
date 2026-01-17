import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// GET: List user's artifacts with optional filtering
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
    const artifactType = url.searchParams.get('type') // 'quiz' | 'rubric_analysis' | 'note' | 'assignment_plan' | 'assignment_summary' | null
    const search = url.searchParams.get('search') // search in title/description
    const sortBy = url.searchParams.get('sortBy') || 'created_at' // 'created_at' | 'updated_at' | 'title'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc' // 'asc' | 'desc'

    let query = supabase
      .from('artifacts')
      .select('id, title, description, tags, artifact_type, created_at, updated_at')
      .eq('user_id', user.id)

    // Filter by type if provided
    if (artifactType && (artifactType === 'quiz' || artifactType === 'rubric_analysis' || artifactType === 'note' || artifactType === 'assignment_plan' || artifactType === 'assignment_summary')) {
      query = query.eq('artifact_type', artifactType)
    }

    // Search in title and description if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`
      query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
    }

    // Sort
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching artifacts:', error)
      return NextResponse.json({ error: 'Failed to fetch artifacts' }, { status: 500 })
    }

    return NextResponse.json({
      artifacts: data || [],
    })
  } catch (error) {
    console.error('Artifacts GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST: Create new artifact
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
    const { title, description, tags, artifact_type, artifact_data } = body

    // Validate input
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!artifact_type || (artifact_type !== 'quiz' && artifact_type !== 'rubric_analysis' && artifact_type !== 'note' && artifact_type !== 'assignment_plan' && artifact_type !== 'assignment_summary')) {
      return NextResponse.json(
        { error: 'Invalid artifact_type. Must be "quiz", "rubric_analysis", "note", "assignment_plan", or "assignment_summary"' },
        { status: 400 },
      )
    }

    if (!artifact_data || typeof artifact_data !== 'object') {
      return NextResponse.json({ error: 'artifact_data is required and must be an object' }, { status: 400 })
    }

    // Normalize tags
    const normalizedTags = Array.isArray(tags)
      ? tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim())
      : []

    // Create the artifact
    const { data, error } = await supabase
      .from('artifacts')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        tags: normalizedTags,
        artifact_type: artifact_type,
        artifact_data: artifact_data,
      })
      .select('id, title, description, tags, artifact_type, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error creating artifact:', error)
      return NextResponse.json({ error: 'Failed to create artifact' }, { status: 500 })
    }

    return NextResponse.json({ artifact: data })
  } catch (error) {
    console.error('Artifacts POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
