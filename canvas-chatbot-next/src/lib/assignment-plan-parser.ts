/**
 * Utility functions to parse assignment plan markdown and extract structured data
 * Similar to note-content-parser.ts but for assignment plans
 */

export interface ParsedPlan {
  title: string
  overview?: string
  steps: Array<{
    id: string
    title: string
    order: number
    objectives?: string[]
    tasks?: Array<{ id: string, text: string, completed?: boolean }>
    resources?: Array<{ name: string, url?: string }>
    deliverables?: string[]
    successCriteria?: string[]
    estimatedTime?: string
    status?: 'pending' | 'in_progress' | 'completed'
    draft?: string
    feedback?: Array<{ id: string, timestamp: string, content: string }>
  }>
  timeline?: {
    startDate?: string
    dueDate?: string
    milestones?: Array<{ date: string, stepId: string, description: string }>
  }
  resources?: Array<{ name: string, url?: string, description?: string }>
  progress?: {
    currentStepId?: string
    overallProgress?: number
  }
}

export interface ParseError {
  message: string
  details?: string
}

export interface ParseResult {
  plan: ParsedPlan | null
  error: ParseError | null
}

/**
 * Parses markdown assignment plan and extracts structured data
 * Expects markdown following the structured format with:
 * - Title (# Assignment Master Plan: ...) or (## Title)
 * - Overview (## Overview)
 * - Steps (## Step X: Title)
 * - Timeline (## Timeline)
 * - Resources (## Resources)
 * - Progress Tracking (## Progress Tracking)
 */
export function parseAssignmentPlan(markdown: string): ParsedPlan | null {
  const result = parseAssignmentPlanWithError(markdown)
  return result.plan
}

/**
 * Parses markdown assignment plan and returns both plan and error information
 */
export function parseAssignmentPlanWithError(markdown: string): ParseResult {
  if (!markdown || typeof markdown !== 'string') {
    return {
      plan: null,
      error: {
        message: 'Invalid input: markdown content is required',
        details: 'The provided content is empty or not a string',
      },
    }
  }

  try {
    // Normalize content: trim, handle HTML entities, and normalize whitespace
    let normalizedMarkdown = markdown.trim()
    
    // Handle common HTML entities that might appear in markdown
    normalizedMarkdown = normalizedMarkdown
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    
    // Normalize line endings
    normalizedMarkdown = normalizedMarkdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    
    // Remove excessive blank lines (more than 2 consecutive)
    normalizedMarkdown = normalizedMarkdown.replace(/\n{3,}/g, '\n\n')
    
    if (!normalizedMarkdown) {
      return {
        plan: null,
        error: {
          message: 'Empty content: markdown is empty after normalization',
          details: 'The markdown content contains only whitespace',
        },
      }
    }

    const lines = normalizedMarkdown.split('\n')
    const plan: ParsedPlan = {
      title: '',
      steps: [],
    }

    let currentSection: string | null = null
    let currentStep: ParsedPlan['steps'][0] | null = null
    let currentSubsection: string | null = null
    let stepOrder = 0
    let foundTitle = false
    let foundSteps = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Skip empty lines
      if (!line) continue

      // Title - More flexible: accept # or ## at the start
      if (line.startsWith('# ') && !line.startsWith('##')) {
        plan.title = line.substring(2).trim()
        foundTitle = true
        continue
      }
      
      // Also accept ## Title if no # title was found (fallback)
      if (!foundTitle && line.startsWith('## ') && !line.startsWith('###')) {
        const potentialTitle = line.substring(3).trim()
        // Only use as title if it doesn't look like a section header
        if (!potentialTitle.toLowerCase().match(/^(overview|timeline|resources|progress tracking|step \d+)/i)) {
          plan.title = potentialTitle
          foundTitle = true
          continue
        }
      }

      // Main sections (## Section)
      if (line.startsWith('## ') && !line.startsWith('###')) {
        const sectionTitle = line.substring(3).trim()
        
        // Check if it's a step - More flexible patterns:
        // - "Step X: Title"
        // - "Step X - Title"
        // - "Step X Title" (without colon/dash)
        // - "X. Title" (numbered list style)
        let stepMatch = sectionTitle.match(/^Step\s+(\d+)[:\-]\s*(.+)$/i)
        if (!stepMatch) {
          stepMatch = sectionTitle.match(/^Step\s+(\d+)\s+(.+)$/i)
        }
        if (!stepMatch) {
          stepMatch = sectionTitle.match(/^(\d+)[\.\)]\s*(.+)$/)
        }
        
        if (stepMatch) {
          // Save previous step if exists
          if (currentStep) {
            plan.steps.push(currentStep)
          }
          
          stepOrder++
          foundSteps = true
          currentStep = {
            id: `step-${stepMatch[1]}`,
            title: stepMatch[2].trim(),
            order: parseInt(stepMatch[1], 10),
            status: 'pending',
          }
          currentSection = 'step'
          currentSubsection = null
          continue
        }

        // Other main sections
        if (sectionTitle.toLowerCase() === 'overview') {
          currentSection = 'overview'
          currentSubsection = null
          continue
        }
        if (sectionTitle.toLowerCase() === 'timeline') {
          currentSection = 'timeline'
          currentSubsection = null
          plan.timeline = {}
          continue
        }
        if (sectionTitle.toLowerCase() === 'resources') {
          currentSection = 'resources'
          currentSubsection = null
          plan.resources = []
          continue
        }
        if (sectionTitle.toLowerCase() === 'progress tracking') {
          currentSection = 'progress'
          currentSubsection = null
          plan.progress = {}
          continue
        }
        
        currentSection = sectionTitle.toLowerCase().replace(/\s+/g, '_')
        currentSubsection = null
        continue
      }

      // Subsections (### Subsection)
      if (line.startsWith('### ')) {
        const subsectionTitle = line.substring(4).trim().toLowerCase()
        currentSubsection = subsectionTitle
        
        // Handle timeline subsections
        if (currentSection === 'timeline') {
          if (subsectionTitle === 'start date') {
            // Next line should be the date
            if (i + 1 < lines.length) {
              plan.timeline!.startDate = lines[i + 1].trim()
              i++
            }
          } else if (subsectionTitle === 'due date') {
            if (i + 1 < lines.length) {
              plan.timeline!.dueDate = lines[i + 1].trim()
              i++
            }
          } else if (subsectionTitle === 'milestones') {
            plan.timeline!.milestones = []
          }
        }
        continue
      }

      // Horizontal rule (---) - section separator
      if (line.startsWith('---')) {
        // Save current step if exists
        if (currentStep) {
          plan.steps.push(currentStep)
          currentStep = null
        }
        currentSection = null
        currentSubsection = null
        continue
      }

      // Process content based on current section and subsection
      if (currentSection === 'overview') {
        if (!plan.overview) {
          plan.overview = line
        } else {
          plan.overview += '\n' + line
        }
        continue
      }

      if (currentSection === 'step' && currentStep) {
        // Process step subsections
        if (currentSubsection === 'objectives') {
          if (line.startsWith('- ')) {
            if (!currentStep.objectives) {
              currentStep.objectives = []
            }
            currentStep.objectives.push(line.substring(2).trim())
          }
        } else if (currentSubsection === 'tasks') {
          if (line.startsWith('- [')) {
            if (!currentStep.tasks) {
              currentStep.tasks = []
            }
            const taskMatch = line.match(/^-\s*\[([ x])\]\s*(.+)$/)
            if (taskMatch) {
              currentStep.tasks.push({
                id: `task-${currentStep.tasks.length + 1}`,
                text: taskMatch[2].trim(),
                completed: taskMatch[1].trim().toLowerCase() === 'x',
              })
            }
          }
        } else if (currentSubsection === 'resources') {
          if (line.startsWith('- ')) {
            if (!currentStep.resources) {
              currentStep.resources = []
            }
            // Parse markdown link: [text](url) or just text
            const linkMatch = line.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)/)
            if (linkMatch) {
              currentStep.resources.push({
                name: linkMatch[1].trim(),
                url: linkMatch[2].trim(),
              })
            } else {
              const text = line.substring(2).trim()
              if (text) {
                currentStep.resources.push({ name: text })
              }
            }
          }
        } else if (currentSubsection === 'deliverables') {
          if (line.startsWith('- ')) {
            if (!currentStep.deliverables) {
              currentStep.deliverables = []
            }
            currentStep.deliverables.push(line.substring(2).trim())
          }
        } else if (currentSubsection === 'success criteria') {
          if (line.startsWith('- ')) {
            if (!currentStep.successCriteria) {
              currentStep.successCriteria = []
            }
            currentStep.successCriteria.push(line.substring(2).trim())
          }
        } else if (currentSubsection === 'estimated time') {
          currentStep.estimatedTime = line.trim()
        }
      }

      if (currentSection === 'timeline' && currentSubsection === 'milestones') {
        if (line.startsWith('- ')) {
          const milestoneText = line.substring(2).trim()
          // Parse format: [Date]: Step X milestone - [Description]
          const milestoneMatch = milestoneText.match(/^(.+?):\s*(.+)$/)
          if (milestoneMatch) {
            plan.timeline!.milestones!.push({
              date: milestoneMatch[1].trim(),
              description: milestoneMatch[2].trim(),
              stepId: '', // Will be matched later if possible
            })
          }
        }
      }

      if (currentSection === 'resources') {
        if (line.startsWith('- ')) {
          const resourceText = line.substring(2).trim()
          // Parse format: [Resource Name](url) - [Description] or just [Resource Name](url)
          const linkMatch = resourceText.match(/^\[([^\]]+)\]\(([^)]+)\)(?:\s*-\s*(.+))?$/)
          if (linkMatch) {
            plan.resources!.push({
              name: linkMatch[1].trim(),
              url: linkMatch[2].trim(),
              description: linkMatch[3]?.trim(),
            })
          } else {
            // Just text, no link
            plan.resources!.push({ name: resourceText })
          }
        }
      }

      if (currentSection === 'progress') {
        if (line.startsWith('- Step ')) {
          // Parse format: Step X: [ ] Pending / [x] In Progress / [x] Completed
          const progressMatch = line.match(/^-\s*Step\s+(\d+):\s*(.+)$/i)
          if (progressMatch) {
            const stepNum = progressMatch[1]
            const statusText = progressMatch[2].toLowerCase()
            
            // Find the step and update status
            const step = plan.steps.find(s => s.order === parseInt(stepNum, 10))
            if (step) {
              if (statusText.includes('completed') || statusText.includes('[x] completed')) {
                step.status = 'completed'
              } else if (statusText.includes('in progress') || statusText.includes('[x] in progress')) {
                step.status = 'in_progress'
              } else {
                step.status = 'pending'
              }
            }

            // Check if this is the current step
            if (statusText.includes('in progress')) {
              plan.progress!.currentStepId = `step-${stepNum}`
            }
          }
        }
      }
    }

    // Save last step if exists
    if (currentStep) {
      plan.steps.push(currentStep)
    }

    // Calculate overall progress
    if (plan.steps.length > 0) {
      const completedSteps = plan.steps.filter(s => s.status === 'completed').length
      plan.progress = plan.progress || {}
      plan.progress.overallProgress = Math.round((completedSteps / plan.steps.length) * 100)
    }

    // Detect if this might be an assignment summary instead of a plan
    const titleLower = plan.title.toLowerCase()
    const isLikelySummary = 
      titleLower.includes('summary') ||
      titleLower.includes('overview') ||
      titleLower.includes('pareto') ||
      normalizedMarkdown.toLowerCase().includes('assignment overview') ||
      normalizedMarkdown.toLowerCase().includes('pareto summary')

    // Validate that we have at least a title and some steps
    const errors: string[] = []
    if (!plan.title) {
      errors.push('Missing title: Expected a title starting with "# " or "## " at the beginning of the document')
    }
    if (plan.steps.length === 0) {
      if (isLikelySummary) {
        errors.push(
          `This appears to be an assignment summary, not an assignment plan. ` +
          `Assignment summaries don't have steps. ` +
          `To create an interactive plan, the content needs steps in format "## Step X: Title".`
        )
      } else {
        errors.push(
          `No steps found: Expected at least one step in format "## Step X: Title". ` +
          `Found ${foundSteps ? 'step patterns but none were parsed' : 'no step patterns'} in the document.`
        )
      }
    }

    if (errors.length > 0) {
      // Provide helpful context
      const context: string[] = []
      if (plan.title) {
        context.push(`Found title: "${plan.title}"`)
      }
      if (plan.steps.length > 0) {
        context.push(`Found ${plan.steps.length} step(s)`)
      }
      if (plan.overview) {
        context.push('Found overview section')
      }
      
      let errorMessage = 'Parsing failed: Plan structure is incomplete'
      if (isLikelySummary && plan.steps.length === 0) {
        errorMessage = 'Content type mismatch: This appears to be an assignment summary, not an assignment plan'
      }
      
      return {
        plan: null,
        error: {
          message: errorMessage,
          details: errors.join('; ') + (context.length > 0 ? ` (${context.join(', ')})` : ''),
        },
      }
    }

    return {
      plan,
      error: null,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error parsing assignment plan:', error)
    return {
      plan: null,
      error: {
        message: 'Parsing error: Failed to parse markdown',
        details: errorMessage,
      },
    }
  }
}
