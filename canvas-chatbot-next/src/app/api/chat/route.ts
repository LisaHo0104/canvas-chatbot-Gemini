import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { decrypt } from '@/lib/crypto';
import { createCanvasTools } from '@/lib/canvas-tools';
import { AIProviderService } from '@/lib/ai-provider-service';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { createOpenRouterProvider } from '@/lib/ai-sdk/openrouter';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { getDefaultModelId } from '@/lib/ai-sdk/openrouter';

async function chatHandler(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			query,
			history = [],
			canvas_token,
			canvas_url,
			provider_id,
			model,
			model_override,
			messages: incomingMessages,
		} = body;

		const lastUserTextFromMessages = Array.isArray(incomingMessages)
			? String(
					(incomingMessages as UIMessage[])
						.slice()
						.reverse()
						.find((m) => m.role === 'user')
						?.parts.filter((p: any) => p.type === 'text')
						.map((p: any) => String(p.text || ''))
						.join('') || '',
			  )
			: '';

		const effectiveQuery =
			typeof query === 'string' && query.trim().length > 0
				? query
				: lastUserTextFromMessages;

		if (!incomingMessages && !effectiveQuery) {
			return new Response(
				JSON.stringify({ error: 'Missing messages or query in request body' }),
				{ status: 400 },
			);
		}

		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					getAll() {
						return request.cookies.getAll();
					},
					setAll(cookiesToSet) {
						cookiesToSet.forEach(({ name, value, options }) => {
							request.cookies.set(name, value);
						});
					},
				},
			},
		);

		// Get current user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return new Response(JSON.stringify({ error: 'Please log in first' }), {
				status: 401,
			});
		}

		let canvasApiKey: string;
		let canvasApiUrl: string;
		if (canvas_token && canvas_url) {
			canvasApiKey = canvas_token;
			canvasApiUrl = canvas_url;
		} else {
			const { data: userData, error: userError } = await supabase
				.from('profiles')
				.select('canvas_api_key_encrypted, canvas_api_url')
				.eq('id', user.id)
				.single();
			if (
				userError ||
				!userData?.canvas_api_key_encrypted ||
				!userData?.canvas_api_url
			) {
				return new Response(
					JSON.stringify({
						error: 'Please configure your Canvas API credentials first',
					}),
					{ status: 400 },
				);
			}
			try {
				canvasApiKey = decrypt(userData.canvas_api_key_encrypted);
				canvasApiUrl = userData.canvas_api_url;
			} catch (error) {
				return new Response(
					JSON.stringify({ error: 'Failed to decrypt Canvas API key' }),
					{ status: 500 },
				);
			}
		}

		const tools = createCanvasTools(canvasApiKey, canvasApiUrl);

		// Generate AI response
		let aiResponse;
		const sessionIdHeader = request.headers.get('x-session-id') || '';
		if (!sessionIdHeader || sessionIdHeader === 'default') {
			return new Response(JSON.stringify({ error: 'Session ID is required' }), {
				status: 400,
			});
		}
		const sessionId = sessionIdHeader;

		let apiKey =
			process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY;
		if (!apiKey) {
			return new Response(
				JSON.stringify({ error: 'OpenRouter API key not configured' }),
				{ status: 500 },
			);
		}
		let selectedModel = getDefaultModelId(
			typeof model === 'string' ? model : undefined,
		);
		if (provider_id) {
			const providerService = new AIProviderService();
			try {
				const providers = await providerService.getUserProviders(user.id);
				const picked = providers.find((p: any) => p.id === provider_id);
				if (picked) {
					apiKey = decrypt(picked.api_key_encrypted);
					selectedModel =
						typeof model_override === 'string' &&
						model_override.trim().length > 0
							? model_override
							: picked.model_name;
				}
			} catch {}
		}

		const openrouter = createOpenRouterProvider(apiKey);

		const uiMessages: UIMessage[] = Array.isArray(incomingMessages)
			? [
					{
						role: 'system',
						parts: [
							{
								type: 'text',
								text: `${SYSTEM_PROMPT}`,
							},
						],
					},
					...incomingMessages,
			  ]
			: [
					{
						role: 'system',
						parts: [
							{
								type: 'text',
								text: `${SYSTEM_PROMPT}`,
							},
						],
					},
					...history.map((m: any) => ({
						role: m.role,
						parts: [{ type: 'text', text: String(m.parts ?? '') }],
					})),
					{
						role: 'user',
						parts: [{ type: 'text', text: String(effectiveQuery) }],
					},
			  ];

		const messages = convertToModelMessages(uiMessages);

		const result = streamText({
			model: openrouter.chat(selectedModel),
			messages,
			tools,
			toolChoice: 'auto',
			stopWhen: stepCountIs(3),
		});

		return result.toUIMessageStreamResponse({ sendReasoning: true });
	} catch (error) {
		console.error('Chat API error:', error);
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Internal server error',
			}),
			{ status: 500 },
		);
	}
}

// Apply rate limiting
export const POST = rateLimitMiddleware(chatHandler);
