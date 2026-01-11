import axios from 'axios'
import { CanvasAPIService } from '../canvas-api'

describe('CanvasAPIService auth headers', () => {
  const token = 'test-token'
  const baseUrl = 'https://canvas.example.com'
  const service = new CanvasAPIService(token, baseUrl)

  test('getCourses sets Authorization Bearer header', async () => {
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({ data: [] } as any)
    await service.getCourses({ enrollmentState: 'active' })
    expect(spy).toHaveBeenCalled()
    const [url, options] = spy.mock.calls[0]
    expect(url).toMatch(/users\/self\/courses/)
    expect(options.headers.Authorization).toBe(`Bearer ${token}`)
  })

  test('getAssignments sets Authorization Bearer header', async () => {
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({ data: [] } as any)
    await service.getAssignments(1, { includeSubmission: true })
    const [, options] = spy.mock.calls.at(-1) as any
    expect(options.headers.Authorization).toBe(`Bearer ${token}`)
  })

  test('getAssignment sets Authorization Bearer header', async () => {
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({ data: {} } as any)
    await service.getAssignment(1, 2, { includeRubric: true })
    const [, options] = spy.mock.calls.at(-1) as any
    expect(options.headers.Authorization).toBe(`Bearer ${token}`)
    expect(options.params['include[]']).toEqual(['rubric'])
  })

  test('getAssignmentSubmission sets Authorization Bearer header', async () => {
    jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: { id: 99 } } as any)
    const spy = jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: { id: 1, user_id: 99 } } as any)
    await service.getAssignmentSubmission(1, 2)
    const [, options] = spy.mock.calls.at(-1) as any
    expect(options.headers.Authorization).toBe(`Bearer ${token}`)
  })
})
