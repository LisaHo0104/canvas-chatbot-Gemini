import { CanvasContextService } from '../canvas-context'

class MockCanvasAPI {
  token = ''
  url = ''
  constructor() {}
  async getCourses() { return [{ id: 1, name: 'Course', course_code: 'MKT20021' }] }
  async getModules() { return [
    { id: 10, name: 'Week Two: IMC Basics', items: [] },
    { id: 11, name: 'Module 2 Resources', items: [] },
  ] }
}

describe('CanvasContextService week detection', () => {
  it('matches spelled-out week names', async () => {
    const svc = new CanvasContextService('tok', 'https://example.com/api/v1') as any
    svc.canvasService = new MockCanvasAPI() as any
    const ctx = await svc.buildContentContext(1, 'summarize week two')
    expect(ctx).toContain('Showing content for WEEK 2')
  })
})
