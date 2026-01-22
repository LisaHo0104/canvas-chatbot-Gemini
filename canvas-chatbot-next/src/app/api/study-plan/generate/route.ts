import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { CanvasAPIService } from '@/lib/canvas-api'
import { generateText } from 'ai'
import { createOpenRouterProvider } from '@/lib/ai-sdk/openrouter'
import { getDefaultModelId } from '@/lib/ai-sdk/openrouter'

export const maxDuration = 300
export const runtime = 'nodejs'

interface StudyPreferences {
  studyGoals: string
  hoursPerWeek: string
  preferredSchedule: string
  learningStyle: string
  priorityAreas: string
  deadlineInfo: string
  additionalNotes: string
}

interface SelectedItem {
  moduleId: number
  itemId: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { courseId, courseName, selectedItems, studyPreferences } = body

    if (!courseId || !courseName || !selectedItems || !studyPreferences) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, courseName, selectedItems, studyPreferences' },
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

    // Get user's Canvas credentials
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('canvas_api_key_encrypted, canvas_api_url')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.canvas_api_key_encrypted || !profile?.canvas_api_url) {
      return NextResponse.json({ error: 'Canvas not configured' }, { status: 400 })
    }

    let apiKey: string
    let baseUrl: string
    try {
      apiKey = decrypt(profile.canvas_api_key_encrypted)
      baseUrl = profile.canvas_api_url
    } catch {
      return NextResponse.json({ error: 'Failed to decrypt Canvas API key' }, { status: 500 })
    }

    // Fetch Canvas data
    const canvasService = new CanvasAPIService(apiKey, baseUrl)
    
    let modules: any[] = []
    let assignments: any[] = []
    
    try {
      // Get course details
      const courses = await canvasService.getCourses({ enrollmentState: 'all' })
      const course = courses.find(c => c.id === courseId)
      if (!course) {
        return NextResponse.json({ error: 'Course not found in your Canvas account' }, { status: 404 })
      }

      // Get modules and their items
      modules = await canvasService.getModules(courseId, { includeItems: true, perPage: 50 })
      
      // Get assignments for the course
      assignments = await canvasService.getAssignments(courseId, {
        includeSubmission: true,
        orderBy: 'due_at',
        perPage: 100,
      })
    } catch (canvasError) {
      console.error('Error fetching Canvas data:', canvasError)
      return NextResponse.json(
        { error: 'Failed to fetch course data from Canvas', details: canvasError instanceof Error ? canvasError.message : 'Unknown error' },
        { status: 500 }
      )
    }

    // Filter selected items
    const selectedItemsArray: SelectedItem[] = Array.isArray(selectedItems) 
      ? selectedItems 
      : JSON.parse(selectedItems || '[]')
    
    const selectedModules = modules.filter(module => 
      selectedItemsArray.some(item => item.moduleId === module.id)
    )

    // Build context for AI
    const assignmentsContext = assignments
      .filter(a => a.due_at)
      .map(a => ({
        name: a.name,
        dueAt: a.due_at,
        points: a.points_possible,
        description: a.description?.substring(0, 200) || '',
        submitted: a.submission?.workflow_state === 'submitted',
      }))
      .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())

    const modulesContext = selectedModules.map(module => ({
      name: module.name,
      items: module.items
        .filter(item => selectedItemsArray.some(si => si.itemId === item.id && si.moduleId === module.id))
        .map(item => ({
          title: item.title,
          type: item.type,
          url: item.html_url,
        })),
    }))

    // Generate study plan using AI
    const apiKeyOpenRouter = process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY
    if (!apiKeyOpenRouter) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const selectedModel = await getDefaultModelId()
    const openrouter = createOpenRouterProvider(apiKeyOpenRouter)

    const systemPrompt = `You are a helpful study planning assistant. Generate a structured, personalized study plan based on the user's course data, selected modules, and study preferences.

Your task is to create a comprehensive study plan that:
1. Breaks down the selected modules into manageable study sessions
2. Schedules study time based on the user's available hours per week and preferred schedule
3. Prioritizes assignments based on due dates
4. Adapts to the user's learning style
5. Includes specific tasks and milestones

Return ONLY valid JSON in this exact structure:
{
  "timeline": [
    {
      "period": "Week 1",
      "startDate": "2024-01-15",
      "endDate": "2024-01-21",
      "events": [
        {
          "title": "Study Module 1: Introduction",
          "type": "study_session",
          "date": "2024-01-15",
          "duration": "2 hours",
          "description": "Review introduction materials and complete readings",
          "isChecked": false
        },
        {
          "title": "Assignment 1: Essay",
          "type": "assignment",
          "date": "2024-01-18",
          "dueDate": "2024-01-20",
          "points": 100,
          "description": "Complete and submit Assignment 1",
          "isChecked": false
        }
      ]
    }
  ],
  "summary": {
    "totalWeeks": 4,
    "totalStudyHours": 20,
    "totalAssignments": 5,
    "keyMilestones": ["Midterm Exam", "Final Project"]
  }
}

Event types can be: "study_session", "assignment", "exam", "review", "quiz"
Use the current date as the starting point for Week 1.`

    const userPrompt = `Course: ${courseName} (ID: ${courseId})

Selected Modules:
${modulesContext.map(m => `- ${m.name} (${m.items.length} items)`).join('\n')}

Upcoming Assignments:
${assignmentsContext.slice(0, 10).map(a => `- ${a.name}: Due ${a.dueAt ? new Date(a.dueAt).toLocaleDateString() : 'TBD'} (${a.points} points)`).join('\n')}

Study Preferences:
- Goals: ${studyPreferences.studyGoals || 'Not specified'}
- Hours per week: ${studyPreferences.hoursPerWeek || 'Not specified'}
- Preferred schedule: ${studyPreferences.preferredSchedule || 'Not specified'}
- Learning style: ${studyPreferences.learningStyle || 'Not specified'}
- Priority areas: ${studyPreferences.priorityAreas || 'Not specified'}
- Deadlines: ${studyPreferences.deadlineInfo || 'None specified'}
- Additional notes: ${studyPreferences.additionalNotes || 'None'}

Generate a study plan that:
1. Distributes study sessions across the available weeks
2. Schedules assignments before their due dates
3. Adapts to the learning style preference
4. Includes review sessions before exams
5. Breaks down large modules into smaller sessions
6. Accounts for the user's available hours per week

Current date: ${new Date().toISOString().split('T')[0]}`

    const result = await generateText({
      model: openrouter.chat(selectedModel),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    })

    // Parse AI response
    let generatedPlan
    try {
      // Try to extract JSON from the response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        generatedPlan = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Create a fallback structure
      generatedPlan = {
        timeline: [{
          period: 'Week 1',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          events: [{
            title: 'Start studying selected modules',
            type: 'study_session',
            date: new Date().toISOString().split('T')[0],
            duration: '2 hours',
            description: 'Begin working through selected course materials',
            isChecked: false,
          }],
        }],
        summary: {
          totalWeeks: 1,
          totalStudyHours: 2,
          totalAssignments: assignmentsContext.length,
          keyMilestones: [],
        },
      }
    }

    // Store in database
    const { data: studyPlan, error: insertError } = await supabase
      .from('study_plans')
      .insert({
        user_id: user.id,
        course_id: courseId,
        course_name: courseName,
        selected_items: selectedItemsArray,
        study_preferences: studyPreferences,
        generated_plan: generatedPlan,
        progress: { completedEvents: [] },
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving study plan:', insertError)
      return NextResponse.json(
        { error: 'Failed to save study plan', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      studyPlanId: studyPlan.id,
      generatedPlan,
    })
  } catch (error) {
    console.error('Error generating study plan:', error)
    return NextResponse.json(
      { error: 'Failed to generate study plan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
