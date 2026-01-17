import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { OpenRouterService } from '@/lib/openrouter-service'

export const runtime = 'nodejs'
export const maxDuration = 60

interface EditRequest {
  instruction: string
  artifact_type: 'quiz' | 'rubric_analysis' | 'note' | 'assignment_plan' | 'assignment_summary'
}

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
      for (const section of data.sections) {
        if (!section.id || !section.heading || !section.content) {
          return 'Each note section must have id, heading, and content'
        }
      }
      break

    case 'assignment_plan':
      if (!data.content || typeof data.content !== 'string') {
        return 'Assignment plan artifact_data must have content (markdown string)'
      }
      break

    case 'assignment_summary':
      if (!data.content || typeof data.content !== 'string') {
        return 'Assignment summary artifact_data must have content (markdown string)'
      }
      break

    default:
      return `Unknown artifact type: ${artifactType}`
  }

  return null
}

// POST: Agent-initiated artifact editing
export async function POST(
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
    const body: EditRequest = await request.json()
    const { instruction, artifact_type } = body

    if (!instruction || typeof instruction !== 'string' || instruction.trim().length === 0) {
      return NextResponse.json({ error: 'instruction is required and must be a non-empty string' }, { status: 400 })
    }

    if (!artifact_type || !['quiz', 'rubric_analysis', 'note', 'assignment_plan', 'assignment_summary'].includes(artifact_type)) {
      return NextResponse.json({ error: 'artifact_type must be quiz, rubric_analysis, note, assignment_plan, or assignment_summary' }, { status: 400 })
    }

    // Get the current artifact
    const { data: artifact, error: fetchError } = await supabase
      .from('artifacts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    if (artifact.artifact_type !== artifact_type) {
      return NextResponse.json({ error: `Artifact type mismatch. Expected ${artifact.artifact_type}, got ${artifact_type}` }, { status: 400 })
    }

    // Get user's API key for OpenRouter
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('openrouter_api_key')
      .eq('user_id', user.id)
      .single()

    if (!userSettings?.openrouter_api_key) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 400 })
    }

    // Prepare the prompt for the AI
    const currentData = JSON.stringify(artifact.artifact_data, null, 2)
    const canvasContext = `You are an AI assistant that edits artifacts. The user wants you to modify an existing ${artifact_type} artifact based on their instruction.

Current artifact data:
\`\`\`json
${currentData}
\`\`\`

Your task:
1. Understand the current artifact structure
2. Apply the user's instruction to modify the artifact
3. Return ONLY the complete, updated artifact_data as valid JSON
4. Maintain the same structure and required fields
5. Do not add or remove required fields unless explicitly requested
6. Ensure all IDs remain unique
7. Preserve data integrity

Return the updated artifact_data as a JSON object. Do not include any explanation or markdown formatting - just the raw JSON object.`

    const userQuery = `Please edit the artifact according to this instruction: "${instruction}"

Return the complete updated artifact_data as a JSON object.`

    // Call OpenRouter to get the edited artifact
    const openRouterService = new OpenRouterService(userSettings.openrouter_api_key, 'anthropic/claude-3.5-sonnet')
    
    try {
      const response = await openRouterService.generateResponse(
        userQuery,
        canvasContext,
        [],
      )

      // Parse the response - it should be JSON
      let updatedData: any
      try {
        const responseText = typeof response === 'string' ? response : (response.content || String(response))
        // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/)
        const jsonString = jsonMatch ? jsonMatch[1] : responseText.trim()
        updatedData = JSON.parse(jsonString)
      } catch (parseError) {
        // If direct parse fails, try to find JSON object in the response
        const responseText = typeof response === 'string' ? response : (response.content || String(response))
        const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonObjectMatch) {
          updatedData = JSON.parse(jsonObjectMatch[0])
        } else {
          throw new Error('Failed to parse AI response as JSON')
        }
      }

      // Validate the updated data
      const validationError = validateArtifactData(updatedData, artifact_type)
      if (validationError) {
        return NextResponse.json({ 
          error: `Invalid artifact data structure: ${validationError}`,
          details: 'The AI-generated artifact data does not match the expected structure.'
        }, { status: 400 })
      }

      // Update the artifact
      const { data: updatedArtifact, error: updateError } = await supabase
        .from('artifacts')
        .update({ artifact_data: updatedData })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, title, description, tags, artifact_type, artifact_data, created_at, updated_at')
        .single()

      if (updateError) {
        console.error('Error updating artifact:', updateError)
        return NextResponse.json({ error: 'Failed to update artifact' }, { status: 500 })
      }

      return NextResponse.json({ 
        artifact: updatedArtifact,
        message: 'Artifact updated successfully'
      })
    } catch (aiError) {
      console.error('Error calling AI for artifact editing:', aiError)
      return NextResponse.json({ 
        error: 'Failed to process edit request',
        details: aiError instanceof Error ? aiError.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Artifact edit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
