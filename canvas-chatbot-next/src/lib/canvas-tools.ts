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

		get_file_text: tool({
			description: 'Extract text content from a Canvas file (PDF only)',
			inputSchema: z.object({
				fileId: z.number(),
			}),
			execute: async ({ fileId }: { fileId: number }) => {
				return api.getFileText(fileId);
			},
		}),

		get_assignment_grade: tool({
			description: 'Get grade and score for an assignment',
			inputSchema: z.object({
				courseId: z.number(),
				assignmentId: z.number(),
				userId: z.number().optional(),
			}),
			execute: async ({
				courseId,
				assignmentId,
				userId,
			}: {
				courseId: number;
				assignmentId: number;
				userId?: number;
			}) => {
				const submission = await api.getAssignmentSubmission(courseId, assignmentId, {
					userId,
				});
				const assignment = await api.getAssignment(courseId, assignmentId);
				return {
					grade: (submission as any).grade ?? null,
					score: submission?.score ?? null,
					pointsPossible: assignment?.points_possible ?? null,
					gradedAt: submission?.graded_at ?? null,
					workflowState: String(submission?.workflow_state || ''),
					submittedAt: submission?.submitted_at ?? null,
				};
			},
		}),

		get_assignment_feedback_and_rubric: tool({
			description: 'Get submission comments and a complete rubric breakdown for an assignment',
			inputSchema: z.object({
				courseId: z.number(),
				assignmentId: z.number(),
				userId: z.number().optional(),
			}),
			execute: async ({
				courseId,
				assignmentId,
				userId,
			}: {
				courseId: number;
				assignmentId: number;
				userId?: number;
			}) => {
				const submission = await api.getAssignmentSubmission(courseId, assignmentId, {
					userId,
					includeRubric: true,
					includeComments: true,
				});
				const assignment = await api.getAssignment(courseId, assignmentId, {
					includeRubric: true,
				});
				const rubric = Array.isArray((assignment as any).rubric)
					? ((assignment as any).rubric as any[])
					: [];
				const assessment = (submission as any).rubric_assessment || {};
				const merged = rubric.map((c: any) => {
					const primaryId = c?.id ?? c?.criterion_id;
					const keys = [
						primaryId,
						String(primaryId),
						c?.criterion_id,
						String(c?.criterion_id),
						primaryId != null ? `criterion_${String(primaryId)}` : null,
						c?.criterion_id != null ? `criterion_${String(c?.criterion_id)}` : null,
					].filter((k) => typeof k === 'string' && k.length > 0);
					let a: any = null;
					for (const k of keys as any[]) {
						if (assessment && Object.prototype.hasOwnProperty.call(assessment, k)) {
							a = (assessment as any)[k];
							break;
						}
					}
					const ratingsArr = Array.isArray(c?.ratings) ? c.ratings : [];
					const computedPointsPossible =
						typeof c?.points === 'number'
							? c.points
							: ratingsArr.length
							? Math.max(
								...ratingsArr.map((r: any) =>
									typeof r?.points === 'number' ? r.points : 0,
								),
							)
							: null;
					let assessedPoints = typeof a?.points === 'number' ? a.points : null;
					if (assessedPoints === null && a?.rating_id && ratingsArr.length) {
						const match = ratingsArr.find(
							(r: any) => String(r?.id ?? r?.rating_id ?? '') === String(a.rating_id),
						);
						const ratingPts = typeof match?.points === 'number' ? match.points : null;
						if (typeof ratingPts === 'number') assessedPoints = ratingPts;
					}
					return {
						id: String(primaryId ?? c?.criterion_id ?? ''),
						description: c?.description ?? null,
						long_description: c?.long_description ?? null,
						points_possible: computedPointsPossible,
						ratings: ratingsArr.map((r: any) => ({
							description: r?.description ?? null,
							points: typeof r?.points === 'number' ? r.points : null,
						})),
						assessed_points: assessedPoints,
						your_score: assessedPoints,
						assessed_comments: a?.comments ?? null,
					};
				});
				const pointsPossible = merged.reduce(
					(sum: number, c: any) => sum + (typeof c?.points_possible === 'number' ? c.points_possible : 0),
					0,
				);
				const pointsEarned = merged.reduce(
					(sum: number, c: any) => sum + (typeof c?.assessed_points === 'number' ? c.assessed_points : 0),
					0,
				);
				const percentage = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : null;
				return {
					rubric: merged,
					submissionComments: Array.isArray((submission as any).submission_comments)
						? (submission as any).submission_comments
						: [],
					grade: (submission as any).grade ?? null,
					score: submission?.score ?? null,
					totals: {
						points_possible: pointsPossible || null,
						points_earned: pointsEarned || null,
						percentage: percentage ?? null,
					},
				};
			},
		}),

		get_assignment_rubric: tool({
			description: 'Get the rubric criteria and ratings for an assignment. Use this to interpret what is required for each grade level.',
			inputSchema: z.object({
				courseId: z.number(),
				assignmentId: z.number(),
			}),
			execute: async ({
				courseId,
				assignmentId,
			}: {
				courseId: number;
				assignmentId: number;
			}) => {
				const assignment = await api.getAssignment(courseId, assignmentId, {
					includeRubric: true,
				});
				if (!assignment.rubric || !Array.isArray(assignment.rubric)) {
					return { error: 'No rubric found for this assignment' };
				}
				return {
					assignmentName: assignment.name,
					assignmentDescription: assignment.description,
					rubric: assignment.rubric.map((criterion: any) => ({
						id: criterion.id,
						description: criterion.description,
						long_description: criterion.long_description,
						points_possible: criterion.points,
						ratings: criterion.ratings?.map((r: any) => ({
							description: r.description,
							points: r.points,
						})) || [],
					})),
				};
			},
		}),
	};
}
