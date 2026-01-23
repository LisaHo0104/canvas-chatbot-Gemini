import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { CanvasAPIService } from '@/lib/canvas-api'
import { generateText } from 'ai'
import { createOpenRouterProvider } from '@/lib/ai-sdk/openrouter'
import { getDefaultModelId } from '@/lib/ai-sdk/openrouter'

export const maxDuration = 300
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      eventTitle,
      eventDescription,
      eventType,
      contentType,
      courseId,
      courseName,
      model,
      moduleId,
      itemId,
    } = body

    if (!eventTitle || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: eventTitle, contentType' },
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

    let canvasContext = ''
    let itemContent = ''
    
    if (!profileError && profile?.canvas_api_key_encrypted && profile?.canvas_api_url) {
      try {
        const apiKey = decrypt(profile.canvas_api_key_encrypted)
        const canvasService = new CanvasAPIService(apiKey, profile.canvas_api_url)
        
        if (courseId) {
          // If moduleId and itemId are provided, fetch the specific item content
          if (moduleId && itemId) {
            try {
              const modules = await canvasService.getModules(courseId, { includeItems: true, perPage: 50 })
              const module = modules.find(m => m.id === moduleId)
              
              if (module) {
                const item = module.items?.find((i: any) => i.id === itemId)
                
                if (item) {
                  // Fetch actual content based on item type
                  if (item.type === 'Page') {
                    const pageUrl = (item as any).html_url || item.url || ''
                    if (pageUrl) {
                      const page = await canvasService.getPageContent(courseId, pageUrl)
                      // Extract text from HTML body (strip HTML tags roughly)
                      itemContent = page.body?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 10000) || ''
                    }
                  } else if (item.type === 'File') {
                    const fileId = (item as any).content_id
                    if (fileId) {
                      try {
                        const fileText = await canvasService.getFileText(fileId)
                        itemContent = fileText?.substring(0, 10000) || ''
                      } catch (e) {
                        console.log(`Could not extract text from file ${fileId}`)
                      }
                    }
                  }
                  
                  canvasContext = `
Course: ${courseName || 'Unknown'} (ID: ${courseId})
Module: ${module.name} (ID: ${moduleId})
Item: ${item.title} (ID: ${itemId}, Type: ${item.type})
${itemContent ? `\nItem Content:\n${itemContent}` : ''}
`
                }
              }
            } catch (itemErr) {
              console.error('Error fetching specific item content:', itemErr)
              // Fall back to general context
            }
          }
          
          // If we don't have specific item content, fetch general course context
          if (!itemContent && courseId) {
            const modules = await canvasService.getModules(courseId, { includeItems: true, perPage: 50 })
            const assignments = await canvasService.getAssignments(courseId, { perPage: 50 })
            
            canvasContext = `
Course: ${courseName || 'Unknown'} (ID: ${courseId})

Modules:
${modules.slice(0, 5).map(m => `- ${m.name} (${m.items?.length || 0} items)`).join('\n')}

Upcoming Assignments:
${assignments.slice(0, 5).map(a => `- ${a.name}: ${a.due_at ? new Date(a.due_at).toLocaleDateString() : 'TBD'}`).join('\n')}
`
          }
        }
      } catch (canvasErr) {
        console.error('Error fetching Canvas context:', canvasErr)
        // Continue without Canvas context
      }
    }

    // Get API key and model
    const apiKey = process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const selectedModelId = model || await getDefaultModelId()
    const openrouter = createOpenRouterProvider(apiKey)

    // Build system prompt based on content type
    let systemPrompt = ''
    let userPrompt = ''

    switch (contentType) {
      case 'summary':
        systemPrompt = `You are a helpful study assistant. Generate a detailed, comprehensive summary in MARKDOWN format for the study topic: "${eventTitle}".

${eventDescription ? `Event Description: ${eventDescription}` : ''}

${canvasContext ? `Canvas Context:\n${canvasContext}` : ''}

Generate a detailed, well-structured markdown summary following this format:

# [Topic Name]

[Start with a comprehensive overview paragraph (3-5 sentences) that explains the concept in detail, its importance, and how it relates to the broader subject. Make it clear and accessible, like explaining to a student.]

## Key Concepts

### [Concept 1 Name]
[Provide a detailed explanation (2-4 sentences) of this concept. Include examples, real-world applications, and why it matters. Be specific and thorough.]

### [Concept 2 Name]
[Detailed explanation with examples and context...]

[Continue with 3-5 key concepts, each with detailed explanations]

## How It Works

[Explain the mechanics, processes, or principles in detail. Use clear examples and analogies where helpful.]

## Applications

[Describe how this is used in practice, real-world examples, and practical applications. Be specific and concrete.]

## Key Takeaways

- [Important point 1]
- [Important point 2]
- [Important point 3]
[Include 3-5 key takeaways that summarize the most important points]

CRITICAL REQUIREMENTS:
- Be detailed and comprehensive - explain concepts thoroughly
- Use clear, accessible language suitable for students
- Include real-world examples and applications
- Make connections between concepts clear
- Ensure the summary is substantial and informative
- Use proper markdown formatting with headings, bold for emphasis, and bullet points

Return ONLY markdown text, no JSON or code blocks.`
        userPrompt = `Generate a detailed, comprehensive markdown summary for: ${eventTitle}. Make it thorough and informative, explaining all key concepts in detail.`
        break

      case 'mindmap':
        systemPrompt = `You are a helpful study assistant. Generate a hierarchical mind map in MARKDOWN format for the study topic: "${eventTitle}".

${eventDescription ? `Event Description: ${eventDescription}` : ''}

${canvasContext ? `Canvas Context:\n${canvasContext}` : ''}

Generate a hierarchical mind map using tree characters to show the structure. Use this EXACT format:

[Main Topic Name]
 ├── [Main Branch 1]
 │    ├── [Sub-branch 1.1]
 │    ├── [Sub-branch 1.2]
 │    └── [Sub-branch 1.3]
 ├── [Main Branch 2]
 │    ├── [Sub-branch 2.1]
 │    ├── [Sub-branch 2.2]
 │    └── [Sub-branch 2.3]
 └── [Main Branch 3]
      ├── [Sub-branch 3.1]
      ├── [Sub-branch 3.2]
      └── [Sub-branch 3.3]

CRITICAL FORMATTING RULES:
- Use ├── for branches that have siblings below
- Use └── for the last branch at each level
- Use │ (vertical bar) to connect parent to child branches
- Indent properly to show hierarchy
- Create 3-5 main branches
- Each main branch should have 2-4 sub-branches
- Use descriptive, concise names for each node
- Show clear relationships between concepts

Example structure:
Digital Logic
 ├── Bits (0 / 1)
 ├── Gates
 │    ├── AND
 │    ├── OR
 │    ├── NOT
 │    └── XOR
 └── Boolean Algebra
      ├── Expressions
      ├── Truth Tables
      └── Simplification

Return ONLY markdown text with the tree structure, no JSON or code blocks.`
        userPrompt = `Generate a hierarchical mind map in tree format for: ${eventTitle}. Use tree characters (├──, └──, │) to show the structure clearly.`
        break

      case 'quiz':
        systemPrompt = `You are a helpful study assistant. Generate a comprehensive quiz in MARKDOWN format for the study topic: "${eventTitle}".

${eventDescription ? `Event Description: ${eventDescription}` : ''}

${canvasContext ? `Canvas Context:\n${canvasContext}` : ''}

Generate a thoughtful quiz following this format:

# Quiz: [Topic Name]

1. [Question text - make it test understanding, not just memorization]
   
   **Answer:** [Clear, concise answer]
   
   **Explanation:** [Detailed explanation (2-3 sentences) explaining why this is the answer, what concepts it tests, and any important context]

2. [Another thoughtful question]
   
   **Answer:** [Answer]
   
   **Explanation:** [Detailed explanation...]

[Continue with 5-10 questions]

CRITICAL REQUIREMENTS:
- Generate 5-10 thoughtful questions that test understanding
- Mix question types: conceptual questions, application questions, analysis questions
- Questions should require thinking, not just recall
- Each question must have a clear answer
- Each question must have a detailed explanation (2-3 sentences) that:
  * Explains why the answer is correct
  * Explains what concept is being tested
  * Provides context or additional insight
- Format each question with number, question text, Answer, and Explanation
- Make questions progressively more challenging if possible

Return ONLY markdown text, no JSON or code blocks.`
        userPrompt = `Generate a comprehensive quiz with thoughtful questions, answers, and detailed explanations for: ${eventTitle}.`
        break

      case 'flashcard':
        systemPrompt = `You are a helpful study assistant. Generate flashcards in MARKDOWN format for the study topic: "${eventTitle}".

${eventDescription ? `Event Description: ${eventDescription}` : ''}

${canvasContext ? `Canvas Context:\n${canvasContext}` : ''}

Generate 10-20 flashcards following this EXACT format:

# Flashcards: [Topic Name]

Q: [Question or term]
A: [Answer or definition - concise but complete]

Q: [Next question or term]
A: [Answer or definition]

[Continue with 10-20 flashcards]

CRITICAL REQUIREMENTS:
- Use "Q:" for questions and "A:" for answers (exactly as shown)
- Generate 10-20 flashcards covering key concepts
- Cover: definitions, important facts, key concepts, relationships, applications
- Questions should be clear and specific
- Answers should be concise (1-2 sentences) but complete and informative
- Focus on the most important information students need to remember
- Mix different types: definitions, concepts, processes, applications

Example format:
Q: What does an AND gate do?
A: Outputs 1 only if both inputs are 1.

Q: What is Boolean Algebra?
A: A mathematical system for reasoning about binary values and logic gates.

Return ONLY markdown text, no JSON or code blocks.`
        userPrompt = `Generate 10-20 flashcards in Q: and A: format for: ${eventTitle}. Cover key concepts, definitions, and important facts.`
        break

      default:
        return NextResponse.json(
          { error: `Invalid contentType: ${contentType}` },
          { status: 400 }
        )
    }

    // Generate content as markdown
    console.log('[DEBUG] Event content generation:', {
      contentType,
      model: selectedModelId,
      eventTitle,
    })

    try {
      const result = await generateText({
        model: openrouter.chat(selectedModelId),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 8000,
      })

      console.log('[DEBUG] Event content generated successfully:', contentType)

      return NextResponse.json({
        success: true,
        content: result.text,
      })
    } catch (genError) {
      console.error('[DEBUG] generateObject error:', genError)
      // If structured output fails, the model might not support it
      // Return a more helpful error message
      const errorMessage = genError instanceof Error ? genError.message : 'Unknown error'
      if (errorMessage.includes('structured') || errorMessage.includes('schema') || errorMessage.includes('json')) {
        return NextResponse.json(
          {
            error: 'Model does not support structured output',
            details: `The selected model (${selectedModelId}) may not support JSON schema mode. Please try a different model.`,
            model: selectedModelId,
          },
          { status: 500 }
        )
      }
      throw genError
    }
  } catch (error) {
    console.error('Error generating event content:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
