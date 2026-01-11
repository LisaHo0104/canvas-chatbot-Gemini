import { CanvasAPIService } from './canvas-api'

export interface CanvasContextData {
  courses: any[]
  assignments: any[]
  modules: any[]
  calendarEvents: any[]
  grades: any[]
  uploadedFile?: {
    filename: string
    content: string
  }
}

export interface CanvasContextAttachment {
  id: number
  type: 'course' | 'assignment' | 'module'
  name: string
  code?: string
}

export interface CanvasContextFormatOptions {
  includeInstructions?: boolean
  maxCourses?: number
  maxAssignmentsPerCourse?: number
  maxModulesPerCourse?: number
}

export interface FormattedCanvasContext {
  header: string
  attachmentsSection: string
  instructionsSection: string
  coursesSection: string
  footer: string
}

export class CanvasContextService {
  private canvasService: CanvasAPIService

  constructor(apiKey: string, canvasURL: string) {
    this.canvasService = new CanvasAPIService(apiKey, canvasURL)
  }

  async buildStaticEntityMap(limitPerCourse: number = 30) {
    console.log('[DEBUG] Prefetch: building static entity map')
    const allCourses = await this.canvasService.getCourses({
      enrollmentState: 'all',
      enrollmentType: 'student',
      perPage: 100,
    })
    
    // Filter to only active courses for entity map
    const courses = allCourses.filter(course => {
      if (course.end_at) {
        const endDate = new Date(course.end_at)
        const now = new Date()
        return endDate >= now
      }
      return course.workflow_state !== 'completed'
    })
    const results: Array<{
      id: number
      name: string
      code: string
      assignments: Array<{ id: number; name: string }>
      modules: Array<{ id: number; name: string }>
    }> = []

    const concurrency = 4
    let index = 0
    const runner = async () => {
      while (index < courses.length) {
        const i = index++
        const course = courses[i]
        try {
          const [assignments, modules] = await Promise.all([
            this.canvasService.getAssignments(course.id, {
              includeSubmission: false,
              perPage: 100,
              orderBy: 'position',
            }),
            this.canvasService.getModules(course.id, {
              includeItems: false,
              includeContentDetails: false,
              perPage: 100,
            }),
          ])
          results.push({
            id: course.id,
            name: course.name,
            code: course.course_code,
            assignments: assignments
              .slice(0, limitPerCourse)
              .map(a => ({ id: a.id, name: a.name })),
            modules: modules
              .slice(0, limitPerCourse)
              .map(m => ({ id: m.id, name: m.name })),
          })
        } catch (err) {
          console.error(`[DEBUG] Prefetch: failed for course ${course.id}`, err)
          results.push({
            id: course.id,
            name: course.name,
            code: course.course_code,
            assignments: [],
            modules: [],
          })
        }
      }
    }
    await Promise.all(new Array(Math.min(concurrency, courses.length)).fill(0).map(() => runner()))
    return { courses: results }
  }

  async buildContext(query: string, userId: string): Promise<string> {
    try {
      const queryLower = query.toLowerCase()
      let context = ''

      // Fetch all courses
      const allCourses = await this.canvasService.getCourses({ enrollmentState: 'all' })
      
      // Filter courses by enrollment state (active vs completed)
      // Note: Canvas API returns courses with enrollment info, but we filter client-side
      // Active courses are those not marked as completed
      const activeCourses = allCourses.filter(course => {
        // If course has end_at date and it's in the past, consider it completed
        if (course.end_at) {
          const endDate = new Date(course.end_at)
          const now = new Date()
          return endDate >= now
        }
        // If workflow_state is 'completed', it's completed
        if (course.workflow_state === 'completed') {
          return false
        }
        // Otherwise, consider it active
        return true
      })
      
      const completedCourses = allCourses.filter(course => {
        if (course.end_at) {
          const endDate = new Date(course.end_at)
          const now = new Date()
          return endDate < now
        }
        return course.workflow_state === 'completed'
      })

      // Check for uploaded file
      // This will be handled by the API route and passed in the context

      // Always show course lists
      context += '📚 YOUR ACTIVE COURSES:\n'
      for (const course of activeCourses.slice(0, 15)) {
        context += `- ${course.name} (ID: ${course.id}, Code: ${course.course_code})\n`
      }
      context += '\n'

      if (completedCourses.length > 0) {
        context += '📜 YOUR PAST COURSES:\n'
        for (const course of completedCourses.slice(0, 10)) {
          context += `- ${course.name} (Code: ${course.course_code})\n`
        }
        context += '\n'
      }

      // Find target course if specific course is mentioned
      const targetCourse = this.findTargetCourse(queryLower, allCourses)

      if (targetCourse) {
        context += `🎯 DETECTED COURSE FOR THIS QUERY: ${targetCourse.name} (Code: ${targetCourse.course_code})\n`
        context += `   This query is specifically about: ${targetCourse.name}\n\n`
      } else {
        // Check if query needs a specific course
        const needsSpecificCourse = [
          'module', 'week', 'assignment', 'grade', 'score', 'material',
          'content', 'lecture', 'pdf', 'video', 'calculate', 'need'
        ].some(word => queryLower.includes(word))

        if (needsSpecificCourse) {
          context += `⚠️ NO SPECIFIC COURSE DETECTED in query: '${query}'\n`
          context += `   Please clarify which course you're asking about.\n\n`
        } else {
          context += `ℹ️ GENERAL QUERY - No specific course needed\n\n`
        }
      }

      // Handle grade calculations
      if (targetCourse && this.isGradeCalculationQuery(queryLower)) {
        context += await this.buildGradeContext(targetCourse.id, queryLower)
      }

      // Handle schedule and calendar
      if (this.isScheduleQuery(queryLower)) {
        context += await this.buildScheduleContext()
      }

      // Handle modules and content
      if (targetCourse && this.isContentQuery(queryLower)) {
        context += await this.buildContentContext(targetCourse.id, queryLower)
      }

      // Handle grades and submissions
      if (targetCourse && this.isGradesQuery(queryLower)) {
        context += await this.buildGradesContext(targetCourse.id)
      }

      return context
    } catch (error) {
      console.error('Error building Canvas context:', error)
      return `Error fetching Canvas data: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private findTargetCourse(query: string, courses: any[]): any {
    // Course code matching (e.g., CS101, COMP1000)
    const courseCodeMatch = query.match(/\b[A-Z]{2,4}\d{3,4}\b/)
    if (courseCodeMatch) {
      const courseCode = courseCodeMatch[0]
      for (const course of courses) {
        if (course.course_code.toUpperCase().includes(courseCode)) {
          return course
        }
      }
    }

    // Stop words for better matching
    const stopWords = new Set([
      'the', 'and', 'of', 'in', 'to', 'a', 'an', 'for', 'with', 'on', 'at',
      '2024', '2025', '2026', 'semester', 'term', 'quarter', 'spring', 'fall', 'summer', 'winter',
      'what', 'is', 'my', 'give', 'me', 'show', 'tell', 'about', 'from',
      'summarize', 'summary', 'explain', 'describe', 'week', 'module', 'lecture'
    ])

    const queryWords = query.split(' ').filter(word => 
      !stopWords.has(word) && word.length > 2
    )

    let bestMatch = null
    let bestScore = 0

    for (const course of courses) {
      const courseName = course.name.toLowerCase()
      const courseCode = course.course_code.toLowerCase()
      
      let score = 0

      // Phrase matching
      for (let i = 0; i < queryWords.length; i++) {
        for (let j = i + 1; j <= queryWords.length; j++) {
          const phrase = queryWords.slice(i, j).join(' ')
          if (courseName.includes(phrase)) {
            score += (j - i) * 3
          }
        }
      }

      // Word matching
      for (const word of queryWords) {
        if (courseName.includes(word)) {
          score += 1
        } else if (courseCode.includes(word)) {
          score += 2
        }
      }

      // Common abbreviations
      const commonAbbreviations: Record<string, string[]> = {
        'oop': ['object oriented programming', 'object-oriented programming'],
        'dsa': ['data structures', 'algorithms', 'data structures and algorithms'],
        'ml': ['machine learning'],
        'ai': ['artificial intelligence'],
        'db': ['database'],
        'os': ['operating system'],
        'cn': ['computer network'],
        'se': ['software engineering'],
        'calc': ['calculus'],
        'bio': ['biology'],
        'chem': ['chemistry'],
        'phys': ['physics'],
        'stats': ['statistics'],
        'econ': ['economics'],
        'psych': ['psychology'],
        'cs': ['computer science'],
        'it': ['information technology']
      }

      for (const word of queryWords) {
        if (commonAbbreviations[word]) {
          for (const term of commonAbbreviations[word]) {
            if (courseName.includes(term)) {
              score += 5
              break
            }
          }
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = course
      }
    }

    return bestScore >= 2 ? bestMatch : null
  }

  private isGradeCalculationQuery(query: string): boolean {
    return [
      'calculate', 'need', 'hd', 'high distinction', 'required grade', 'what grade'
    ].some(word => query.includes(word))
  }

  private isScheduleQuery(query: string): boolean {
    return [
      'schedule', 'calendar', 'upcoming', 'due', 'deadline', 'when', 'next'
    ].some(word => query.includes(word))
  }

  private isContentQuery(query: string): boolean {
    return [
      'module', 'week', 'material', 'content', 'lecture', 'learn',
      'topic', 'summarize', 'summary', 'pdf', 'file', 'video'
    ].some(word => query.includes(word))
  }

  private isGradesQuery(query: string): boolean {
    return [
      'grade', 'score', 'mark', 'submission', 'submitted', 'progress'
    ].some(word => query.includes(word))
  }

  private async buildGradeContext(courseId: number, query: string): Promise<string> {
    try {
      const assignments = await this.canvasService.getAssignments(courseId, { includeSubmission: true })
      
      // Calculate grades
      const gradeInfo = this.calculateRequiredGrade(assignments, query)
      
      let context = '🎓 GRADE CALCULATION:\n\n'
      context += `📊 Course: ${(await this.canvasService.getCourses({ enrollmentState: 'all' })).find(c => c.id === courseId)?.name}\n`
      
      if (gradeInfo) {
        context += `🎯 Target Grade: ${gradeInfo.targetGrade}%\n\n`
        context += `📈 CURRENT STATUS:\n`
        context += `   Points Earned: ${gradeInfo.currentEarned}/${gradeInfo.currentPossible}\n`
        context += `   Current Grade: ${gradeInfo.currentPercentage}%\n\n`
        
        if (gradeInfo.remainingAssignments.length > 0) {
          context += `📝 REMAINING ASSIGNMENTS:\n`
          for (const assignment of gradeInfo.remainingAssignments) {
            context += `   - ${assignment.name}: ${assignment.points} points\n`
          }
          context += `   Total Remaining Points: ${gradeInfo.remainingPoints}\n\n`
          
          context += `🎯 WHAT YOU NEED:\n`
          if (gradeInfo.achievable) {
            context += `   ✅ To achieve ${gradeInfo.targetGrade}%, you need:\n`
            context += `   📊 Average of ${gradeInfo.requiredPercentage}% on remaining assignments\n`
            context += `   💯 That's ${gradeInfo.pointsNeeded} more points out of ${gradeInfo.remainingPoints} available\n\n`
            
            if (gradeInfo.requiredPercentage > 90) {
              context += `   ⚠️ Note: You'll need to score very high (${gradeInfo.requiredPercentage}%) on remaining work!\n`
            } else if (gradeInfo.requiredPercentage < 50) {
              context += `   🎉 Great news! You only need ${gradeInfo.requiredPercentage}% on remaining work!\n`
            }
          } else {
            context += `   ❌ Unfortunately, achieving ${gradeInfo.targetGrade}% is no longer possible\n`
            context += `   📊 Maximum achievable grade: ${gradeInfo.currentPercentage + gradeInfo.remainingPoints}%\n`
          }
        } else {
          context += gradeInfo.message || 'No remaining assignments'
        }
      }
      
      context += '\n'
      return context
    } catch (error) {
      return `⚠️ Could not fetch grade data for this course.\n\n`
    }
  }

  private async buildScheduleContext(): Promise<string> {
    try {
      const [calendarEvents, upcomingAssignments] = await Promise.all([
        this.canvasService.getCalendarEvents(14),
        this.getUpcomingAssignments(14),
      ])

      let context = '📅 YOUR UPCOMING SCHEDULE (Next 2 Weeks):\n\n'
      
      const allEvents = [
        ...calendarEvents.map(event => ({
          type: 'event',
          title: event.title,
          date: event.start_at,
          course: event.context_name,
          description: event.description,
          url: event.html_url,
        })),
        ...upcomingAssignments.map(assignment => ({
          type: 'assignment',
          title: assignment.name,
          date: assignment.due_at,
          course: assignment.course_name,
          points: assignment.points_possible,
          url: assignment.html_url,
          status: assignment.submission?.workflow_state || 'unsubmitted',
        })),
      ]

      allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      if (allEvents.length === 0) {
        context += '  ✅ No upcoming deadlines or events in the next 2 weeks.\n'
      } else {
        let currentDate = ''
        for (const event of allEvents.slice(0, 25)) {
          const eventDate = new Date(event.date)
          const dateStr = eventDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })
          const timeStr = eventDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          })

          if (dateStr !== currentDate) {
            context += `\n📆 ${dateStr}\n`
            currentDate = dateStr
          }

          if (event.type === 'assignment') {
            const assignmentEvent = event as any
            const statusEmoji = assignmentEvent.status === 'unsubmitted' ? '✖' : '⏳'
            context += `  ${statusEmoji} ${event.title} - ${event.course}\n`
            context += `     ⏰ Due: ${timeStr}\n`
            context += `     💯 Points: ${assignmentEvent.points}\n`
            if (event.url) {
              context += `     🔗 Link: ${event.url}\n`
            }
          } else {
            context += `  📅 ${event.title} - ${event.course}\n`
            context += `     ⏰ Time: ${timeStr}\n`
            if (event.url) {
              context += `     🔗 Link: ${event.url}\n`
            }
          }
          context += '\n'
        }
      }

      return context
    } catch (error) {
      return `⚠️ Error fetching schedule: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`
    }
  }

  private async buildContentContext(courseId: number, query: string): Promise<string> {
    try {
      const modules = await this.canvasService.getModules(courseId)
      let context = '📚 DETAILED COURSE CONTENT:\n\n'
      
      const courseName = (await this.canvasService.getCourses({ enrollmentState: 'all' }))
        .find(c => c.id === courseId)?.name
      context += `${'='.repeat(60)}\n`
      const courseInfo = (await this.canvasService.getCourses({ enrollmentState: 'all' }))
        .find(c => c.id === courseId)
      context += `📖 COURSE: ${courseName} (Code: ${courseInfo?.course_code})\n`
      context += `${'='.repeat(60)}\n\n`

      // Filter modules if specific week/module is mentioned
      let targetModules = modules
      const numberMatch = query.match(/(?:week|module|unit|lesson|wk|mod|w)\s*(\d+)/)
      const spelledMatch = query.match(/\bweek\s*(one|two|three|four|five|six|seven|eight|nine|ten|xi|x|v|iv|iii|ii|i)\b/i)
      if (numberMatch) {
        const number = numberMatch[1]
        targetModules = modules.filter(module => {
          const moduleName = module.name.toLowerCase()
          return [
            `week ${number}`, `week${number}`, `week-${number}`,
            `wk ${number}`, `wk${number}`,
            `module ${number}`, `mod ${number}`,
            `unit ${number}`, `lesson ${number}`, `chapter ${number}`,
          ].some(pattern => moduleName.includes(pattern))
        })

        if (targetModules.length === 0) {
          context += `⚠️ ${numberMatch[0].toUpperCase()} not found. Available modules:\n`
          for (const mod of modules.slice(0, 15)) {
            context += `     - ${mod.name}\n`
          }
          context += '\n'
          targetModules = modules.slice(0, 5)
        } else {
          context += `  🔍 Showing content for ${numberMatch[0].toUpperCase()}\n\n`
        }
      } else if (spelledMatch) {
        const map: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, i: 1, ii: 2, iii: 3, iv: 4, v: 5, x: 10, xi: 11 }
        const spelled = spelledMatch[1].toLowerCase()
        const number = map[spelled]
        if (number) {
          targetModules = modules.filter(module => {
            const nm = module.name.toLowerCase()
            return nm.includes(`week ${number}`) || nm.includes(`module ${number}`) || nm.includes(`wk ${number}`) || nm.includes(`unit ${number}`)
          })
          if (targetModules.length > 0) {
            context += `  🔍 Showing content for WEEK ${number}\n\n`
          }
        }
      }

      for (const module of targetModules.slice(0, 8)) {
        context += `  📂 ${module.name} (Module ID: ${module.id})\n`
        
        const items = module.items || []
        if (items.length === 0) {
          context += `    ℹ️ No items in this module\n\n`
          continue
        }

        context += `    📋 Found ${items.length} items in this module\n\n`
        for (const item of items) {
          context += `    ${'─'.repeat(50)}\n`
          context += `    📌 ${item.title} (${item.type})\n`
          
          // Handle different item types
          if (item.type === 'Page' && item.url) {
            try {
              const pageContent = await this.canvasService.getPageContent(courseId, item.url)
              if (pageContent && pageContent.body) {
                context += `\n    📄 PAGE CONTENT:\n`
                context += `    ${'-'.repeat(50)}\n`
                context += `${this.cleanText(pageContent.body)}\n`
                context += `    ${'-'.repeat(50)}\n\n`
              }
            } catch (error) {
              context += `    ⚠️ Could not fetch page content\n`
            }
          } else if (item.type === 'File' && item.content_id) {
            try {
              const fileInfo = await this.canvasService.getFileContent(item.content_id)
              context += `    📎 File: ${fileInfo.filename}\n`
              context += `    🔗 Download: ${item.html_url}\n`
              const fileText = await this.canvasService.getFileText(item.content_id)
              if (fileText) {
                context += `\n    📄 PDF CONTENT:\n`
                context += `    ${'-'.repeat(50)}\n`
                context += `${this.cleanText(fileText)}\n`
                context += `    ${'-'.repeat(50)}\n`
              }
            } catch (error) {
              context += `    ⚠️ Could not fetch file information\n`
            }
          } else if (item.type === 'Assignment' && item.content_id) {
            try {
              const assignments = await this.canvasService.getAssignments(courseId, { includeSubmission: true })
              const assignment = assignments.find(a => a.id === item.content_id)
              if (assignment) {
                context += `    📝 Assignment Details:\n`
                context += `       Due: ${assignment.due_at || 'No due date'}\n`
                context += `       Points: ${assignment.points_possible}\n`
                if (assignment.description) {
                  context += `    📋 ASSIGNMENT DESCRIPTION:\n`
                  context += `    ${'-'.repeat(50)}\n`
                  context += `${this.cleanText(assignment.description)}\n`
                  context += `    ${'-'.repeat(50)}\n`
                }
              }
            } catch (error) {
              context += `    ⚠️ Could not fetch assignment details\n`
            }
          } else if (item.type === 'ExternalUrl' && item.external_url) {
            context += `    🌐 External Link:\n`
            context += `       🔗 ${item.external_url}\n`
          } else if (item.type === 'ExternalTool' && item.html_url) {
            context += `    🛠️ External Tool:\n`
            context += `       🔗 ${item.html_url}\n`
          }
          
          if (item.html_url) {
            context += `    🔗 URL: ${item.html_url}\n`
          }
          context += '\n'
        }
      }

      return context
    } catch (error) {
      return `⚠️ Error fetching content: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`
    }
  }

  private async buildGradesContext(courseId: number): Promise<string> {
    try {
      const assignments = await this.canvasService.getAssignments(courseId, { includeSubmission: true })
      let context = '📊 YOUR GRADES & SUBMISSIONS:\n\n'
      
      const courseName = (await this.canvasService.getCourses({ enrollmentState: 'all' })).find(c => c.id === courseId)?.name
      context += `${courseName}:\n`
      
      for (const assignment of assignments.slice(0, 10)) {
        const name = assignment.name || 'Unknown'
        const points = assignment.points_possible || 'N/A'
        const submission = assignment.submission
        
        if (submission) {
          const score = submission.score || 'Not graded'
          const status = submission.workflow_state || 'not submitted'
          
          context += `  📝 ${name}\n`
          context += `     Score: ${score}/${points} | Status: ${status}\n`
        } else {
          context += `  📝 ${name} (Not submitted, ${points} points)\n`
        }
      }
      
      context += '\n'
      return context
    } catch (error) {
      return `⚠️ Error fetching grades: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`
    }
  }

  private async getUpcomingAssignments(daysAhead: number = 14): Promise<any[]> {
    try {
      const allCourses = await this.canvasService.getCourses({ enrollmentState: 'all' })
      // Filter to only active courses for upcoming assignments
      const activeCourses = allCourses.filter(course => {
        if (course.end_at) {
          const endDate = new Date(course.end_at)
          const now = new Date()
          return endDate >= now
        }
        return course.workflow_state !== 'completed'
      })
      const allAssignments = []
      const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)

      for (const course of activeCourses) {
        try {
          const assignments = await this.canvasService.getAssignments(course.id, {
            includeSubmission: true,
            bucket: 'upcoming',
            orderBy: 'due_at',
            perPage: 100,
          })
          
          for (const assignment of assignments) {
            const dueAt = assignment.due_at
            const submission = assignment.submission
            
            if (!dueAt) continue
            
            const workflowState = submission?.workflow_state || 'unsubmitted'
            const score = submission?.score
            const graded = submission?.graded_at
            
            const isPending = (
              workflowState === 'unsubmitted' ||
              workflowState === 'pending_review' ||
              (workflowState === 'submitted' && !graded && score === null)
            )
            
            if (isPending) {
              const dueDate = new Date(dueAt)
              if (dueDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && dueDate <= cutoffDate) {
                allAssignments.push({
                  ...assignment,
                  course_name: course.name,
                  course_code: course.course_code,
                  submission_status: workflowState,
                })
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching assignments for course ${course.id}:`, error)
          continue
        }
      }

      allAssignments.sort((a, b) => {
        const dateA = a.due_at ? new Date(a.due_at).getTime() : 0
        const dateB = b.due_at ? new Date(b.due_at).getTime() : 0
        return dateA - dateB
      })
      return allAssignments
    } catch (error) {
      console.error('Error fetching upcoming assignments:', error)
      return []
    }
  }

  private calculateRequiredGrade(assignments: any[], query: string): any {
    let totalEarned = 0
    let totalPossible = 0
    const remainingAssignments = []

    for (const assignment of assignments) {
      const pointsPossible = assignment.points_possible || 0
      const submission = assignment.submission || {}
      const score = submission.score

      if (score !== null && score !== undefined) {
        // Assignment is graded
        totalEarned += score
        totalPossible += pointsPossible
      } else if (pointsPossible > 0) {
        // Assignment not yet graded
        remainingAssignments.push({
          name: assignment.name,
          points: pointsPossible,
        })
        totalPossible += pointsPossible
      }
    }

    if (totalPossible === 0) {
      return {
        currentPercentage: 0,
        targetGrade: 80,
        achievable: false,
        message: 'No graded assignments found',
      }
    }

    // Detect target grade from query
    let targetGrade = 80 // Default to HD
    if (query.includes('distinction') && !query.includes('high')) {
      targetGrade = 70
    } else if (query.includes('credit')) {
      targetGrade = 60
    } else if (query.includes('pass')) {
      targetGrade = 50
    }

    // Check for percentage in query
    const percentageMatch = query.match(/(\d+)%/)
    if (percentageMatch) {
      targetGrade = parseInt(percentageMatch[1])
    }

    // Calculate points needed for target
    const targetPoints = (targetGrade / 100) * totalPossible
    const pointsNeeded = targetPoints - totalEarned

    // Calculate remaining points available
    const remainingPoints = remainingAssignments.reduce((sum, a) => sum + a.points, 0)

    if (remainingPoints === 0) {
      const currentPercentage = (totalEarned / totalPossible) * 100
      return {
        currentPercentage: Math.round(currentPercentage * 100) / 100,
        targetGrade,
        achievable: currentPercentage >= targetGrade,
        message: `All assignments graded. Current grade: ${Math.round(currentPercentage * 100) / 100}%`,
      }
    }

    // Calculate required percentage on remaining assignments
    const requiredPercentage = (pointsNeeded / remainingPoints) * 100

    return {
      currentEarned: totalEarned,
      currentPossible: totalPossible,
      currentPercentage: Math.round((totalEarned / totalPossible) * 100 * 100) / 100,
      targetGrade,
      pointsNeeded: Math.round(pointsNeeded * 100) / 100,
      remainingPoints,
      requiredPercentage: Math.round(requiredPercentage * 100) / 100,
      achievable: requiredPercentage <= 100,
      remainingAssignments,
    }
  }

  private cleanText(html: string): string {
    // Remove HTML tags and clean up text
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 20000) // Limit to 20k characters
  }

  /**
   * Formats Canvas context for attached courses using template-based approach
   * Static method that doesn't require Canvas API service instance
   */
  static formatAttachedContext(
    ctx: { courses?: any[] } | null,
    attachments: CanvasContextAttachment[] = [],
    options: CanvasContextFormatOptions = {}
  ): string {
    try {
      if (!ctx || !Array.isArray(ctx.courses) || ctx.courses.length === 0) {
        return ''
      }

      const {
        includeInstructions = true,
        maxCourses = 20,
        maxAssignmentsPerCourse = 30,
        maxModulesPerCourse = 30,
      } = options

      const header = CanvasContextService.buildContextHeader(ctx.courses.length)
      const attachmentsSection = CanvasContextService.buildAttachmentsList(attachments)
      const instructionsSection = includeInstructions
        ? CanvasContextService.buildContextInstructions()
        : ''
      const coursesSection = CanvasContextService.buildCoursesSection(
        ctx.courses,
        maxCourses,
        maxAssignmentsPerCourse,
        maxModulesPerCourse
      )
      const footer = CanvasContextService.buildContextFooter()

      return CanvasContextService.formatContextSections({
        header,
        attachmentsSection,
        instructionsSection,
        coursesSection,
        footer,
      })
    } catch (error) {
      console.error('Error formatting Canvas context:', error)
      return ''
    }
  }

  /**
   * Formats context sections into final string
   */
  private static formatContextSections(sections: FormattedCanvasContext): string {
    const parts = [
      sections.header,
      sections.attachmentsSection,
      sections.instructionsSection,
      sections.coursesSection,
      sections.footer,
    ].filter(Boolean)

    return parts.join('\n')
  }

  /**
   * Builds the context header section
   */
  private static buildContextHeader(courseCount: number): string {
    return `═══════════════════════════════════════════════════════════
📚 CANVAS CONTEXT - ATTACHED COURSES
═══════════════════════════════════════════════════════════

The user has attached ${courseCount} course(s) to this conversation.`
  }

  /**
   * Builds the attachments list section
   */
  private static buildAttachmentsList(attachments: CanvasContextAttachment[]): string {
    if (attachments.length === 0) {
      return ''
    }

    const courses = attachments.filter((a) => a.type === 'course')
    const assignments = attachments.filter((a) => a.type === 'assignment')
    const modules = attachments.filter((a) => a.type === 'module')

    const parts: string[] = ['', '🎯 SPECIFIC ITEMS ATTACHED:']

    if (courses.length > 0) {
      const courseList = courses
        .map((c) => `${c.name}${c.code ? ` (${c.code})` : ''}`)
        .join(', ')
      parts.push(`   📚 Courses: ${courseList}`)
    }

    if (assignments.length > 0) {
      const assignmentList = assignments.map((a) => a.name).join(', ')
      parts.push(`   📝 Assignments: ${assignmentList}`)
    }

    if (modules.length > 0) {
      const moduleList = modules.map((m) => m.name).join(', ')
      parts.push(`   📦 Modules: ${moduleList}`)
    }

    return parts.join('\n')
  }

  /**
   * Builds the context instructions section
   */
  private static buildContextInstructions(): string {
    return `
⚠️ CRITICAL INSTRUCTIONS:
   1. These courses are ATTACHED as context - the user wants you to use them!
   2. You MUST use Canvas tools to fetch detailed content:
      - get_modules(course_id) - to get module structure and items
      - get_assignments(course_id) - to get assignment details and descriptions
      - get_page_content(course_id, page_url) - to get page/lecture content
      - get_file(course_id, file_id) - to get file content (PDFs, etc.)
   3. When the user asks about these courses, IMMEDIATELY fetch the relevant content
   4. Do NOT just reference course names - fetch and use the actual content!

📋 ATTACHED COURSES:`
  }

  /**
   * Builds the courses section with all course details
   */
  private static buildCoursesSection(
    courses: any[],
    maxCourses: number,
    maxAssignments: number,
    maxModules: number
  ): string {
    const courseSections = courses
      .slice(0, maxCourses)
      .map((course) => CanvasContextService.buildCourseSection(course, maxAssignments, maxModules))

    return courseSections.join('\n')
  }

  /**
   * Builds a single course section
   */
  private static buildCourseSection(
    course: any,
    maxAssignments: number,
    maxModules: number
  ): string {
    const courseName = course.name || 'Unknown Course'
    const courseCode = course.code || course.course_code || 'No code'
    const courseId = course.id

    const assignments = Array.isArray(course.assignments)
      ? course.assignments.slice(0, maxAssignments)
      : []
    const modules = Array.isArray(course.modules)
      ? course.modules.slice(0, maxModules)
      : []

    const parts: string[] = [
      '',
      `🎓 ${courseName} (${courseCode})`,
      `   Course ID: ${courseId}`,
    ]

    if (assignments.length > 0) {
      parts.push(`   📝 Assignments (${assignments.length}):`)
      assignments.forEach((a: any) => {
        parts.push(`      - ${a.name} (ID: ${a.id})`)
      })
    } else {
      parts.push(`   📝 Assignments: none`)
    }

    if (modules.length > 0) {
      parts.push(`   📦 Modules (${modules.length}):`)
      modules.forEach((m: any) => {
        parts.push(`      - ${m.name} (ID: ${m.id})`)
      })
    } else {
      parts.push(`   📦 Modules: none`)
    }

    parts.push('')
    parts.push('   💡 To get detailed content for this course:')
    parts.push(`      - Use get_modules(course_id: ${courseId}) to fetch module details`)
    parts.push(`      - Use get_assignments(course_id: ${courseId}) to fetch assignment details`)
    parts.push('      - Use get_page_content(course_id, page_url) for page content')
    parts.push('      - Use get_file(course_id, file_id) for file content')
    parts.push('')

    return parts.join('\n')
  }

  /**
   * Builds the context footer
   */
  private static buildContextFooter(): string {
    return '═══════════════════════════════════════════════════════════'
  }
}
