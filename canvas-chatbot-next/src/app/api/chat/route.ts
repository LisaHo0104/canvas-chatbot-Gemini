import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { createCanvasTools } from '@/lib/canvas-tools';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';
import {
	streamText,
	convertToModelMessages,
	stepCountIs,
	type UIMessage,
	smoothStream,
} from 'ai';
import { createOpenRouterProvider } from '@/lib/ai-sdk/openrouter';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { getDefaultModelId } from '@/lib/ai-sdk/openrouter';

export const maxDuration = 300;
export const runtime = 'nodejs';

async function chatHandler(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			query,
			history = [],
			canvas_token,
			canvas_url,
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

		const supabase = createRouteHandlerClient(request);

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

		const tools: ReturnType<typeof createCanvasTools> | undefined =
			canvasApiKey && canvasApiUrl
				? createCanvasTools(canvasApiKey, canvasApiUrl)
				: undefined;

		const shouldUseCanvasTools = Boolean(canvasApiKey && canvasApiUrl);

		// Generate AI response
		let aiResponse;
		const sessionIdHeader = request.headers.get('x-session-id') || '';
		let sessionId =
			sessionIdHeader && sessionIdHeader !== 'default'
				? sessionIdHeader
				: typeof (body as any)?.session_id === 'string'
				? (body as any).session_id
				: 'default';

		if (sessionId === 'default') {
			const { data: newSession } = await supabase
				.from('chat_sessions')
				.insert({ user_id: user.id, title: 'New Chat' })
				.select('id')
				.single();
			if (newSession) {
				sessionId = newSession.id;
			}
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

		const cjkRegex = /[\u4E00-\u9FFF]/;
		const jpRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
		let chunking: 'word' | 'line' | RegExp = 'word';
		const eq = String(effectiveQuery || '');
		if (jpRegex.test(eq)) {
			chunking = /[\u3040-\u309F\u30A0-\u30FF]|\S+\s+/;
		} else if (cjkRegex.test(eq)) {
			chunking = /[\u4E00-\u9FFF]|\S+\s+/;
		}
		const delayInMs = 10;
		const result = streamText({
			model: openrouter.chat(selectedModel),
			messages,
			tools,
			toolChoice: shouldUseCanvasTools ? 'auto' : 'none',
			experimental_transform: smoothStream({
				delayInMs,
				chunking,
			}),
			stopWhen: stepCountIs(80),
			prepareStep: async ({ stepNumber, steps }) => {
				if (!shouldUseCanvasTools || !tools) return;
				if (stepNumber === 0) return;
				const prev = steps?.[stepNumber - 1] as any;
				const prevCalls = Array.isArray(prev?.toolCalls) ? prev.toolCalls : [];
				const names = prevCalls.map((c: any) => String(c.toolName || ''));
				const prevResults = Array.isArray(prev?.toolResults)
					? prev.toolResults
					: [];
				const q = String(effectiveQuery || '').toLowerCase();
				const needAssignments = /assignments?/.test(q);
				const needGrade = /(grade|score|points|graded)/.test(q);
				const needFeedback = /(feedback|rubric|comments?)/.test(q);
				const needModules = /modules?/.test(q);
				const needPage = /(page|content)/.test(q);
				const hasGrade = prevResults.some(
					(r: any) =>
						r?.result && (r.result.grade != null || r.result.score != null),
				);
				const hasFeedback = prevResults.some(
					(r: any) =>
						r?.result &&
						(Array.isArray(r.result?.rubric) ||
							Array.isArray(r.result?.submissionComments)),
				);
				if (names.includes('list_courses')) {
					if (needGrade || needFeedback || needAssignments) {
						return {
							toolChoice: 'required',
							activeTools: ['get_assignments'] as any,
						} as any;
					}
					if (needModules || needPage) {
						return {
							toolChoice: 'required',
							activeTools: ['get_modules'] as any,
						} as any;
					}
					return;
				}
				if (names.includes('get_assignments')) {
					if (needGrade || needFeedback) {
						return {
							toolChoice: 'required',
							activeTools: ['get_assignment_grade'] as any,
						} as any;
					}
					return;
				}
				if (names.includes('get_assignment_grade')) {
					if (hasGrade && !needFeedback) return;
					if (needFeedback) {
						return {
							toolChoice: 'required',
							activeTools: ['get_assignment_feedback_and_rubric'] as any,
						} as any;
					}
					return;
				}
				if (names.includes('get_assignment_feedback_and_rubric')) {
					if (hasFeedback) return;
					if (needModules || needPage) {
						return {
							toolChoice: 'required',
							activeTools: ['get_modules'] as any,
						} as any;
					}
					return;
				}
				if (names.includes('get_modules')) {
					if (needPage) {
						return {
							toolChoice: 'required',
							activeTools: ['get_page_content'] as any,
						} as any;
					}
					return;
				}
			},
			onError: (err: any) => {
				console.error('Stream error:', err);
			},
		});

        console.log('[DEBUG] Using model', selectedModel);
        const response = result.toUIMessageStreamResponse({
			originalMessages: uiMessages,
			sendReasoning: true,
			onFinish: async ({ messages }) => {
				console.log('[DEBUG] onFinish triggered', {
					sessionId,
					messageCount: messages.length,
				});
				try {
					if (sessionId && sessionId !== 'default') {
						// Find the last user message and the generated assistant message
						// We iterate from the end to find the latest interaction
						const lastUserMessage = [...messages]
							.reverse()
							.find((m) => m.role === 'user');
						const lastAssistantMessage = [...messages]
							.reverse()
							.find((m) => m.role === 'assistant');

						console.log('[DEBUG] Messages found:', {
							hasUserMessage: !!lastUserMessage,
							hasAssistantMessage: !!lastAssistantMessage,
						});

						if (lastUserMessage && lastAssistantMessage) {
							const userText = lastUserMessage.parts
								.filter((p: any) => p.type === 'text')
								.map((p: any) => (p as any).text || '')
								.join('');
							const assistantText = lastAssistantMessage.parts
								.filter((p: any) => p.type === 'text')
								.map((p: any) => (p as any).text || '')
								.join('');

							const messagesToInsert = [
								{
									id: randomUUID(),
									user_id: user.id,
									session_id: sessionId,
									role: 'user',
									ui_parts: lastUserMessage.parts,
									metadata: {},
								},
								{
									id: randomUUID(),
									user_id: user.id,
									session_id: sessionId,
									role: 'assistant',
									ui_parts: lastAssistantMessage.parts,
                                metadata: {
                                        provider_type: 'system',
                                },
								},
							];

							console.log(
								'[DEBUG] Attempting to insert messages:',
								JSON.stringify(messagesToInsert, null, 2),
							);

							const { error: insertError } = await supabase
								.from('chat_messages')
								.insert(messagesToInsert);

							if (!insertError) {
								console.log('[DEBUG] Messages persisted successfully');
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
								console.error('[DEBUG] Persist messages error:', insertError);
							}
						}
					} else {
						console.log(
							'[DEBUG] Skipping persistence: Invalid session ID',
							sessionId,
						);
					}
				} catch (persistError) {
					console.error('[DEBUG] Server-side persistence error:', persistError);
				}
			},
		});

		if (sessionId) {
			response.headers.set('x-session-id', sessionId);
		}

		return response;
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
