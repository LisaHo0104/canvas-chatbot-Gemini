import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id

    if (!planId) {
      return NextResponse.json(
        { error: 'Study plan ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Please log in first' }, {
        status: 401,
      })
    }

    // Fetch study plan
    const { data: studyPlan, error: fetchError } = await supabase
      .from('study_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !studyPlan) {
      return NextResponse.json(
        { error: 'Study plan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      studyPlan,
    })
  } catch (error) {
    console.error('Error fetching study plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch study plan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id
    const body = await request.json()
    const { progress } = body

    if (!planId) {
      return NextResponse.json(
        { error: 'Study plan ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Please log in first' }, {
        status: 401,
      })
    }

    // Update study plan progress
    const { data: studyPlan, error: updateError } = await supabase
      .from('study_plans')
      .update({ progress })
      .eq('id', planId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError || !studyPlan) {
      return NextResponse.json(
        { error: 'Failed to update study plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      studyPlan,
    })
  } catch (error) {
    console.error('Error updating study plan:', error)
    return NextResponse.json(
      { error: 'Failed to update study plan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
