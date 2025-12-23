import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { createCanvasTools } from '@/lib/canvas-tools';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';
import {
	convertToModelMessages,
	type UIMessage,
	smoothStream,
	ToolLoopAgent,
} from 'ai';
import { createOpenRouterProvider } from '@/lib/ai-sdk/openrouter';
import { getDefaultModelId } from '@/lib/ai-sdk/openrouter';
import { tavilySearch } from '@tavily/ai-sdk';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';

export const maxDuration = 300;
export const runtime = 'nodejs';

async function chatHandler(request: NextRequest) {
	try {
		const body = await request.json();
		const { model, messages: incomingMessages, canvasContext } = body;

		if (
			!incomingMessages ||
			!Array.isArray(incomingMessages) ||
			incomingMessages.length === 0
		) {
			return new Response(
				JSON.stringify({ error: 'Missing messages in request body' }),
				{ status: 400 },
			);
		}

		// Extract the text content of the last user message for processing
		const currentMessageContent = String(
			(incomingMessages as UIMessage[])
				.slice()
				.reverse()
				.find((m) => m.role === 'user')
				?.parts.filter((p: any) => p.type === 'text')
				.map((p: any) => String(p.text || ''))
				.join('') || '',
		);

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
			} catch {
				return new Response(
					JSON.stringify({ error: 'Failed to decrypt Canvas API key' }),
					{ status: 500 },
				);
			}
		}

		const canvasTools =
			canvasApiKey && canvasApiUrl
				? createCanvasTools(canvasApiKey, canvasApiUrl)
				: {};

		const tavilyTool = tavilySearch();
		console.log('[DEBUG] Initializing tools: webSearch enabled with strict mode');
		const tools = {
			...canvasTools,
			webSearch: {
				...tavilyTool,
				strict: true,
				description:
					'Search the web for up-to-date facts and sources when Canvas data is insufficient',
			},
		};

		const shouldUseCanvasTools = Boolean(canvasApiKey && canvasApiUrl);

		// Generate AI response
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

		const apiKey =
			process.env.OPENROUTER_API_KEY_OWNER || process.env.OPENROUTER_API_KEY;
		if (!apiKey) {
			return new Response(
				JSON.stringify({ error: 'OpenRouter API key not configured' }),
				{ status: 500 },
			);
		}
		const selectedModel = await getDefaultModelId(
			typeof model === 'string' ? model : undefined,
		);

		const openrouter = createOpenRouterProvider(apiKey);

		// We pass the incoming messages directly to convertToModelMessages.
		// The AI SDK's convertToModelMessages function handles the conversion of UI messages
		// (including tool invocations, text, files, etc.) into the format required by the model.
		// Manual filtering is unnecessary and can cause issues (e.g. missing tool contexts).
		const uiMessages = incomingMessages;

		const formatCanvasContext = (ctx: any): string => {
			try {
				if (!ctx || !Array.isArray(ctx?.courses)) return '';
				const lines: string[] = [];
				lines.push('[Canvas Context]');
				lines.push(`User is enrolled in ${ctx.courses.length} courses:`);
				lines.push('');
				for (const course of ctx.courses.slice(0, 20)) {
					lines.push(`${course.name} (${course.code})`);
					const assigns = Array.isArray(course.assignments) ? course.assignments.slice(0, 30) : [];
					const mods = Array.isArray(course.modules) ? course.modules.slice(0, 30) : [];
					if (assigns.length > 0) {
						lines.push(`  - Assignments: ${assigns.map((a: any) => `${a.name} (ID:${a.id})`).join(', ')}`);
					} else {
						lines.push(`  - Assignments: none`);
					}
					if (mods.length > 0) {
						lines.push(`  - Modules: ${mods.map((m: any) => `${m.name} (ID:${m.id})`).join(', ')}`);
					} else {
						lines.push(`  - Modules: none`);
					}
					lines.push('');
				}
				return lines.join('\n');
			} catch {
				return '';
			}
		};

		const systemText =
			typeof canvasContext !== 'undefined' && canvasContext
				? `${SYSTEM_PROMPT}\n\n${formatCanvasContext(canvasContext)}`
				: SYSTEM_PROMPT;

		const uiMessagesWithSystem: UIMessage[] = [
			{ role: 'system', parts: [{ type: 'text', text: systemText }] } as any,
			...(uiMessages as UIMessage[]),
		];

		const messages = convertToModelMessages(uiMessagesWithSystem as UIMessage[]);

		const cjkRegex = /[\u4E00-\u9FFF]/;
		const jpRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
		let chunking: 'word' | 'line' | RegExp = 'word';
		const requestedChunking = (body as any)?.smooth_chunking;
		if (requestedChunking === 'line' || requestedChunking === 'word') {
			chunking = requestedChunking;
		}
		const eq = String(currentMessageContent || '');
		if (jpRegex.test(eq)) {
			chunking = /[\u3040-\u309F\u30A0-\u30FF]|\S+\s+/;
		} else if (cjkRegex.test(eq)) {
			chunking = /[\u4E00-\u9FFF]|\S+\s+/;
		}
		const delayInMs: number | null =
			typeof (body as any)?.smooth_delay_ms === 'number'
				? (body as any).smooth_delay_ms
				: 20;
		const agent = new ToolLoopAgent({
			model: openrouter.chat(selectedModel),
			tools,
			prepareStep: async ({ messages, stepNumber, steps }) => {
				console.log(
					`[DEBUG] Step ${stepNumber}: Input messages count: ${messages.length}`,
				);
				const contextUpdate =
					messages.length > 20
						? { messages: [messages[0], ...messages.slice(-10)] }
						: {};

				const simplifyContent = (content: any) => {
					if (typeof content === 'string') {
						return '[String Content]';
					}
					if (Array.isArray(content)) {
						return content.map((part: any) => {
							if (part.type === 'text') {
								return {
									type: 'text',
									meta: `Length: ${part.text.length}`,
								};
							}
							if (part.type === 'tool-call') {
								return {
									type: 'tool-call',
									toolName: part.toolName,
									callId: part.toolCallId,
								};
							}
							if (part.type === 'tool-result') {
								return {
									type: 'tool-result',
									toolName: part.toolName,
									callId: part.toolCallId,
									isError: !!part.isError,
								};
							}
							return { type: part.type };
						});
					}
					return '[Unknown Content Type]';
				};

				if (contextUpdate.messages) {
					console.log(
						`[DEBUG] Step ${stepNumber}: Context truncated. Keeping system message + last 10 messages.`,
					);
					console.log(
						'[DEBUG] Truncated Context Messages:',
						JSON.stringify(
							contextUpdate.messages.map((m: any) => ({
								role: m.role,
								content: simplifyContent(m.content),
							})),
							null,
							2,
						),
					);
				} else {
					console.log(
						'[DEBUG] Full Context Messages (No Truncation):',
						JSON.stringify(
							messages.map((m: any) => ({
								role: m.role,
								content: simplifyContent(m.content),
							})),
							null,
							2,
						),
					);
				}

				if (!shouldUseCanvasTools || !tools) return contextUpdate;

				return contextUpdate;
			},
		});

		const result = await agent.stream({
			messages,
			experimental_transform: smoothStream({
				delayInMs,
				chunking,
			}),
		});

		console.log('[DEBUG] Using model', selectedModel);
		const response = result.toUIMessageStreamResponse({
			originalMessages: uiMessages,
			sendReasoning: true,
			sendSources: true,
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
							// assistantText variable removed as it was unused

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
								JSON.stringify(
									messagesToInsert.map((m) => ({
										id: m.id,
										role: m.role,
										session_id: m.session_id,
										parts_count: m.ui_parts.length,
										parts_summary: m.ui_parts.map((p: any) => {
											if (p.type === 'text') return `text(${p.text.length})`;
											if (p.type === 'tool-invocation')
												return `tool(${p.toolName})`;
											return p.type;
										}),
									})),
									null,
									2,
								),
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
