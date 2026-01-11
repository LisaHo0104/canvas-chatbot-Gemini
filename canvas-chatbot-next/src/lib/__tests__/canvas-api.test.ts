import { CanvasAPIService } from '../canvas-api'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('CanvasAPIService getPageContent slug handling', () => {
  it('extracts slug from API URL', async () => {
    const svc = new CanvasAPIService('tok', 'https://example.com/api/v1')
    mockedAxios.get.mockResolvedValueOnce({ data: { title: 'Page', body: '<p>hi</p>' } })
    const data = await svc.getPageContent(123, 'https://example.com/api/v1/courses/123/pages/week-2')
    expect(data.body).toContain('hi')
  })
})

describe('CanvasAPIService getFileText PDF', () => {
  it('returns text for pdf content', async () => {
    const svc = new CanvasAPIService('tok', 'https://example.com/api/v1')
    mockedAxios.get
      .mockResolvedValueOnce({ data: { id: 9, filename: 'a.pdf', url: 'https://f', 'content-type': 'application/pdf' } })
      .mockResolvedValueOnce({ data: new Uint8Array([1,2,3]) })
    const text = await svc.getFileText(9)
    expect(typeof text).toBe('string')
  })
})

describe('CanvasAPIService assignments and submissions', () => {
  const svc = new CanvasAPIService('tok', 'https://example.com')

  it('getAssignment requests single assignment by id with optional rubric include', async () => {
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({ data: { id: 456, points_possible: 100, rubric: [] } } as any)
    const data = await svc.getAssignment(123, 456, { includeRubric: true })
    expect(data.id).toBe(456)
    const [url] = spy.mock.calls.at(-1) as any
    expect(url).toMatch(/courses\/123\/assignments\/456$/)
    const [, options] = spy.mock.calls.at(-1) as any
    expect(options.params['include[]']).toEqual(['rubric'])
  })

  it('getAssignmentSubmission requests submission for self when userId omitted', async () => {
    const spy = jest.spyOn(axios, 'get')
    spy.mockResolvedValueOnce({ data: { id: 99 } } as any)
    spy.mockResolvedValueOnce({ data: { id: 1, user_id: 99, score: 88, grade: '88' } } as any)
    const sub = await svc.getAssignmentSubmission(123, 456)
    expect(sub.user_id).toBe(99)
    const [url, options] = spy.mock.calls.at(-1) as any
    expect(url).toMatch(/courses\/123\/assignments\/456\/submissions\/99$/)
    expect(options.params.include).toEqual([])
  })

  it('getAssignmentSubmission can include rubric and comments', async () => {
    const spy = jest.spyOn(axios, 'get')
    spy.mockResolvedValueOnce({ data: { id: 99 } } as any)
    spy.mockResolvedValueOnce({ data: { id: 1, user_id: 99, rubric_assessment: {}, submission_comments: [] } } as any)
    const sub = await svc.getAssignmentSubmission(1, 2, { includeRubric: true, includeComments: true })
    expect(sub.rubric_assessment).toBeDefined()
    const [, options] = spy.mock.calls.at(-1) as any
    expect(options.params.include).toEqual(['rubric_assessment', 'submission_comments'])
  })
})
