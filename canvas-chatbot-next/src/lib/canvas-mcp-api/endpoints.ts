import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { CanvasAPIError } from './errors';
import { validateRequest } from './validation';
import { logger } from './logger';
import { cacheMiddleware } from './cache';

import { rateLimiter } from './rate-limiter';

// Validation schemas
const searchSchema = z.object({
	search: z.string().min(1).max(255),
	context: z.string().optional(),
	type: z.enum(['user', 'context']).optional(),
	limit: z.number().min(1).max(100).default(20),
	offset: z.number().min(0).default(0),

});

const userSchema = z.object({
	id: z.string().or(z.number()),
	include: z
		.array(
			z.enum([
				'uuid',
				'last_login',
				'permissions',
				'email',
				'effective_locale',
			]),
		)
		.optional(),
});

const contentExportSchema = z.object({
	course_id: z.string().or(z.number()),
	export_type: z.enum(['common_cartridge', 'qti', 'zip']),
	select: z.record(z.array(z.string())).optional(),
	include_metadata: z.boolean().default(true),

});

const pageViewsSchema = z.object({
	user_id: z.string().or(z.number()),
	start_time: z.string().datetime(),
	end_time: z.string().datetime(),
	results_format: z.enum(['csv', 'jsonl']).default('jsonl'),
	include_context: z.boolean().default(true),
});

// Authentication middleware
export const authenticateCanvas = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const token = req.headers.authorization?.replace('Bearer ', '');

	if (!token) {
		return next(new CanvasAPIError('Missing authentication token', 401));
	}

	// Validate Canvas API token
	if (!isValidCanvasToken(token)) {
		return next(new CanvasAPIError('Invalid authentication token', 401));
	}

	req.canvasToken = token;
	next();
};

// Search endpoint
export const searchRecipients = [
	authenticateCanvas,
	rateLimiter(),
	cacheMiddleware({ ttl: 300 }), // 5 minute cache
	validateRequest(searchSchema),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { search, context, type, limit, offset } =
				req.query;

			logger.info('Search recipients request', {
				search,
				context,
				type,
				userId: req.user?.id,
			});



			// Standard Canvas API search
			const searchResults = await canvasAPI.searchRecipients(
				{
					search: search as string,
					context: context as string,
					type: type as string,
					limit: limit as number,
					offset: offset as number,
				},
				req.canvasToken,
			);

			const enhancedResults = searchResults;

			res.json({
				success: true,
				data: enhancedResults,
				pagination: {
					limit: limit as number,
					offset: offset as number,
					total: searchResults.total,
				},

			});
		} catch (error) {
			logger.error('Search recipients error', {
				error: error.message,
				search: req.query.search,
			});
			next(error);
		}
	},
];

// User endpoint with metadata enrichment
export const getUser = [
	authenticateCanvas,
	rateLimiter(),
	cacheMiddleware({ ttl: 600 }), // 10 minute cache
	validateRequest(userSchema),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id, include } = req.query;

			logger.info('Get user request', { userId: id, include });

			const userData = await canvasAPI.getUser(
				id as string,
				{
					include: include as string[],
				},
				req.canvasToken,
			);

			const enrichedUser = userData;

			res.json({
				success: true,
				data: enrichedUser,
			});
		} catch (error) {
			logger.error('Get user error', {
				error: error.message,
				userId: req.query.id,
			});
			next(error);
		}
	},
];

// Content export endpoint
export const exportContent = [
	authenticateCanvas,
	rateLimiter({ max: 10, window: 60000 }), // 10 requests per minute
	validateRequest(contentExportSchema),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { course_id, export_type, select, include_metadata } =
				req.body;

			logger.info('Content export request', {
				course_id,
				export_type,
				include_metadata,

			});

			// Initiate content export
			const exportJob = await canvasAPI.exportContent(
				course_id,
				{
					export_type,
					select,
					include_metadata,
				},
				req.canvasToken,
			);



			res.status(202).json({
				success: true,
				data: {
					export_id: exportJob.id,
					status_url: `/api/v1/exports/${exportJob.id}/status`,
	
					estimated_completion: exportJob.estimated_completion,
				},
			});
		} catch (error) {
			logger.error('Content export error', {
				error: error.message,
				course_id: req.body.course_id,
			});
			next(error);
		}
	},
];

// Page views endpoint with analytics
export const getPageViews = [
	authenticateCanvas,
	rateLimiter(),
	cacheMiddleware({ ttl: 1800 }), // 30 minute cache
	validateRequest(pageViewsSchema),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { user_id, start_time, end_time, results_format, include_context } =
				req.query;

			logger.info('Page views request', { user_id, start_time, end_time });

			// Query page views with analytics
			const queryResult = await canvasAPI.queryPageViews(
				user_id as string,
				{
					start_time: start_time as string,
					end_time: end_time as string,
					results_format: results_format as string,
					include_context: include_context === 'true',
					analytics: true,
				},
				req.canvasToken,
			);

			const enhancedResult = queryResult;

			res.json({
				success: true,
				data: enhancedResult,
			});
		} catch (error) {
			logger.error('Page views error', {
				error: error.message,
				user_id: req.query.user_id,
			});
			next(error);
		}
	},
];

// Helper functions
function isValidCanvasToken(token: string): boolean {
	// Implement Canvas token validation logic
	return token && token.length > 0;
}



async function getUserActivitySummary(
	userId: string,
	token: string,
): Promise<any> {
	// Implement user activity summary logic
	return {};
}

async function getUserContentAccess(
	userId: string,
	token: string,
): Promise<any> {
	// Implement content access analysis
	return {};
}

async function getUserVectorProfile(userId: string): Promise<any> {
	// Implement vector profile retrieval
	return {};
}