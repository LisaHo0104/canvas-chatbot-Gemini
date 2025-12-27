import axios from 'axios'
import { CanvasAPIService } from '@/lib/canvas-api'

jest.mock('axios')

describe('CanvasAPIService reliability', () => {
  const mockApiKey = 'token'
  const mockUrl = 'https://example.instructure.com'
  let service: CanvasAPIService

  beforeEach(() => {
    service = new CanvasAPIService(mockApiKey, mockUrl)
    ;(axios.get as jest.Mock).mockReset()
  })

  it('retries on 429 and succeeds', async () => {
    const courseId = 123
    ;(axios.get as jest.Mock)
      .mockResolvedValueOnce({ data: { id: courseId } })
      .mockRejectedValueOnce({ response: { status: 429, headers: { 'retry-after': '0' } } })
      .mockResolvedValueOnce({ data: [{ id: 1, name: 'Module A', position: 1, items: [] }] })

    const modules = await service.getModules(courseId)
    expect(modules.length).toBe(1)
    expect((axios.get as jest.Mock).mock.calls[1][0]).toContain(`/courses/${courseId}/modules`)
  })

  it('validates course existence before fetching modules', async () => {
    const courseId = 999
    ;(axios.get as jest.Mock)
      .mockRejectedValueOnce({ response: { status: 404, data: 'Not Found' } })

    await expect(service.getModules(courseId)).rejects.toThrow('Failed to fetch modules (404): Not Found')
    expect((axios.get as jest.Mock).mock.calls[0][0]).toContain(`/courses/${courseId}`)
  })

  it('uses include[] for courses include params', async () => {
    ;(axios.get as jest.Mock).mockResolvedValueOnce({ data: [] })
    await service.getCourses({ include: ['teachers', 'sections'] })
    const call = (axios.get as jest.Mock).mock.calls[0]
    expect(call[0]).toContain('/users/self/courses')
    expect(call[1].params['include[]']).toEqual(['teachers', 'sections'])
  })

  it('uses context_codes[] for calendar events', async () => {
    ;(axios.get as jest.Mock).mockResolvedValueOnce({ data: [] })
    await service.getCalendarEvents({ contextCodes: ['course_1', 'course_2'] })
    const call = (axios.get as jest.Mock).mock.calls[0]
    expect(call[0]).toContain('/calendar_events')
    expect(call[1].params['context_codes[]']).toEqual(['course_1', 'course_2'])
  })
})

