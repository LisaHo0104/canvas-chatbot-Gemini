import { tool } from 'ai';
import { z } from 'zod';
import { CanvasAPIService } from './canvas-api';

export function createCanvasTools(token: string, url: string) {
	const api = new CanvasAPIService(token, url);

	return {
		list_courses: tool({
			description: 'List user courses from Canvas',
			inputSchema: z
				.object({
					enrollmentState: z.enum(['active', 'completed', 'all']).optional(),
					enrollmentType: z
						.enum(['student', 'teacher', 'ta', 'observer', 'designer'])
						.optional(),
					include: z.array(z.string()).optional(),
					perPage: z.number().int().min(1).max(100).optional(),
					searchTerm: z.string().optional(),
				})
				.default({ enrollmentState: 'active' }),
			execute: async ({
				enrollmentState,
				enrollmentType,
				include,
				perPage,
				searchTerm,
			}: {
				enrollmentState?: 'active' | 'completed' | 'all';
				enrollmentType?: 'student' | 'teacher' | 'ta' | 'observer' | 'designer';
				include?: string[];
				perPage?: number;
				searchTerm?: string;
			}) => {
				return api.getCourses({
					enrollmentState: enrollmentState ?? 'active',
					enrollmentType,
					include,
					perPage,
					searchTerm,
				});
			},
		}),

		get_assignments: tool({
			description: 'Get assignments for a course',
			inputSchema: z.object({
				courseId: z.number(),
				includeSubmission: z.boolean().default(true),
				bucket: z
					.enum(['upcoming', 'past', 'undated', 'overdue', 'ungraded'])
					.optional(),
				perPage: z.number().int().min(1).max(100).optional(),
				orderBy: z.enum(['due_at', 'position', 'name']).optional(),
				searchTerm: z.string().optional(),
			}),
			execute: async ({
				courseId,
				includeSubmission = true,
				bucket,
				perPage,
				orderBy,
				searchTerm,
			}: {
				courseId: number;
				includeSubmission?: boolean;
				bucket?: 'upcoming' | 'past' | 'undated' | 'overdue' | 'ungraded';
				perPage?: number;
				orderBy?: 'due_at' | 'position' | 'name';
				searchTerm?: string;
			}) => {
				return api.getAssignments(courseId, {
					includeSubmission,
					bucket,
					perPage,
					orderBy,
					searchTerm,
				});
			},
		}),

		get_modules: tool({
			description: 'Get modules for a course',
			inputSchema: z.object({
				courseId: z.number(),
				includeContentDetails: z.boolean().optional(),
				perPage: z.number().int().min(1).max(100).optional(),
			}),
			execute: async ({
				courseId,
				includeContentDetails,
				perPage,
			}: {
				courseId: number;
				includeContentDetails?: boolean;
				perPage?: number;
			}) => {
				return api.getModules(courseId, { includeContentDetails, perPage });
			},
		}),

		get_calendar_events: tool({
			description: 'Get upcoming calendar events',
			inputSchema: z
				.object({
					daysAhead: z.number().int().min(1).max(60).optional(),
					type: z.enum(['event', 'assignment']).optional(),
					contextCodes: z.array(z.string()).optional(),
					perPage: z.number().int().min(1).max(100).optional(),
					allEvents: z.boolean().optional(),
				})
				.default({ daysAhead: 14 }),
			execute: async ({
				daysAhead = 14,
				type,
				contextCodes,
				perPage,
				allEvents,
			}: {
				daysAhead?: number;
				type?: 'event' | 'assignment';
				contextCodes?: string[];
				perPage?: number;
				allEvents?: boolean;
			}) => {
				return api.getCalendarEvents({
					daysAhead,
					type,
					contextCodes,
					perPage,
					allEvents,
				});
			},
		}),

		get_page_content: tool({
			description: 'Get Canvas page content by URL or slug',
			inputSchema: z.object({
				courseId: z.number(),
				pageUrl: z.string(),
			}),
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
			execute: async ({ fileId }: { fileId: number }) => {
				return api.getFileContent(fileId);
			},
		}),
	};
}
