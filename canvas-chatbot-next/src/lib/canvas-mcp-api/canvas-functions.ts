import { z } from 'zod';
import { canvasAPI } from './canvas-api';
import {
	McpFunctionDefinition,
	McpFunctionCall,
	McpFunctionResult,
} from './mcp-types';
import { logger } from './logger';
import { CanvasAPIError } from './errors';

// Validation schemas for function parameters
const userIdSchema = z.string().or(z.number());
const courseIdSchema = z.string().or(z.number());
const assignmentIdSchema = z.string().or(z.number());
const includeFieldsSchema = z.array(z.string()).optional();

const searchRecipientsSchema = z.object({
	search: z.string().min(1).max(255),
	context: z.string().optional(),
	type: z.enum(['user', 'context']).optional(),
	limit: z.number().min(1).max(100).default(20),
	offset: z.number().min(0).default(0),
});

const getUserSchema = z.object({
	id: userIdSchema,
	include: includeFieldsSchema,
});

const getCourseSchema = z.object({
	id: courseIdSchema,
	include: includeFieldsSchema,
});

const getCourseAssignmentsSchema = z.object({
	course_id: courseIdSchema,
	include: includeFieldsSchema,
	per_page: z.number().min(1).max(100).optional(),
	page: z.number().min(1).optional(),
});

const getSubmissionSchema = z.object({
	course_id: courseIdSchema,
	assignment_id: assignmentIdSchema,
	user_id: userIdSchema,
	include: includeFieldsSchema,
});

const getSubmissionsSchema = z.object({
	course_id: courseIdSchema,
	assignment_id: assignmentIdSchema,
	include: includeFieldsSchema,
	per_page: z.number().min(1).max(100).optional(),
	page: z.number().min(1).optional(),
});

const exportContentSchema = z.object({
    course_id: courseIdSchema,
    export_type: z.enum(['common_cartridge', 'qti', 'zip']),
    select: z.record(z.string(), z.array(z.string())).optional(),
    include_metadata: z.boolean().default(true),
});

const getPageViewsSchema = z.object({
	user_id: userIdSchema,
	start_time: z.string().datetime(),
	end_time: z.string().datetime(),
	results_format: z.enum(['csv', 'jsonl']).default('jsonl'),
	include_context: z.boolean().default(true),
});

const getAnalyticsSchema = z.object({
	account_id: z.string().or(z.number()),
	type: z.enum(['account', 'course']),
	start_date: z.string().datetime().optional(),
	end_date: z.string().datetime().optional(),
});

const getRubricSchema = z.object({
	course_id: courseIdSchema,
	rubric_id: z.string().or(z.number()),
	include: includeFieldsSchema,
});

const getCourseDiscussionsSchema = z.object({
	course_id: courseIdSchema,
	include: includeFieldsSchema,
	per_page: z.number().min(1).max(100).optional(),
	page: z.number().min(1).optional(),
});

const getCourseFilesSchema = z.object({
	course_id: courseIdSchema,
	include: includeFieldsSchema,
	per_page: z.number().min(1).max(100).optional(),
	page: z.number().min(1).optional(),
});

// Helper function to validate and extract token from context
function getAuthToken(context: any): string {
	const token = context?.canvasToken || context?.auth?.canvasToken;
	if (!token) {
		throw new CanvasAPIError(
			'Missing Canvas API authentication token',
			401,
			'AUTH_REQUIRED',
		);
	}
	return token;
}

// Canvas API Function Implementations
export const canvasFunctions: McpFunctionDefinition[] = [
	{
		name: 'search_recipients',
		description: 'Search for recipients (users or contexts) in Canvas',
		category: 'search',
		parameters: {
			search: {
				type: 'string',
				required: true,
				description: 'Search query string',
				validation: { minLength: 1, maxLength: 255 },
			},
			context: {
				type: 'string',
				required: false,
				description: 'Context for the search (e.g., course, group)',
			},
			type: {
				type: 'string',
				required: false,
				description: 'Type of recipients to search for',
				enum: ['user', 'context'],
			},
			limit: {
				type: 'number',
				required: false,
				description: 'Maximum number of results to return',
				default: 20,
				validation: { min: 1, max: 100 },
			},
			offset: {
				type: 'number',
				required: false,
				description: 'Number of results to skip',
				default: 0,
				validation: { min: 0 },
			},
		},
		returns: {
			type: 'array',
			description: 'Array of search results',
		},
		examples: [
			{
				description: 'Search for users by name',
				parameters: { search: 'john doe', type: 'user', limit: 10 },
			},
			{
				description: 'Search within a specific course context',
				parameters: { search: 'student', context: 'course_123', limit: 20 },
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const validatedParams = searchRecipientsSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.searchRecipients(validatedParams);

				return {
					success: true,
					data: result,
					metadata: {
						duration: 0, // Will be filled by executor
						timestamp: new Date().toISOString(),
						functionName: 'search_recipients',
						callId: '', // Will be filled by executor
					},
				};
			} catch (error) {
				logger.error('search_recipients function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'get_user',
		description: 'Get detailed information about a specific user',
		category: 'users',
		parameters: {
			id: {
				type: 'string',
				required: true,
				description: 'User ID or login ID',
			},
			include: {
				type: 'array',
				required: false,
				description: 'Additional fields to include',
				items: {
					type: 'string',
					description: 'User fields to include',
					enum: [
						'uuid',
						'last_login',
						'permissions',
						'email',
						'effective_locale',
					],
				},
			},
		},
		returns: {
			type: 'object',
			description: 'Canvas user object',
		},
		examples: [
			{
				description: 'Get basic user information',
				parameters: { id: '123' },
			},
			{
				description: 'Get user with additional fields',
				parameters: {
					id: '123',
					include: ['email', 'last_login', 'permissions'],
				},
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = getUserSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.getUser(String(validatedParams.id), {
					include: validatedParams.include,
				});

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'get_user',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('get_user function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'get_user_page_views',
		description:
			'Get page view analytics for a specific user within a time range',
		category: 'analytics',
		parameters: {
			user_id: {
				type: 'string',
				required: true,
				description: 'User ID',
			},
			start_time: {
				type: 'string',
				required: true,
				description: 'Start time in ISO 8601 format',
			},
			end_time: {
				type: 'string',
				required: true,
				description: 'End time in ISO 8601 format',
			},
			results_format: {
				type: 'string',
				required: false,
				description: 'Format of the results',
				default: 'jsonl',
				enum: ['csv', 'jsonl'],
			},
			include_context: {
				type: 'boolean',
				required: false,
				description: 'Include context information',
				default: true,
			},
		},
		returns: {
			type: 'array',
			description: 'Array of Canvas page view objects',
		},
		examples: [
			{
				description: 'Get page views for the last week',
				parameters: {
					user_id: '123',
					start_time: '2024-01-01T00:00:00Z',
					end_time: '2024-01-07T23:59:59Z',
				},
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = getPageViewsSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.queryUserPageViews(
					String(validatedParams.user_id),
					{
						start_time: validatedParams.start_time,
						end_time: validatedParams.end_time,
						results_format: validatedParams.results_format,
						include_context: validatedParams.include_context,
						analytics: true,
					},
				);

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'get_user_page_views',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('get_user_page_views function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'get_course',
		description: 'Get detailed information about a specific course',
		category: 'courses',
		parameters: {
			id: {
				type: 'string',
				required: true,
				description: 'Course ID',
			},
			include: {
				type: 'array',
				required: false,
				description: 'Additional fields to include',
			},
		},
		returns: {
			type: 'object',
			description: 'Canvas course object',
		},
		examples: [
			{
				description: 'Get basic course information',
				parameters: { id: '123' },
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = getCourseSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.getCourse(String(validatedParams.id), {
					include: validatedParams.include,
				});

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'get_course',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('get_course function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'get_course_assignments',
		description: 'Get all assignments for a specific course',
		category: 'courses',
		parameters: {
			course_id: {
				type: 'string',
				required: true,
				description: 'Course ID',
			},
			include: {
				type: 'array',
				required: false,
				description: 'Additional fields to include',
			},
			per_page: {
				type: 'number',
				required: false,
				description: 'Number of results per page',
				default: 20,
				validation: { min: 1, max: 100 },
			},
			page: {
				type: 'number',
				required: false,
				description: 'Page number',
				validation: { min: 1 },
			},
		},
		returns: {
			type: 'array',
			description: 'Array of Canvas assignment objects',
		},
		examples: [
			{
				description: 'Get all assignments for a course',
				parameters: { course_id: '123' },
			},
			{
				description: 'Get assignments with pagination',
				parameters: { course_id: '123', per_page: 50, page: 1 },
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = getCourseAssignmentsSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.getCourseAssignments(
					String(validatedParams.course_id),
					{
						include: validatedParams.include,
						per_page: validatedParams.per_page,
						page: validatedParams.page,
					},
				);

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'get_course_assignments',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('get_course_assignments function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'get_submission',
		description: 'Get submission details for a specific assignment and user',
		category: 'submissions',
		parameters: {
			course_id: {
				type: 'string',
				required: true,
				description: 'Course ID',
			},
			assignment_id: {
				type: 'string',
				required: true,
				description: 'Assignment ID',
			},
			user_id: {
				type: 'string',
				required: true,
				description: 'User ID',
			},
			include: {
				type: 'array',
				required: false,
				description: 'Additional fields to include',
			},
		},
		returns: {
			type: 'object',
			description: 'Canvas submission object',
		},
		examples: [
			{
				description: 'Get submission for a specific user and assignment',
				parameters: {
					course_id: '123',
					assignment_id: '456',
					user_id: '789',
				},
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = getSubmissionSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.getSubmission(
					String(validatedParams.course_id),
					String(validatedParams.assignment_id),
					String(validatedParams.user_id),
					{
						include: validatedParams.include,
					},
				);

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'get_submission',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('get_submission function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'get_submissions',
		description: 'Get all submissions for a specific assignment',
		category: 'submissions',
		parameters: {
			course_id: {
				type: 'string',
				required: true,
				description: 'Course ID',
			},
			assignment_id: {
				type: 'string',
				required: true,
				description: 'Assignment ID',
			},
			include: {
				type: 'array',
				required: false,
				description: 'Additional fields to include',
			},
			per_page: {
				type: 'number',
				required: false,
				description: 'Number of results per page',
				default: 20,
				validation: { min: 1, max: 100 },
			},
			page: {
				type: 'number',
				required: false,
				description: 'Page number',
				validation: { min: 1 },
			},
		},
		returns: {
			type: 'array',
			description: 'Array of Canvas submission objects',
		},
		examples: [
			{
				description: 'Get all submissions for an assignment',
				parameters: {
					course_id: '123',
					assignment_id: '456',
				},
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = getSubmissionsSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.getSubmissions(
					String(validatedParams.course_id),
					String(validatedParams.assignment_id),
					{
						include: validatedParams.include,
						per_page: validatedParams.per_page,
						page: validatedParams.page,
					},
				);

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'get_submissions',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('get_submissions function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'export_course_content',
		description: 'Export course content in various formats',
		category: 'content',
		parameters: {
			course_id: {
				type: 'string',
				required: true,
				description: 'Course ID',
			},
			export_type: {
				type: 'string',
				required: true,
				description: 'Type of export',
				enum: ['common_cartridge', 'qti', 'zip'],
			},
			select: {
				type: 'object',
				required: false,
				description: 'Specific content to export',
			},
			include_metadata: {
				type: 'boolean',
				required: false,
				description: 'Include metadata in export',
				default: true,
			},
		},
		returns: {
			type: 'object',
			description: 'Canvas content export object',
		},
		examples: [
			{
				description: 'Export course as Common Cartridge',
				parameters: {
					course_id: '123',
					export_type: 'common_cartridge',
				},
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = exportContentSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.exportContent(
					String(validatedParams.course_id),
					{
						export_type: validatedParams.export_type,
						select: validatedParams.select,
						include_metadata: validatedParams.include_metadata,
					},
				);

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'export_course_content',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('export_course_content function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'get_account_analytics',
		description: 'Get analytics data for an account',
		category: 'analytics',
		parameters: {
			account_id: {
				type: 'string',
				required: true,
				description: 'Account ID',
			},
			type: {
				type: 'string',
				required: true,
				description: 'Type of analytics',
				enum: ['account', 'course'],
			},
			start_date: {
				type: 'string',
				required: false,
				description: 'Start date in ISO 8601 format',
			},
			end_date: {
				type: 'string',
				required: false,
				description: 'End date in ISO 8601 format',
			},
		},
		returns: {
			type: 'object',
			description: 'Canvas analytics object',
		},
		examples: [
			{
				description: 'Get account analytics',
				parameters: {
					account_id: '1',
					type: 'account',
				},
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = getAnalyticsSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.getAccountAnalytics(
					String(validatedParams.account_id),
					validatedParams.type,
					{
						start_date: validatedParams.start_date,
						end_date: validatedParams.end_date,
					},
				);

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'get_account_analytics',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('get_account_analytics function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'get_rubric',
		description: 'Get rubric details for a course',
		category: 'assessment',
		parameters: {
			course_id: {
				type: 'string',
				required: true,
				description: 'Course ID',
			},
			rubric_id: {
				type: 'string',
				required: true,
				description: 'Rubric ID',
			},
			include: {
				type: 'array',
				required: false,
				description: 'Additional fields to include',
			},
		},
		returns: {
			type: 'object',
			description: 'Canvas rubric object',
		},
		examples: [
			{
				description: 'Get rubric details',
				parameters: {
					course_id: '123',
					rubric_id: '456',
				},
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = getRubricSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.getRubric(
					String(validatedParams.course_id),
					String(validatedParams.rubric_id),
					{
						include: validatedParams.include,
					},
				);

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'get_rubric',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('get_rubric function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'get_course_discussions',
		description: 'Get discussion topics for a course',
		category: 'courses',
		parameters: {
			course_id: {
				type: 'string',
				required: true,
				description: 'Course ID',
			},
			include: {
				type: 'array',
				required: false,
				description: 'Additional fields to include',
			},
			per_page: {
				type: 'number',
				required: false,
				description: 'Number of results per page',
				default: 20,
				validation: { min: 1, max: 100 },
			},
			page: {
				type: 'number',
				required: false,
				description: 'Page number',
				validation: { min: 1 },
			},
		},
		returns: {
			type: 'array',
			description: 'Array of Canvas discussion objects',
		},
		examples: [
			{
				description: 'Get course discussions',
				parameters: { course_id: '123' },
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = getCourseDiscussionsSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.getCourseDiscussions(
					String(validatedParams.course_id),
					{
						include: validatedParams.include,
						per_page: validatedParams.per_page,
						page: validatedParams.page,
					},
				);

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'get_course_discussions',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('get_course_discussions function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},

	{
		name: 'get_course_files',
		description: 'Get files for a course',
		category: 'courses',
		parameters: {
			course_id: {
				type: 'string',
				required: true,
				description: 'Course ID',
			},
			include: {
				type: 'array',
				required: false,
				description: 'Additional fields to include',
			},
			per_page: {
				type: 'number',
				required: false,
				description: 'Number of results per page',
				default: 20,
				validation: { min: 1, max: 100 },
			},
			page: {
				type: 'number',
				required: false,
				description: 'Page number',
				validation: { min: 1 },
			},
		},
		returns: {
			type: 'array',
			description: 'Array of Canvas file objects',
		},
		examples: [
			{
				description: 'Get course files',
				parameters: { course_id: '123' },
			},
		],
		implementation: async (
			params: any,
			context: any,
		): Promise<McpFunctionResult> => {
			try {
				const start = Date.now();
				const validatedParams = getCourseFilesSchema.parse(params);
				const token = getAuthToken(context);

				canvasAPI.setAuthToken(token);
				const result = await canvasAPI.getCourseFiles(
					String(validatedParams.course_id),
					{
						include: validatedParams.include,
						per_page: validatedParams.per_page,
						page: validatedParams.page,
					},
				);

				return {
					success: true,
					data: result,
					metadata: {
						duration: Date.now() - start,
						timestamp: new Date().toISOString(),
						functionName: 'get_course_files',
						callId: context?.requestId ?? '',
					},
				};
			} catch (error) {
				logger.error('get_course_files function error', {
					error: error.message,
					params,
				});
				throw error;
			}
		},
	},
];

// Export functions by category for easy access
export const canvasFunctionsByCategory = {
	search: canvasFunctions.filter((f) => f.category === 'search'),
	users: canvasFunctions.filter((f) => f.category === 'users'),
	courses: canvasFunctions.filter((f) => f.category === 'courses'),
	submissions: canvasFunctions.filter((f) => f.category === 'submissions'),
	content: canvasFunctions.filter((f) => f.category === 'content'),
	analytics: canvasFunctions.filter((f) => f.category === 'analytics'),
	assessment: canvasFunctions.filter((f) => f.category === 'assessment'),
};

// Export all function names for easy reference
export const canvasFunctionNames = canvasFunctions.map((f) => f.name);