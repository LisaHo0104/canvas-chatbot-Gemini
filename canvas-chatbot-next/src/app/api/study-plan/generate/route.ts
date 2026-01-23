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

    // Build context for assignments
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

    // Build a map of moduleId -> module for quick lookup
    const moduleMap = new Map(selectedModules.map(m => [m.id, m]))
    
    // Get API key and model setup for topic extraction (do this once, not in the loop)
    const apiKeyOpenRouter = process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY
    if (!apiKeyOpenRouter) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }
    const selectedModel = await getDefaultModelId()
    const openrouter = createOpenRouterProvider(apiKeyOpenRouter)
    
    // Extract smaller core concepts from each selected item
    const allEvents: Array<{
      title: string
      type: string
      moduleId: number
      itemId: number
      description?: string
      itemType?: string
    }> = []

    for (const selectedItem of selectedItemsArray) {
      const module = moduleMap.get(selectedItem.moduleId)
      if (!module) continue

      const item = module.items?.find((i: any) => i.id === selectedItem.itemId)
      if (!item) continue

      // Skip if item is an exam, quiz, assignment, or introduction
      const itemTitleLower = item.title.toLowerCase()
      if (itemTitleLower.includes('midterm') || 
          itemTitleLower.includes('exam') ||
          itemTitleLower.includes('quiz') ||
          itemTitleLower.includes('assignment') ||
          itemTitleLower.includes('introduction') ||
          itemTitleLower.includes('intro') ||
          itemTitleLower.includes('overview')) {
        continue
      }

      // Fetch content from the item - this is critical for topic extraction
      let itemContent = ''
      try {
        if (item.type === 'Page') {
          const pageUrl = (item as any).html_url || item.url || ''
          if (pageUrl) {
            const page = await canvasService.getPageContent(courseId, pageUrl)
            // Extract more content and clean it better
            const rawContent = page.body || ''
            itemContent = rawContent
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ') // Remove scripts
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ') // Remove styles
              .replace(/<[^>]*>/g, ' ') // Remove HTML tags
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim()
              .substring(0, 20000) || '' // Increased to 20000 chars for better extraction
            
            console.log(`[DEBUG] Fetched ${itemContent.length} chars of content from page "${item.title}"`)
          }
        } else if (item.type === 'File') {
          const fileId = (item as any).content_id
          if (fileId) {
            try {
              const fileText = await canvasService.getFileText(fileId)
              itemContent = fileText?.substring(0, 20000) || '' // Increased to 20000 chars
              console.log(`[DEBUG] Fetched ${itemContent.length} chars of content from file "${item.title}"`)
            } catch (e) {
              console.log(`Could not extract text from file ${fileId}:`, e)
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching content for item ${item.id}:`, error)
      }
      
      // If no content was fetched, log it
      if (!itemContent || itemContent.length < 100) {
        console.warn(`[DEBUG] Item "${item.title}" has insufficient content (${itemContent.length} chars) - topic extraction may fail`)
      }

      // Extract smaller core concepts from content
      // CRITICAL: Always try to extract topics if we have content (even if minimal)
      // This breaks down items into multiple core concepts
      if (itemContent && itemContent.length >= 50) { // Require at least 50 chars of content
        try {
          const topicExtractionPrompt = `Analyze the following course content and break it down into 3-8 smaller, focused CORE CONCEPTS. Each concept should be a specific, learnable topic that students need to master.

Module: ${module.name}
Item: ${item.title}${(itemTitleLower.includes('core concepts') || itemTitleLower.includes('advanced topics') || itemTitleLower.includes('fundamentals')) ? ' (NOTE: This is a generic title - extract the actual specific concepts from the content below)' : ''}

Content:
${itemContent}

Return ONLY a JSON array of core concept names (strings), like:
["Gates & Boolean Algebra", "Programmable Gates & Control Bits", "Multiplexing & Demultiplexing", "Combinational Circuits – Half Adder & Full Adder", "Clock & ALU"]

CRITICAL RULES:
- Extract 3-8 core concepts from the content
- Each concept should be specific and focused (not too broad)
- Each concept should be a complete, learnable topic
- Use descriptive, specific names that clearly indicate what will be learned
- Avoid generic names like "Introduction", "Overview", "Basics", "Core Concepts", "Advanced Topics", "Fundamentals"
- Skip introductory content - focus on actual learning concepts
- Each concept should represent a distinct learning objective
- Concepts should cover the main topics in the content
- If the item title is generic (like "Core Concepts" or "Advanced Topics"), you MUST extract the actual specific concepts from the content - do not use the generic title
- Each concept name should be a standalone learning topic (e.g., "Gates & Boolean Algebra" not "Core Concepts: Gates")

Return ONLY the JSON array, no other text.`

          const topicResult = await generateText({
            model: openrouter.chat(selectedModel),
            prompt: topicExtractionPrompt,
            temperature: 0.7,
            maxTokens: 1000, // Increased to allow more topics
          })
          
          console.log('[DEBUG] Topic extraction result:', topicResult.text)

          // Parse topics from response
          try {
            const jsonMatch = topicResult.text.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
              const topics: string[] = JSON.parse(jsonMatch[0])
              
              console.log(`[DEBUG] Extracted ${topics.length} topics from item "${item.title}":`, topics)
              
              if (topics.length === 0) {
                throw new Error('No topics extracted')
              }
              
              // Filter out introduction/generic topics and create events
              let validTopicsCount = 0
              topics.forEach((topicName) => {
                const topicLower = topicName.toLowerCase().trim()
                // Skip if it's an introduction or generic topic
                if (topicLower.includes('introduction') || 
                    topicLower.includes('intro') ||
                    topicLower.includes('overview') ||
                    (topicLower.includes('basics') && topicLower.length < 20) ||
                    topicLower === 'core concepts' ||
                    topicLower === 'advanced topics' ||
                    topicLower === 'fundamentals' ||
                    topicLower.length < 3) {
                  console.log(`[DEBUG] Skipping generic topic: ${topicName}`)
                  return
                }
                
                validTopicsCount++
                // Create one event per extracted core concept
                // Use just the concept name as the title (e.g., "Gates & Boolean Algebra")
                allEvents.push({
                  title: topicName.trim(), // Just the concept name, not "Study Module: Concept"
                  type: 'study_session',
                  moduleId: selectedItem.moduleId,
                  itemId: selectedItem.itemId,
                  description: topicName.trim(),
                  itemType: item.type,
                })
              })
              
              console.log(`[DEBUG] Created ${validTopicsCount} events from item "${item.title}"`)
              
              if (validTopicsCount === 0) {
                throw new Error('All extracted topics were filtered out as generic')
              }
            } else {
              console.error('[DEBUG] No JSON array found in response:', topicResult.text)
              throw new Error('No JSON array found')
            }
          } catch (parseError) {
            console.error('Failed to parse topics, falling back to item title:', parseError)
            // Fallback: if item title is generic, try to extract from content again with a different prompt
            // Otherwise skip if it's generic
            if (itemTitleLower.includes('core concepts') || 
                itemTitleLower.includes('advanced topics') ||
                itemTitleLower.includes('fundamentals') ||
                itemTitleLower.includes('basics')) {
              // Don't create event for generic titles - we need actual concepts
              console.log(`Skipping generic item title: ${item.title}`)
            } else if (!itemTitleLower.includes('introduction') && !itemTitleLower.includes('intro')) {
              allEvents.push({
                title: item.title, // Use item title directly
                type: 'study_session',
                moduleId: selectedItem.moduleId,
                itemId: selectedItem.itemId,
                description: item.title,
                itemType: item.type,
              })
            }
          }
        } catch (aiError) {
          console.error('Error extracting topics with AI, falling back to item title:', aiError)
          // Fallback: skip generic titles
          if (itemTitleLower.includes('core concepts') || 
              itemTitleLower.includes('advanced topics') ||
              itemTitleLower.includes('fundamentals') ||
              itemTitleLower.includes('basics')) {
            console.log(`Skipping generic item title: ${item.title}`)
          } else if (!itemTitleLower.includes('introduction') && !itemTitleLower.includes('intro')) {
            allEvents.push({
              title: item.title,
              type: 'study_session',
              moduleId: selectedItem.moduleId,
              itemId: selectedItem.itemId,
              description: item.title,
              itemType: item.type,
            })
          }
        }
      } else {
        // No content available - skip generic titles, only create events for specific item titles
        if (itemTitleLower.includes('core concepts') || 
            itemTitleLower.includes('advanced topics') ||
            itemTitleLower.includes('fundamentals') ||
            itemTitleLower.includes('basics')) {
          // Skip generic titles when there's no content to extract from
          console.log(`Skipping generic item title (no content): ${item.title}`)
        } else if (!itemTitleLower.includes('introduction') && 
            !itemTitleLower.includes('intro') &&
            !itemTitleLower.includes('midterm') &&
            !itemTitleLower.includes('exam')) {
          allEvents.push({
            title: item.title,
            type: 'study_session',
            moduleId: selectedItem.moduleId,
            itemId: selectedItem.itemId,
            description: item.title,
            itemType: item.type,
          })
        }
      }
    }

    // Filter out any events that are not core concepts
    const filteredEvents = allEvents.filter(event => {
      const titleLower = event.title.toLowerCase()
      // Filter out introductions, exams, quizzes, assignments, midterms
      if (titleLower.includes('introduction') ||
          titleLower.includes('intro') ||
          titleLower.includes('overview') ||
          titleLower.includes('midterm') ||
          titleLower.includes('exam') ||
          titleLower.includes('quiz') ||
          titleLower.includes('assignment')) {
        return false
      }
      return true
    })

    if (filteredEvents.length === 0) {
      return NextResponse.json(
        { error: 'No valid study topics found. Please select items that contain actual learning content (not introductions, exams, or quizzes).' },
        { status: 400 }
      )
    }

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

    const systemPrompt = `You are a helpful study planning assistant. Your task is to distribute study events across weeks based on the user's study preferences.

IMPORTANT: Only distribute the provided study events. Do NOT add any assignments, exams, quizzes, midterms, or introduction topics. Only include the core concept study sessions provided.

Return ONLY valid JSON in this exact structure:
{
  "timeline": [
    {
      "period": "Week 1",
      "startDate": "2024-01-15",
      "endDate": "2024-01-21",
      "events": [
        {
          "title": "Study Module 1: Topic 1",
          "type": "study_session",
          "date": "2024-01-15",
          "duration": "2 hours",
          "description": "Study this topic",
          "isChecked": false,
          "moduleId": 123,
          "itemId": 456
        }
      ]
    }
  ],
  "summary": {
    "totalWeeks": 4,
    "totalStudyHours": 20,
    "totalTopics": 10,
    "keyMilestones": []
  }
}

CRITICAL RULES:
- Distribute ONLY the provided core concept study events across weeks
- Do NOT add assignments, exams, quizzes, midterms, or introductions
- Each event already has a title, moduleId, and itemId - preserve these exactly
- Assign events to weeks starting from the current date
- Consider study preferences (hours per week, preferred schedule, learning style)
- Each week should have a reasonable number of study sessions based on available hours

Event types: ONLY "study_session" for core concepts
Use the current date as the starting point for Week 1.`

    const userPrompt = `Course: ${courseName} (ID: ${courseId})

Study Events to Distribute (ONLY these - do not add any others):
${filteredEvents.map((e, idx) => 
  `${idx + 1}. "${e.title}" (Module ID: ${e.moduleId}, Item ID: ${e.itemId}, Type: ${e.itemType || 'unknown'})`
).join('\n')}

Study Preferences:
- Goals: ${studyPreferences.studyGoals || 'Not specified'}
- Hours per week: ${studyPreferences.hoursPerWeek || 'Not specified'}
- Preferred schedule: ${studyPreferences.preferredSchedule || 'Not specified'}
- Learning style: ${studyPreferences.learningStyle || 'Not specified'}
- Priority areas: ${studyPreferences.priorityAreas || 'Not specified'}
- Deadlines: ${studyPreferences.deadlineInfo || 'None specified'}
- Additional notes: ${studyPreferences.additionalNotes || 'None'}

YOUR TASK:
1. Distribute the ${filteredEvents.length} core concept study events across weeks
2. Preserve the exact title, moduleId, and itemId for each event
3. Assign events to weeks based on available study hours per week
4. Consider the user's learning style and preferred schedule
5. Do NOT add any assignments, exams, quizzes, or midterms
6. Create a realistic study schedule that accounts for the user's preferences

Current date: ${new Date().toISOString().split('T')[0]}`

    // Calculate hours per week from preferences
    const hoursPerWeek = parseInt(studyPreferences.hoursPerWeek?.match(/\d+/)?.[0] || '10') || 10
    const eventsPerWeek = Math.max(1, Math.floor(hoursPerWeek / 2)) // Assume 2 hours per event
    
    // Distribute events across weeks
    const weeks: Array<{
      period: string
      startDate: string
      endDate: string
      events: any[]
    }> = []
    
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    
    for (let weekIndex = 0; weekIndex < Math.ceil(filteredEvents.length / eventsPerWeek); weekIndex++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(startDate.getDate() + weekIndex * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      const weekEvents = filteredEvents.slice(weekIndex * eventsPerWeek, (weekIndex + 1) * eventsPerWeek)
      
      // DO NOT add assignments, exams, quizzes, or midterms - only core concept study sessions
      
      const eventsForWeek = weekEvents.map((event, eventIndex) => {
        const eventDate = new Date(weekStart)
        eventDate.setDate(weekStart.getDate() + (eventIndex % 7)) // Spread across the week
        
        return {
          title: event.title,
          type: event.type,
          date: eventDate.toISOString().split('T')[0],
          duration: '2 hours',
          description: event.description || event.title,
          isChecked: false,
          moduleId: event.moduleId,
          itemId: event.itemId,
        }
      })
      
      weeks.push({
        period: `Week ${weekIndex + 1}`,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        events: eventsForWeek, // Only core concept study sessions, no assignments/exams/quizzes
      })
    }
    
    const generatedPlan = {
      timeline: weeks,
      summary: {
        totalWeeks: weeks.length,
        totalStudyHours: filteredEvents.length * 2, // 2 hours per event
        totalTopics: filteredEvents.length,
        totalAssignments: 0, // Not including assignments in the roadmap
        keyMilestones: [],
      },
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
