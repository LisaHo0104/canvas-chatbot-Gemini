import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import {
	generateObject,
	convertToModelMessages,
	jsonSchema,
	type UIMessage,
} from 'ai';
import {
	createOpenRouterProvider,
	getDefaultModelId,
} from '@/lib/ai-sdk/openrouter';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';

async function titleHandler(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			messages: incomingMessages,
            model,
            model_override,
		} = body;

		const supabase = createRouteHandlerClient(request);

		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return new Response(JSON.stringify({ error: 'Please log in first' }), {
				status: 401,
			});
		}

		let apiKey =
			process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY;
		if (!apiKey) {
			return new Response(
				JSON.stringify({ error: 'OpenRouter API key not configured' }),
				{ status: 500 },
			);
		}

		let selectedModel = await getDefaultModelId(
			typeof model === 'string' ? model : undefined,
		);
        if (typeof model_override === 'string' && model_override.trim().length > 0) {
            selectedModel = model_override;
        }

		const openrouter = createOpenRouterProvider(apiKey);

		const sanitizedIncoming: any[] = Array.isArray(incomingMessages)
			? (incomingMessages as UIMessage[]).map((m: any) => ({
					role: m.role,
					parts: Array.isArray(m.parts)
						? m.parts.filter(
								(p: any) =>
									p?.type === 'text' ||
									p?.type === 'file' ||
									p?.type === 'reasoning',
						  )
						: [],
			  }))
			: [];

		const uiMessages: any[] = [
			{ role: 'system', parts: [{ type: 'text', text: `${SYSTEM_PROMPT}` }] },
			...sanitizedIncoming,
			{
				role: 'user',
				parts: [
					{
						type: 'text',
						text: 'Generate a concise conversation title (4–8 words) that captures the main topic of this first exchange. Use Title Case, avoid punctuation, avoid generic phrases like "Chat" or "Conversation". Return ONLY JSON that matches the schema.',
					},
				],
			},
		];

		const messages = convertToModelMessages(uiMessages);

        console.log('[DEBUG] Title model', selectedModel);
        const { object } = await generateObject({
			model: openrouter.chat(selectedModel),
			schema: jsonSchema<{ title: string }>({
				type: 'object',
				properties: {
					title: { type: 'string' },
				},
				required: ['title'],
			}),
			schemaName: 'ConversationTitle',
			schemaDescription: 'Short descriptive title for the conversation',
			messages,
		});

		let title: string = typeof object?.title === 'string' ? object.title : '';
		title = title.trim();
		if (!title) {
			return new Response(
				JSON.stringify({ error: 'Failed to generate title' }),
				{ status: 500 },
			);
		}

		// Normalize: clamp length and strip trailing punctuation
		title = title.replace(/[.!?\s]+$/, '');
		if (title.length > 80) title = title.substring(0, 80);

		return new Response(JSON.stringify({ title }), { status: 200 });
	} catch (error) {
		console.error('Session title API error:', error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Internal server error',
			}),
			{ status: 500 },
		);
	}
}

export const POST = rateLimitMiddleware(titleHandler);
