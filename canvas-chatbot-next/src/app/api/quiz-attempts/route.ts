import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// GET: List user's quiz attempts with filtering
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

    let query = supabase
      .from('quiz_attempts')
      .select('id, score, total_questions, completed_at, time_taken_seconds, created_at')
      .eq('user_id', user.id)

    // Filter by artifact_id if provided (required for artifact-specific history)
    if (artifactId) {
      query = query.eq('artifact_id', artifactId)
    }

    // Sort by completed_at descending (most recent first)
    query = query.order('completed_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching quiz attempts:', error)
      return NextResponse.json({ error: 'Failed to fetch quiz attempts' }, { status: 500 })
    }

    return NextResponse.json({
      attempts: data || [],
    })
  } catch (error) {
    console.error('Quiz attempts GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST: Create new quiz attempt
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
    const { artifact_id, quiz_data, user_answers, self_assessments, time_taken_seconds, started_at } = body

    // Validate input
    if (!artifact_id || typeof artifact_id !== 'string') {
      return NextResponse.json({ error: 'artifact_id is required' }, { status: 400 })
    }

    if (!quiz_data || typeof quiz_data !== 'object') {
      return NextResponse.json({ error: 'quiz_data is required and must be an object' }, { status: 400 })
    }

    if (!user_answers || typeof user_answers !== 'object') {
      return NextResponse.json({ error: 'user_answers is required and must be an object' }, { status: 400 })
    }

    // Verify artifact exists and belongs to user
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .select('id')
      .eq('id', artifact_id)
      .eq('user_id', user.id)
      .single()

    if (artifactError || !artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    // Calculate score
    const totalQuestions = quiz_data.questions?.length || 0
    let score = 0

    if (quiz_data.questions && Array.isArray(quiz_data.questions)) {
      quiz_data.questions.forEach((question: any) => {
        const userAnswer = user_answers[question.id]
        if (userAnswer !== undefined) {
          if (question.type === 'multiple_choice') {
            if (question.allowMultiple && Array.isArray(question.correctAnswer)) {
              // Multiple select: check if all correct answers are selected and no incorrect ones
              const userArray = Array.isArray(userAnswer) ? userAnswer : []
              const correctArray = question.correctAnswer
              const userSet = new Set(userArray.map(String))
              const correctSet = new Set(correctArray.map(String))
              
              if (userSet.size === correctSet.size && 
                  Array.from(userSet).every(val => correctSet.has(val))) {
                score += 1
              }
            } else {
              // Single select
              if (userAnswer === question.correctAnswer) {
                score += 1
              }
            }
          } else if (question.type === 'true_false') {
            if (userAnswer === question.correctAnswer) {
              score += 1
            }
          } else if (question.type === 'short_answer') {
            // Use self-assessment for scoring
            const assessment = self_assessments?.[question.id]
            if (assessment === 'correct') {
              score += 1
            } else if (assessment === 'partial') {
              score += 0.5
            }
          }
        }
      })
    }

    // Create the quiz attempt
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        artifact_id: artifact_id,
        quiz_data: quiz_data,
        user_answers: user_answers,
        self_assessments: self_assessments || {},
        score: score,
        total_questions: totalQuestions,
        time_taken_seconds: time_taken_seconds || null,
        started_at: started_at || new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select('id, score, total_questions, completed_at, time_taken_seconds, created_at')
      .single()

    if (error) {
      console.error('Error creating quiz attempt:', error)
      return NextResponse.json({ error: 'Failed to create quiz attempt' }, { status: 500 })
    }

    return NextResponse.json({ attempt: data })
  } catch (error) {
    console.error('Quiz attempts POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
