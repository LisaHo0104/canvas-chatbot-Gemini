import { CanvasAPIService } from '@/lib/canvas-api'

// Mock fetch globally
global.fetch = jest.fn()

describe('CanvasAPIService', () => {
  let service: CanvasAPIService
  const mockApiKey = 'test-api-key'
  const mockCanvasUrl = 'https://test.instructure.com'
  
  beforeEach(() => {
    service = new CanvasAPIService(mockApiKey, mockCanvasUrl)
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with provided API key and URL', () => {
      expect(service).toBeInstanceOf(CanvasAPIService)
    })

    it('should handle Canvas URL without /api/v1 suffix', () => {
      const serviceWithoutSuffix = new CanvasAPIService(mockApiKey, 'https://test.instructure.com')
      expect(serviceWithoutSuffix).toBeInstanceOf(CanvasAPIService)
    })

    it('should handle Canvas URL with /api/v1 suffix', () => {
      const serviceWithSuffix = new CanvasAPIService(mockApiKey, 'https://test.instructure.com/api/v1')
      expect(serviceWithSuffix).toBeInstanceOf(CanvasAPIService)
    })
  })

  describe('getCourses', () => {
    it('should fetch courses successfully', async () => {
      const mockCourses = [
        { id: 1, name: 'Course 1', course_code: 'CS101' },
        { id: 2, name: 'Course 2', course_code: 'CS102' }
      ]
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourses,
      })

      const courses = await service.getCourses()
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/courses'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiKey}`,
          }),
        })
      )
      expect(courses).toEqual(mockCourses)
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      await expect(service.getCourses()).rejects.toThrow('Canvas API error: 401 Unauthorized')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(service.getCourses()).rejects.toThrow('Network error')
    })
  })

  describe('getAssignments', () => {
    it('should fetch assignments for a course', async () => {
      const courseId = 123
      const mockAssignments = [
        { id: 1, name: 'Assignment 1', points_possible: 100 },
        { id: 2, name: 'Assignment 2', points_possible: 50 }
      ]
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAssignments,
      })

      const assignments = await service.getAssignments(courseId)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/courses/${courseId}/assignments`),
        expect.any(Object)
      )
      expect(assignments).toEqual(mockAssignments)
    })
  })

  describe('getModules', () => {
    it('should fetch modules for a course', async () => {
      const courseId = 123
      const mockModules = [
        { id: 1, name: 'Module 1', position: 1 },
        { id: 2, name: 'Module 2', position: 2 }
      ]
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockModules,
      })

      const modules = await service.getModules(courseId)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/courses/${courseId}/modules`),
        expect.any(Object)
      )
      expect(modules).toEqual(mockModules)
    })
  })

  describe('getFiles', () => {
    it('should fetch files for a course', async () => {
      const courseId = 123
      const mockFiles = [
        { id: 1, filename: 'file1.pdf', size: 1024 },
        { id: 2, filename: 'file2.docx', size: 2048 }
      ]
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFiles,
      })

      const files = await service.getFiles(courseId)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/courses/${courseId}/files`),
        expect.any(Object)
      )
      expect(files).toEqual(mockFiles)
    })
  })

  describe('getFileContent', () => {
    it('should fetch file content', async () => {
      const fileId = 456
      const mockContent = 'File content here'
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockContent,
      })

      const content = await service.getFileContent(fileId)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/files/${fileId}/contents`),
        expect.any(Object)
      )
      expect(content).toBe(mockContent)
    })
  })

  describe('getCourseInfo', () => {
    it('should fetch course information', async () => {
      const courseId = 123
      const mockCourseInfo = {
        id: courseId,
        name: 'Test Course',
        course_code: 'TEST101',
        start_at: '2024-01-01',
        end_at: '2024-12-31'
      }
      
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourseInfo,
      })

      const courseInfo = await service.getCourseInfo(courseId)
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/courses/${courseId}`),
        expect.any(Object)
      )
      expect(courseInfo).toEqual(mockCourseInfo)
    })
  })
})