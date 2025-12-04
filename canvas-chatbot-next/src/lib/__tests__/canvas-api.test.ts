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
