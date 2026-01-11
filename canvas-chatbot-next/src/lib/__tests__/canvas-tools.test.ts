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
    async getPageContents(_courseId: number, pageUrls: string[]) {
      return Promise.resolve(
        pageUrls.map((pageUrl) => ({ title: `Page ${pageUrl}`, body: 'Content', url: pageUrl }))
      )
    }
    getFileContent(fileId: number) {
      return Promise.resolve({ id: fileId, filename: 'file.pdf', url: 'https://example.com/file.pdf', 'content-type': 'application/pdf' })
    }
    getAssignment(courseId: number, assignmentId: number, _opts?: any) {
      return Promise.resolve({
        id: assignmentId,
        name: 'HW1',
        points_possible: 100,
        course_id: courseId,
        description: null,
        due_at: null,
        html_url: '',
        submission: null,
        rubric: [
          { id: 'crit1', description: 'Quality', points: 50, ratings: [{ description: 'Excellent', points: 50 }, { description: 'Poor', points: 0 }] },
          { id: 'crit2', description: 'Completeness', points: 50, ratings: [{ description: 'Complete', points: 50 }, { description: 'Incomplete', points: 0 }] },
        ],
      })
    }
    getAssignmentSubmission(_courseId: number, _assignmentId: number, _opts?: any) {
      return Promise.resolve({
        id: 1,
        user_id: 99,
        grade: '90',
        score: 90,
        graded_at: new Date().toISOString(),
        workflow_state: 'graded',
        submitted_at: new Date().toISOString(),
        rubric_assessment: {
          crit1: { points: 40, comments: 'Nice work' },
          crit2: { points: 50 },
        },
        submission_comments: [{ author_id: 2, comment: 'Good job', created_at: new Date().toISOString() }],
      })
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

  test('get_page_contents returns pages', async () => {
    const res = await tools.get_page_contents.execute({ parameters: { courseId: 1, pageUrls: ['intro', 'about'] } })
    expect(Array.isArray(res)).toBe(true)
    expect(res.length).toBe(2)
    expect(res[0].title).toBe('Page intro')
    expect(res[1].title).toBe('Page about')
  })

  test('get_file returns file metadata', async () => {
    const res = await tools.get_file.execute({ parameters: { fileId: 42 } })
    expect(res.filename).toBe('file.pdf')
  })

  test('get_assignment_grade returns grade details', async () => {
    const res = await tools.get_assignment_grade.execute({ parameters: { courseId: 1, assignmentId: 10 } })
    expect(res.grade).toBe('90')
    expect(res.pointsPossible).toBe(100)
  })

  test('get_assignment_feedback_and_rubric returns rubric and comments', async () => {
    const res = await tools.get_assignment_feedback_and_rubric.execute({ parameters: { courseId: 1, assignmentId: 10 } })
    expect(Array.isArray(res.rubric)).toBe(true)
    expect(res.rubric.length).toBe(2)
    expect(res.rubric[0].assessed_points).toBe(40)
    expect(res.totals.points_possible).toBe(100)
    expect(res.totals.points_earned).toBe(90)
    expect(Array.isArray(res.submissionComments)).toBe(true)
  })
})
