import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { decrypt } from '@/lib/crypto';
import { createCanvasTools } from '@/lib/canvas-tools';
import { AIProviderService } from '@/lib/ai-provider-service';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import {
	streamText,
	convertToModelMessages,
	stepCountIs,
	type UIMessage,
} from 'ai';
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
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
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

		let canvasApiKey: string | undefined;
		let canvasApiUrl: string | undefined;
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
				!userError &&
				userData?.canvas_api_key_encrypted &&
				userData?.canvas_api_url
			) {
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
		}

		const tools =
			canvasApiKey && canvasApiUrl
				? createCanvasTools(canvasApiKey, canvasApiUrl)
				: {};

		// Generate AI response
		let aiResponse;
		const sessionIdHeader = request.headers.get('x-session-id') || '';
		const sessionId =
			sessionIdHeader && sessionIdHeader !== 'default'
				? sessionIdHeader
				: typeof (body as any)?.session_id === 'string'
				? (body as any).session_id
				: 'default';

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

		const uiMessages: any[] =
			sanitizedIncoming.length > 0
				? [
						{
							role: 'system',
							parts: [{ type: 'text', text: `${SYSTEM_PROMPT}` }],
						},
						...sanitizedIncoming,
				  ]
				: [
						{
							role: 'system',
							parts: [{ type: 'text', text: `${SYSTEM_PROMPT}` }],
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

		const stepsLog: any[] = [];
		const result = streamText({
			model: openrouter.chat(selectedModel),
			messages,
			tools,
			toolChoice: 'auto',
			stopWhen: stepCountIs(60),
			onStepFinish: (step: any) => {
				try {
					stepsLog.push({
						toolCalls: step?.toolCalls ?? [],
						toolResults: step?.toolResults ?? [],
						text: step?.text ?? '',
					});
				} catch {}
			},
			onFinish: async ({ text }: any) => {
				try {
					const userText = String(effectiveQuery || '');
					const assistantText = String(text || '');
					if (sessionId && sessionId !== 'default' && userText) {
						const { error: insertError } = await supabase
							.from('chat_messages')
							.insert([
								{
									user_id: user.id,
									session_id: sessionId,
									role: 'user',
									content: userText,
									metadata: null,
								},
								{
									user_id: user.id,
									session_id: sessionId,
									role: 'assistant',
									content: assistantText,
									metadata: {
										provider_id: provider_id || null,
										provider_type: 'configured',
										steps_log: stepsLog,
									},
								},
							]);

						if (!insertError) {
							const { data: sessionRow } = await supabase
								.from('chat_sessions')
								.select('title')
								.eq('id', sessionId)
								.single();

							const currentTitle = String(sessionRow?.title || '');
							if (!currentTitle || currentTitle === 'New Chat') {
								const newTitleBase = userText.substring(0, 50);
								const newTitle =
									newTitleBase + (userText.length > 50 ? '...' : '');
								await supabase
									.from('chat_sessions')
									.update({ title: newTitle })
									.eq('id', sessionId);
							}
						} else {
							console.error('Persist messages error:', insertError);
						}
					}
				} catch (persistError) {
					console.error('Server-side persistence error:', persistError);
				}
			},
			onError: (err: any) => {
				console.error('Stream error:', err);
			},
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
