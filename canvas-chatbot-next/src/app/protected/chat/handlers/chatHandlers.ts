import type { ChatSession, SelectedContext, AvailableContext } from '../types'

// Helper functions to get names from stored context data
const getCourseName = (courseId: number, availableContext: AvailableContext): string => {
  const course = availableContext.courses.find(c => c.id === courseId)
  return course?.name || `Course ${courseId}`
}

const getCourseCode = (courseId: number, availableContext: AvailableContext): string | undefined => {
  const course = availableContext.courses.find(c => c.id === courseId)
  return course?.code
}

const getAssignmentName = (assignmentId: number, availableContext: AvailableContext): string => {
  const assignment = availableContext.assignments.find(a => a.id === assignmentId)
  return assignment?.name || `Assignment ${assignmentId}`
}

const getModuleName = (moduleId: number, availableContext: AvailableContext): string => {
  const module = availableContext.modules.find(m => m.id === moduleId)
  return module?.name || `Module ${moduleId}`
}

export function createChatHandlers(
  user: any,
  currentSession: ChatSession | null,
  createNewSession: (user: any) => Promise<ChatSession | null>,
  sendChatMessage: any,
  selectedModel: string,
  webSearch: boolean,
  mode: string | null,
  canvasStatus: 'connected' | 'missing' | 'error',
  canvasToken: string,
  canvasUrl: string,
  selectedContext: SelectedContext,
  selectedSystemPromptIds: string[],
  availableContext: AvailableContext,
  setUIMessages: (messages: any) => void,
  uiMessages: any[]
) {

  const getSelectedContextItems = (): Array<{ id: number; type: 'course' | 'assignment' | 'module'; name: string; code?: string; course_id?: number }> => {
    const items: Array<{ id: number; type: 'course' | 'assignment' | 'module'; name: string; code?: string; course_id?: number }> = []

    // Add courses
    selectedContext.courses.forEach((courseId) => {
      items.push({
        id: courseId,
        type: 'course',
        name: getCourseName(courseId, availableContext),
        code: getCourseCode(courseId, availableContext),
      })
    })

    // Add assignments (with course_id if available)
    selectedContext.assignments.forEach((assignmentId) => {
      const assignment = availableContext.assignments.find(a => a.id === assignmentId)
      items.push({
        id: assignmentId,
        type: 'assignment',
        name: getAssignmentName(assignmentId, availableContext),
        course_id: assignment?.course_id,
      })
    })

    // Add modules (with course_id if available)
    selectedContext.modules.forEach((moduleId) => {
      const module = availableContext.modules.find(m => m.id === moduleId)
      items.push({
        id: moduleId,
        type: 'module',
        name: getModuleName(moduleId, availableContext),
        course_id: module?.course_id,
      })
    })

    return items
  }

  const onSubmitAI = async (message: any) => {
    if (!message.text) return
    if (!user) return
    let sessionForSend = currentSession
    if (!sessionForSend) {
      const created = await createNewSession(user)
      if (!created) return
      sessionForSend = created
    }
    // Get selected context items to include in message parts
    const contextItems = getSelectedContextItems()
    const contextParts = contextItems.map((item) => ({
      type: 'context',
      context: item,
    }))

    await sendChatMessage(
      { 
        role: 'user', 
        parts: [
          { type: 'text', text: message.text }, 
          ...(Array.isArray(message.files) ? message.files : []),
          ...contextParts,
        ] 
      } as any,
      {
        body: {
          model: selectedModel,
          webSearch,
          mode,
          canvas_token: canvasStatus === 'connected' ? canvasToken : undefined,
          canvas_url: canvasStatus === 'connected' ? canvasUrl : undefined,
          selected_context: selectedContext.courses.length > 0 || selectedContext.assignments.length > 0 || selectedContext.modules.length > 0 ? selectedContext : undefined,
          selected_system_prompt_ids: selectedSystemPromptIds.length > 0 ? selectedSystemPromptIds : undefined,
        },
        headers: { 'X-Session-ID': sessionForSend.id },
      },
    )
  }

  const handleRegenerate = async () => {
    if (!user) return
    
    // Find the last assistant message
    let lastAssistantIndex = -1
    for (let i = uiMessages.length - 1; i >= 0; i--) {
      if (uiMessages[i].role === 'assistant') {
        lastAssistantIndex = i
        break
      }
    }
    
    if (lastAssistantIndex === -1) return

    // Find the user message that immediately precedes the last assistant message
    let lastUserIndex = -1
    for (let i = lastAssistantIndex - 1; i >= 0; i--) {
      if (uiMessages[i].role === 'user') {
        lastUserIndex = i
        break
      }
    }
    
    if (lastUserIndex === -1) return

    const lastUserMessage = uiMessages[lastUserIndex]
    
    // Extract text and parts from the user message
    const textParts = lastUserMessage.parts.filter((p: any) => p.type === 'text')
    const fileParts = lastUserMessage.parts.filter((p: any) => p.type === 'file')
    
    // Combine all text parts
    const messageText = textParts.map((p: any) => String(p.text || '')).join('')
    if (!messageText.trim()) return

    // Remove the last assistant message and the user message that triggered it
    // We'll re-send the user message to get a new assistant response
    const newMessages = uiMessages.slice(0, lastUserIndex)
    setUIMessages(newMessages as any)

    // Ensure we have a session
    let sessionForSend = currentSession
    if (!sessionForSend) {
      const created = await createNewSession(user)
      if (!created) return
      sessionForSend = created
    }

    // Get current selected context items (in case they changed)
    const contextItems = getSelectedContextItems()
    const currentContextParts = contextItems.map((item) => ({
      type: 'context',
      context: item,
    }))

    // Re-send the message with the same options as onSubmitAI
    await sendChatMessage(
      { 
        role: 'user', 
        parts: [
          { type: 'text', text: messageText },
          ...fileParts,
          ...currentContextParts,
        ] 
      } as any,
      {
        body: {
          model: selectedModel,
          webSearch,
          mode,
          canvas_token: canvasStatus === 'connected' ? canvasToken : undefined,
          canvas_url: canvasStatus === 'connected' ? canvasUrl : undefined,
          selected_context: selectedContext.courses.length > 0 || selectedContext.assignments.length > 0 || selectedContext.modules.length > 0 ? selectedContext : undefined,
          selected_system_prompt_ids: selectedSystemPromptIds.length > 0 ? selectedSystemPromptIds : undefined,
        },
        headers: { 'X-Session-ID': sessionForSend.id },
      },
    )
  }

  return {
    onSubmitAI,
    handleRegenerate,
    getSelectedContextItems,
  }
}
