import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// Validate artifact_data structure based on artifact type
function validateArtifactData(data: any, artifactType: string): string | null {
  if (!data || typeof data !== 'object') {
    return 'artifact_data must be an object'
  }

  switch (artifactType) {
    case 'quiz':
      if (!data.title || !data.questions || !Array.isArray(data.questions)) {
        return 'Quiz artifact_data must have title and questions array'
      }
      // Validate each question has required fields
      for (const question of data.questions) {
        if (!question.id || !question.question || !question.type) {
          return 'Each quiz question must have id, question, and type'
        }
      }
      break

    case 'rubric_analysis':
      if (!data.assignmentName || !data.criteria || !Array.isArray(data.criteria) || !data.summary) {
        return 'Rubric analysis artifact_data must have assignmentName, criteria array, and summary'
      }
      if (!data.summary.overview || !data.summary.howToGetHD) {
        return 'Rubric analysis summary must have overview and howToGetHD'
      }
      break

    case 'note':
      if (!data.title || !data.sections || !Array.isArray(data.sections)) {
        return 'Note artifact_data must have title and sections array'
      }
      // Validate each section has required fields
      for (const section of data.sections) {
        if (!section.id || !section.heading || !section.content) {
          return 'Each note section must have id, heading, and content'
        }
      }
      break

    default:
      return `Unknown artifact type: ${artifactType}`
  }

  return null
}

// GET: Get a specific artifact by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
      }
      console.error('Error fetching artifact:', error)
      return NextResponse.json({ error: 'Failed to fetch artifact' }, { status: 500 })
    }

    return NextResponse.json({ artifact: data })
  } catch (error) {
    console.error('Artifact GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// PATCH: Update an artifact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, tags, artifact_data } = body

    // First, get the current artifact to validate type
    const { data: currentArtifact, error: fetchError } = await supabase
      .from('artifacts')
      .select('artifact_type')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !currentArtifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    // Build update object
    const updates: any = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: 'Title must be a non-empty string' }, { status: 400 })
      }
      updates.title = title.trim()
    }

    if (description !== undefined) {
      updates.description = description === null || description === '' ? null : String(description).trim()
    }

    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 })
      }
      updates.tags = tags
        .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
        .map((tag) => tag.trim())
    }

    if (artifact_data !== undefined) {
      if (typeof artifact_data !== 'object' || artifact_data === null) {
        return NextResponse.json({ error: 'artifact_data must be an object' }, { status: 400 })
      }

      // Validate artifact_data structure based on artifact_type
      const validationError = validateArtifactData(artifact_data, currentArtifact.artifact_type)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }

      updates.artifact_data = artifact_data
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update the artifact
    const { data, error } = await supabase
      .from('artifacts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, title, description, tags, artifact_type, artifact_data, created_at, updated_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
      }
      console.error('Error updating artifact:', error)
      return NextResponse.json({ error: 'Failed to update artifact' }, { status: 500 })
    }

    return NextResponse.json({ artifact: data })
  } catch (error) {
    console.error('Artifact PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// DELETE: Delete an artifact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createRouteHandlerClient(request)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('artifacts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting artifact:', error)
      return NextResponse.json({ error: 'Failed to delete artifact' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Artifact DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
