import { tool } from 'ai'
import { z } from 'zod'
import { CanvasAPIService } from './canvas-api'

export function createCanvasTools(token: string, url: string) {
  const api = new CanvasAPIService(token, url)

  return {
		list_courses: tool({
			description: 'List user courses from Canvas',
			inputSchema: z
				.object({
					enrollmentState: z
						.enum(['active', 'completed', 'all'])
						.default('active'),
				})
				.default({ enrollmentState: 'active' }),
			execute: async ({
				enrollmentState,
			}: {
				enrollmentState?: 'active' | 'completed' | 'all';
			}) => {
				return api.getCourses(enrollmentState ?? 'active');
			},
		}),

		get_assignments: tool({
			description: 'Get assignments for a course',
			inputSchema: z.object({
				courseId: z.number(),
				includeSubmission: z.boolean().default(true),
			}),
			needsApproval: true,
			execute: async ({
				courseId,
				includeSubmission = true,
			}: {
				courseId: number;
				includeSubmission?: boolean;
			}) => {
				return api.getAssignments(courseId, includeSubmission);
			},
		}),

		get_modules: tool({
			description: 'Get modules for a course',
			inputSchema: z.object({
				courseId: z.number(),
			}),
			needsApproval: true,
			execute: async ({ courseId }: { courseId: number }) => {
				return api.getModules(courseId);
			},
		}),

		get_calendar_events: tool({
			description: 'Get upcoming calendar events',
			inputSchema: z
				.object({
					daysAhead: z.number().int().min(1).max(60).default(14),
				})
				.default({ daysAhead: 14 }),
			needsApproval: true,
			execute: async ({ daysAhead = 14 }: { daysAhead?: number }) => {
				return api.getCalendarEvents(daysAhead);
			},
		}),

		get_page_content: tool({
			description: 'Get Canvas page content by URL or slug',
			inputSchema: z.object({
				courseId: z.number(),
				pageUrl: z.string(),
			}),
			needsApproval: true,
			execute: async ({
				courseId,
				pageUrl,
			}: {
				courseId: number;
				pageUrl: string;
			}) => {
				return api.getPageContent(courseId, pageUrl);
			},
		}),

		get_file: tool({
			description: 'Get Canvas file metadata by fileId',
			inputSchema: z.object({
				fileId: z.number(),
			}),
			needsApproval: true,
			execute: async ({ fileId }: { fileId: number }) => {
				return api.getFileContent(fileId);
			},
		}),
	};
}
