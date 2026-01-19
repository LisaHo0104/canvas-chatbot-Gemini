import { NoteOutput } from '@/components/note/note-ui'

interface ParsedSection {
  id: string
  heading: string
  content: string
  keyPoints?: string[]
  level: number
}

/**
 * Parse generic markdown into NoteOutput structure
 */
export function parseMarkdownToNoteOutput(
  markdown: string,
  title?: string,
  description?: string
): NoteOutput {
  const lines = markdown.split('\n')
  const sections: ParsedSection[] = []
  let currentSection: ParsedSection | null = null
  let currentContent: string[] = []
  let summary: string | undefined
  let keyTakeaways: string[] = []
  let successCriteria: string[] = []
  let practiceQuestions: Array<{ question: string; answer?: string }> = []
  let resources: Array<{ type: 'module' | 'assignment' | 'course' | 'page' | 'file' | 'url'; name: string; url?: string }> = []
  let metadata: { topics?: string[]; estimatedReadingTime?: number; sourcesUsed?: string[] } = {}

  let inKeyTakeaways = false
  let inSuccessCriteria = false
  let inPracticeQuestions = false
  let inResources = false
  let inSummary = false
  let currentQuestion: { question: string; answer?: string } | null = null

  // Extract title from first H1 if not provided
  let extractedTitle = title
  let startIndex = 0

  // Check first line for H1 title
  if (!extractedTitle && lines.length > 0) {
    const firstLine = lines[0].trim()
    if (firstLine.startsWith('# ')) {
      extractedTitle = firstLine.substring(2).trim()
      startIndex = 1
    }
  }

  // Process lines
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Check for special sections
    if (/^##\s+(?:Key\s+Takeaways?|Takeaways?)/i.test(trimmed)) {
      inKeyTakeaways = true
      inSuccessCriteria = false
      inPracticeQuestions = false
      inResources = false
      inSummary = false
      // Save current section if exists
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim()
        sections.push(currentSection)
        currentSection = null
        currentContent = []
      }
      continue
    }

    if (/^##\s+(?:Success\s+Criteria?|You\s+Should\s+Be\s+Able\s+To)/i.test(trimmed)) {
      inSuccessCriteria = true
      inKeyTakeaways = false
      inPracticeQuestions = false
      inResources = false
      inSummary = false
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim()
        sections.push(currentSection)
        currentSection = null
        currentContent = []
      }
      continue
    }

    if (/^##\s+(?:Practice\s+Questions?|Questions?)/i.test(trimmed)) {
      inPracticeQuestions = true
      inKeyTakeaways = false
      inSuccessCriteria = false
      inResources = false
      inSummary = false
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim()
        sections.push(currentSection)
        currentSection = null
        currentContent = []
      }
      continue
    }

    if (/^##\s+(?:Resources?|Links?|References?)/i.test(trimmed)) {
      inResources = true
      inKeyTakeaways = false
      inSuccessCriteria = false
      inPracticeQuestions = false
      inSummary = false
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim()
        sections.push(currentSection)
        currentSection = null
        currentContent = []
      }
      continue
    }

    if (/^##\s+(?:Summary|Overview)/i.test(trimmed)) {
      inSummary = true
      inKeyTakeaways = false
      inSuccessCriteria = false
      inPracticeQuestions = false
      inResources = false
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim()
        sections.push(currentSection)
        currentSection = null
        currentContent = []
      }
      continue
    }

    // Process headings
    if (trimmed.startsWith('#')) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim()
        sections.push(currentSection)
        currentContent = []
      }

      // Determine heading level
      let level = 1
      let headingText = trimmed
      if (trimmed.startsWith('### ')) {
        level = 3
        headingText = trimmed.substring(4)
      } else if (trimmed.startsWith('## ')) {
        level = 2
        headingText = trimmed.substring(3)
      } else if (trimmed.startsWith('# ')) {
        level = 1
        headingText = trimmed.substring(2)
      }

      // Create new section
      currentSection = {
        id: `section-${sections.length + 1}`,
        heading: headingText.trim(),
        content: '',
        level,
      }

      // Reset special section flags
      inKeyTakeaways = false
      inSuccessCriteria = false
      inPracticeQuestions = false
      inResources = false
      inSummary = false
      continue
    }

    // Process content based on current section type
    if (inKeyTakeaways) {
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
        keyTakeaways.push(trimmed.substring(2).trim())
      } else if (/^\d+\.\s/.test(trimmed)) {
        keyTakeaways.push(trimmed.replace(/^\d+\.\s/, '').trim())
      } else if (trimmed.length > 0) {
        keyTakeaways.push(trimmed)
      }
      continue
    }

    if (inSuccessCriteria) {
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
        successCriteria.push(trimmed.substring(2).trim())
      } else if (/^\d+\.\s/.test(trimmed)) {
        successCriteria.push(trimmed.replace(/^\d+\.\s/, '').trim())
      } else if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        successCriteria.push(trimmed)
      }
      continue
    }

    if (inPracticeQuestions) {
      // Check for question pattern (Q:, Question:, etc.)
      if (/^(?:Q:|Question:|Q\.|Question\.)\s*(.+)/i.test(trimmed)) {
        if (currentQuestion) {
          practiceQuestions.push(currentQuestion)
        }
        currentQuestion = {
          question: trimmed.replace(/^(?:Q:|Question:|Q\.|Question\.)\s*/i, '').trim(),
        }
      } else if (/^(?:A:|Answer:|A\.|Answer\.)\s*(.+)/i.test(trimmed) && currentQuestion) {
        currentQuestion.answer = trimmed.replace(/^(?:A:|Answer:|A\.|Answer\.)\s*/i, '').trim()
        practiceQuestions.push(currentQuestion)
        currentQuestion = null
      } else if (trimmed.startsWith('**') && trimmed.includes('?') && currentQuestion === null) {
        // Bold question
        currentQuestion = {
          question: trimmed.replace(/\*\*/g, '').trim(),
        }
      } else if (currentQuestion && !currentQuestion.answer && trimmed.length > 0) {
        // Answer continuation
        if (!currentQuestion.answer) {
          currentQuestion.answer = trimmed
        } else {
          currentQuestion.answer += '\n' + trimmed
        }
      } else if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        // Generic question/answer
        if (!currentQuestion) {
          currentQuestion = { question: trimmed }
        } else if (!currentQuestion.answer) {
          currentQuestion.answer = trimmed
        }
      }
      continue
    }

    if (inResources) {
      // Extract links: [text](url) or plain URLs
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/
      const urlRegex = /(https?:\/\/[^\s]+)/g

      if (linkRegex.test(trimmed)) {
        const match = trimmed.match(linkRegex)
        if (match) {
          resources.push({
            type: 'url',
            name: match[1],
            url: match[2],
          })
        }
      } else {
        const urlMatches = trimmed.match(urlRegex)
        if (urlMatches) {
          urlMatches.forEach((url) => {
            resources.push({
              type: 'url',
              name: url,
              url: url,
            })
          })
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const text = trimmed.substring(2).trim()
          resources.push({
            type: 'url',
            name: text,
          })
        }
      }
      continue
    }

    if (inSummary) {
      if (summary) {
        summary += '\n' + trimmed
      } else {
        summary = trimmed
      }
      continue
    }

    // Regular content for current section
    if (currentSection) {
      currentContent.push(line)
    } else if (!summary && trimmed.length > 0 && !trimmed.startsWith('#')) {
      // First paragraph might be summary
      if (!summary) {
        summary = trimmed
      } else {
        summary += '\n' + trimmed
      }
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim()
    sections.push(currentSection)
  }

  // Add final question if exists
  if (currentQuestion) {
    practiceQuestions.push(currentQuestion)
  }

  // Extract key points from sections (look for bullet lists)
  sections.forEach((section) => {
    const contentLines = section.content.split('\n')
    const keyPoints: string[] = []
    let inKeyPoints = false

    for (const line of contentLines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
        inKeyPoints = true
        keyPoints.push(trimmed.substring(2).trim())
      } else if (/^\d+\.\s/.test(trimmed)) {
        inKeyPoints = true
        keyPoints.push(trimmed.replace(/^\d+\.\s/, '').trim())
      } else if (inKeyPoints && trimmed.length === 0) {
        // Empty line might end key points
        break
      }
    }

    if (keyPoints.length > 0) {
      section.keyPoints = keyPoints
      // Remove key points from content
      const keyPointsPattern = keyPoints.map((kp) => kp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
      section.content = section.content
        .split('\n')
        .filter((line) => {
          const trimmed = line.trim()
          return !keyPoints.some((kp) => trimmed.includes(kp))
        })
        .join('\n')
        .trim()
    }
  })

  return {
    title: extractedTitle || 'Untitled Notes',
    description,
    summary,
    sections: sections.map((s) => ({
      id: s.id,
      heading: s.heading,
      content: s.content,
      keyPoints: s.keyPoints,
      level: s.level,
    })),
    keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : undefined,
    successCriteria: successCriteria.length > 0 ? successCriteria : undefined,
    practiceQuestions: practiceQuestions.length > 0 ? practiceQuestions : undefined,
    resources: resources.length > 0 ? resources : undefined,
    metadata,
  }
}
