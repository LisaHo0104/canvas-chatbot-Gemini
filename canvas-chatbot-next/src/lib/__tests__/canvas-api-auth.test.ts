import axios from 'axios'
import { CanvasAPIService } from '../canvas-api'

describe('CanvasAPIService auth headers', () => {
  const token = 'test-token'
  const baseUrl = 'https://canvas.example.com'
  const service = new CanvasAPIService(token, baseUrl)

  test('getCourses sets Authorization Bearer header', async () => {
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({ data: [] } as any)
    await service.getCourses('active')
    expect(spy).toHaveBeenCalled()
    const [url, options] = spy.mock.calls[0]
    expect(url).toMatch(/users\/self\/courses/)
    expect(options.headers.Authorization).toBe(`Bearer ${token}`)
  })

  test('getAssignments sets Authorization Bearer header', async () => {
    const spy = jest.spyOn(axios, 'get').mockResolvedValue({ data: [] } as any)
    await service.getAssignments(1, true)
    const [, options] = spy.mock.calls.at(-1) as any
    expect(options.headers.Authorization).toBe(`Bearer ${token}`)
  })
})
