/**
 * Minimal Canvas Functions for MCP Testing
 * A simplified version with just a few functions to demonstrate the MCP system
 */

import { z } from 'zod';
import { McpFunctionDefinition, McpFunctionResult } from './mcp-types';
import { logger } from './logger';

// Simple schemas for testing
const searchSchema = z.object({
	query: z.string().min(1),
	limit: z.number().min(1).max(100).optional().default(10),
});

const userSchema = z.object({
	user_id: z.string().or(z.number()),
});

const courseSchema = z.object({
	course_id: z.string().or(z.number()),
});

// Mock Canvas API functions
const mockCanvasAPI = {
	searchRecipients: async (params: any) => {
		// Simulate API delay
		await new Promise((resolve) => setTimeout(resolve, 100));
		return [
			{ id: 1, name: 'John Doe', type: 'user', email: 'john@example.com' },
			{ id: 2, name: 'Jane Smith', type: 'user', email: 'jane@example.com' },
			{ id: 3, name: 'Course 101', type: 'course', code: 'CS101' },
		].slice(0, params.limit);
	},

	getUser: async (params: any) => {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return {
			id: params.user_id,
			name: 'John Doe',
			email: 'john@example.com',
			login_id: 'john_doe',
			created_at: '2023-01-01T00:00:00Z',
			updated_at: '2023-12-01T00:00:00Z',
		};
	},

	getCourse: async (params: any) => {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return {
			id: params.course_id,
			name: 'Introduction to Computer Science',
			course_code: 'CS101',
			workflow_state: 'available',
			created_at: '2023-01-01T00:00:00Z',
			updated_at: '2023-12-01T00:00:00Z',
		};
	},
};

// Helper function to validate and extract token from context
function getAuthToken(context: any): string {
	const token = context?.canvasToken || context?.auth?.canvasToken;
	if (!token) {
		throw new Error('Missing Canvas API authentication token');
	}
	return token;
}

export const canvasFunctionsMinimal: McpFunctionDefinition[] = [
	{
		name: 'search_recipients',
		description: 'Search for recipients (users or contexts) in Canvas',
		category: 'search',
		parameters: {
			query: {
				type: 'string',
				required: true,
				description: 'Search query string',
				validation: { minLength: 1, maxLength: 255 },
			},
			limit: {
				type: 'number',
				required: false,
				description: 'Maximum number of results to return',
				default: 10,
				validation: { min: 1, max: 100 },
			},
		},
		returns: {
			type: 'array',
			description: 'Array of search results',
		},
		examples: [
			{
				description: 'Search for users by name',
				parameters: { query: 'john doe', limit: 10 },
			},
			{
				description: 'Search within a specific course context',
				parameters: { query: 'student', limit: 20 },
			},
		],
	},

	{
		name: 'get_user',
		description: 'Get detailed information about a specific user',
		category: 'users',
		parameters: {
			user_id: {
				type: 'string',
				required: true,
				description: 'User ID',
			},
		},
		returns: {
			type: 'object',
			description: 'User information object',
		},
		examples: [
			{
				description: 'Get user by ID',
				parameters: { user_id: '123' },
			},
		],
	},

	{
		name: 'get_course',
		description: 'Get detailed information about a specific course',
		category: 'courses',
		parameters: {
			course_id: {
				type: 'string',
				required: true,
				description: 'Course ID',
			},
		},
		returns: {
			type: 'object',
			description: 'Course information object',
		},
		examples: [
			{
				description: 'Get course by ID',
				parameters: { course_id: '456' },
			},
		],
	},
];

// Create function implementations
export function createCanvasFunctionImplementations() {
	const implementations = new Map<string, Function>();

	implementations.set(
		'search_recipients',
		async (params: any, context: any): Promise<McpFunctionResult> => {
			try {
				const validatedParams = searchSchema.parse(params);
				const token = getAuthToken(context);

				// Simulate API call
				const result = await mockCanvasAPI.searchRecipients(validatedParams);

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
	);

	implementations.set(
		'get_user',
		async (params: any, context: any): Promise<McpFunctionResult> => {
			try {
				const validatedParams = userSchema.parse(params);
				const token = getAuthToken(context);

				const result = await mockCanvasAPI.getUser(validatedParams);

				return {
					success: true,
					data: result,
					metadata: {
						duration: 0,
						timestamp: new Date().toISOString(),
						functionName: 'get_user',
						callId: '',
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
	);

	implementations.set(
		'get_course',
		async (params: any, context: any): Promise<McpFunctionResult> => {
			try {
				const validatedParams = courseSchema.parse(params);
				const token = getAuthToken(context);

				const result = await mockCanvasAPI.getCourse(validatedParams);

				return {
					success: true,
					data: result,
					metadata: {
						duration: 0,
						timestamp: new Date().toISOString(),
						functionName: 'get_course',
						callId: '',
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
	);

	return implementations;
}

export { canvasFunctionsMinimal as canvasFunctions };