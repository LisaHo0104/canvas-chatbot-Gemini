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

export class CanvasContextService {
  private canvasService: CanvasAPIService

  constructor(apiKey: string, canvasURL: string) {
    this.canvasService = new CanvasAPIService(apiKey, canvasURL)
  }

  async buildContext(query: string, userId: string): Promise<string> {
    try {
      const queryLower = query.toLowerCase()
      let context = ''

      // Fetch all courses
      const [activeCourses, completedCourses] = await Promise.all([
        this.canvasService.getCourses({ enrollmentState: 'active' }),
        this.canvasService.getCourses({ enrollmentState: 'completed' }),
      ])

      const allCourses = [...activeCourses, ...completedCourses]

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
      context += `📊 Course: ${(await this.canvasService.getCourses()).find(c => c.id === courseId)?.name}\n`
      
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
      const numberMatch = query.match(/(?:week|module|wk|mod)\s*(\d+)/)
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
      }

      for (const module of targetModules.slice(0, 8)) {
        context += `  📂 ${module.name} (Module ID: ${module.id})\n`
        
        const items = module.items || []
        if (items.length === 0) {
          context += `    ℹ️ No items in this module\n\n`
          continue
        }

        context += `    📋 Found ${items.length} items in this module\n\n`
        
        for (const item of items.slice(0, 20)) {
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
      
      const courseName = (await this.canvasService.getCourses()).find(c => c.id === courseId)?.name
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
      const activeCourses = await this.canvasService.getCourses({ enrollmentState: 'active' })
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
}
