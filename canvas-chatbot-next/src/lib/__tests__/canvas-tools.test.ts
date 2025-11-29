import { createCanvasTools } from '../canvas-tools'

jest.mock('../canvas-api', () => {
  class MockCanvasAPIService {
    constructor(_token: string, _url: string) {}
    getCourses(options: { enrollmentState?: 'active' | 'completed' | 'all' } = { enrollmentState: 'active' }) {
      const state = options.enrollmentState ?? 'active'
      if (state === 'active') {
        return Promise.resolve([{ id: 1, name: 'CS101', course_code: 'CS101', enrollment_term_id: 1, start_at: null, end_at: null, workflow_state: 'available' }])
      }
      return Promise.resolve([])
    }
    getAssignments(courseId: number, options: { includeSubmission?: boolean } = { includeSubmission: true }) {
      return Promise.resolve([{ id: 10, name: 'HW1', points_possible: 100, course_id: courseId, description: null, due_at: null, html_url: '', submission: null }])
    }
    getModules(courseId: number, _options?: { includeContentDetails?: boolean, perPage?: number }) {
      return Promise.resolve([{ id: 7, name: 'Week 1', position: 1, items: [] }])
    }
    getCalendarEvents(_options: { daysAhead?: number } = { daysAhead: 14 }) {
      return Promise.resolve([{ id: 5, title: 'Exam', start_at: new Date().toISOString(), end_at: new Date().toISOString(), description: null, context_name: 'CS101', html_url: '' }])
    }
    getPageContent(_courseId: number, pageUrl: string) {
      return Promise.resolve({ title: 'Intro', body: 'Welcome', url: pageUrl })
    }
    getFileContent(fileId: number) {
      return Promise.resolve({ id: fileId, filename: 'file.pdf', url: 'https://example.com/file.pdf', 'content-type': 'application/pdf' })
    }
  }
  return { CanvasAPIService: MockCanvasAPIService }
})

describe('canvas tools', () => {
  const tools = createCanvasTools('token', 'https://canvas.example.com')

  test('list_courses returns active courses', async () => {
    const res = await tools.list_courses.execute({ parameters: { enrollmentState: 'active' } })
    expect(Array.isArray(res)).toBe(true)
    expect(res[0].name).toBe('CS101')
  })

  test('get_assignments returns course assignments', async () => {
    const res = await tools.get_assignments.execute({ parameters: { courseId: 1, includeSubmission: true } })
    expect(res[0].name).toBe('HW1')
  })

  test('get_modules returns modules', async () => {
    const res = await tools.get_modules.execute({ parameters: { courseId: 1 } })
    expect(res[0].name).toBe('Week 1')
  })

  test('get_calendar_events returns events', async () => {
    const res = await tools.get_calendar_events.execute({ parameters: { daysAhead: 7 } })
    expect(res[0].title).toBe('Exam')
  })

  test('get_page_content returns page', async () => {
    const res = await tools.get_page_content.execute({ parameters: { courseId: 1, pageUrl: 'intro' } })
    expect(res.title).toBe('Intro')
  })

  test('get_file returns file metadata', async () => {
    const res = await tools.get_file.execute({ parameters: { fileId: 42 } })
    expect(res.filename).toBe('file.pdf')
  })
})
