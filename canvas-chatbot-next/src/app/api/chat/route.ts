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
import { CanvasContextService, type CanvasContextAttachment } from '@/lib/canvas-context';

export const maxDuration = 300;
export const runtime = 'nodejs';

async function chatHandler(request: NextRequest) {
	let modelName: string | undefined;
	try {
		const body = await request.json();
		const { model, messages: incomingMessages, mode, selected_system_prompt_ids } = body;
		modelName = typeof model === 'string' ? model : undefined;
		// Support both canvasContext and selected_context (frontend sends selected_context)
		const canvasContext = (body as any).canvasContext || (body as any).selected_context;
		// Backward compatibility: support old analysisMode parameter
		const analysisMode = mode || (body as any).analysisMode;

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
		const lastUserMessage = (incomingMessages as UIMessage[])
			.slice()
			.reverse()
			.find((m) => m.role === 'user');
		
		const currentMessageContent = String(
			lastUserMessage
				?.parts.filter((p: any) => p.type === 'text')
				.map((p: any) => String(p.text || ''))
				.join('') || '',
		);

		// Extract context attachments from the last user message
		const contextAttachments: CanvasContextAttachment[] = lastUserMessage
			?.parts.filter((p: any) => p.type === 'context')
			.map((p: any) => p.context as CanvasContextAttachment)
			|| [];

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

		// Fetch user's system prompts from database
		let activeSystemPrompt = SYSTEM_PROMPT; // Fallback to default
		try {
			// If selected_system_prompt_ids are provided in the request, use those
			// Otherwise, fall back to the old behavior (current_system_prompt_id)
			if (selected_system_prompt_ids && Array.isArray(selected_system_prompt_ids) && selected_system_prompt_ids.length > 0) {
				// Fetch multiple system prompts
				const { data: systemPrompts, error: promptsError } = await supabase
					.from('system_prompts')
					.select('id, name, prompt_text, is_template, user_id')
					.in('id', selected_system_prompt_ids);

				if (!promptsError && systemPrompts && systemPrompts.length > 0) {
					// Filter to only accessible prompts (templates or user's own)
					const accessiblePrompts = systemPrompts.filter(
						(p) => p.is_template || p.user_id === user.id
					);

					if (accessiblePrompts.length > 0) {
						// Combine multiple prompts with separators
						if (accessiblePrompts.length === 1) {
							activeSystemPrompt = accessiblePrompts[0].prompt_text;
						} else {
							activeSystemPrompt = accessiblePrompts
								.map((p) => `=== ${p.name} ===\n\n${p.prompt_text}`)
								.join('\n\n---\n\n');
						}
					}
				}
			} else {
				// Fallback to old behavior: use current_system_prompt_id
				const { data: contextSelection } = await supabase
					.from('user_context_selections')
					.select('current_system_prompt_id')
					.eq('user_id', user.id)
					.single();

				if (contextSelection?.current_system_prompt_id) {
					const { data: systemPrompt } = await supabase
						.from('system_prompts')
						.select('prompt_text, is_template, user_id')
						.eq('id', contextSelection.current_system_prompt_id)
						.single();

					// Verify access: templates are accessible by all, user prompts only by owner
					if (systemPrompt && (systemPrompt.is_template || systemPrompt.user_id === user.id)) {
						activeSystemPrompt = systemPrompt.prompt_text;
					}
				}
			}
		} catch (error) {
			console.error('Error fetching user system prompt, using default:', error);
			// Continue with default SYSTEM_PROMPT if fetch fails
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
		
		// Conditionally restrict tools for rubric mode
		// If rubric mode is active and analyze_rubric hasn't been called yet, only provide analyze_rubric
		// This will be checked dynamically in prepareStep, but we prepare the base tools here
		const baseTools = {
			...canvasTools,
			webSearch: {
				...tavilyTool,
				strict: true,
				description:
					'Search the web for up-to-date facts and sources when Canvas data is insufficient',
			},
		};
		
		const tools = baseTools;

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

		// Extract assignment info from context attachments for rubric analysis
		const assignmentAttachments = contextAttachments.filter(
			(att) => att.type === 'assignment'
		);
		
		// Find assignment details from canvas context or attachments
		const findTargetAssignment = (): { courseId: number; assignmentId: number } | null => {
			if (analysisMode === 'rubric' && assignmentAttachments.length > 0) {
				const assignmentAttachment = assignmentAttachments[0];
				const assignmentId = assignmentAttachment.id;
				
				// First, try to get courseId from the attachment itself (if stored)
				if ((assignmentAttachment as any).course_id && typeof (assignmentAttachment as any).course_id === 'number') {
					return {
						courseId: (assignmentAttachment as any).course_id,
						assignmentId: assignmentId,
					};
				}
				
				// Fallback: find the assignment in canvas context
				if (canvasContext && canvasContext.courses && Array.isArray(canvasContext.courses)) {
					for (const course of canvasContext.courses) {
						if (course.assignments && Array.isArray(course.assignments)) {
							const assignment = course.assignments.find(
								(a: any) => a.id === assignmentId
							);
							if (assignment) {
								return {
									courseId: course.id,
									assignmentId: assignment.id,
								};
							}
						}
					}
				}
			}
			return null;
		};
		
		const targetAssignment = findTargetAssignment();

		// Format Canvas context using the clean template-based formatter
		const formattedContext = CanvasContextService.formatAttachedContext(
			canvasContext,
			contextAttachments
		);

		// Build context information from attachments when canvasContext is missing but attachments exist
		const buildContextFromAttachments = (attachments: CanvasContextAttachment[]): string => {
			if (attachments.length === 0) return '';
			
			const courses = attachments.filter((a) => a.type === 'course');
			const assignments = attachments.filter((a) => a.type === 'assignment');
			const modules = attachments.filter((a) => a.type === 'module');
			
			const parts: string[] = ['\n\n📚 ATTACHED CONTEXT ITEMS:'];
			
			if (courses.length > 0) {
				parts.push('   📚 Courses:');
				courses.forEach((c) => {
					parts.push(`      - Course ID: ${c.id}, Name: "${c.name}"${c.code ? `, Code: ${c.code}` : ''}`);
				});
			}
			
			if (assignments.length > 0) {
				parts.push('   📝 Assignments:');
				assignments.forEach((a) => {
					const courseId = (a as any).course_id;
					if (courseId) {
						parts.push(`      - Assignment ID: ${a.id}, Name: "${a.name}", Course ID: ${courseId}`);
					} else {
						parts.push(`      - Assignment ID: ${a.id}, Name: "${a.name}"`);
					}
				});
			}
			
			if (modules.length > 0) {
				parts.push('   📦 Modules:');
				modules.forEach((m) => {
					const courseId = (m as any).course_id;
					if (courseId) {
						parts.push(`      - Module ID: ${m.id}, Name: "${m.name}", Course ID: ${courseId}`);
					} else {
						parts.push(`      - Module ID: ${m.id}, Name: "${m.name}"`);
					}
				});
			}
			
			parts.push('\n⚠️ IMPORTANT: Use Canvas tools to fetch detailed content for these attached items.');
			parts.push('   - For assignments: Use get_assignment(courseId, assignmentId)');
			parts.push('   - For modules: Use get_module(courseId, moduleId) or get_modules(courseId)');
			parts.push('   - For courses: Use get_modules(courseId) to get all modules');
			
			return parts.join('\n');
		};

		// Build context info from attachments if formattedContext is empty but attachments exist
		const contextFromAttachments = (!formattedContext && contextAttachments.length > 0)
			? buildContextFromAttachments(contextAttachments)
			: '';

		// Inject tool call instructions programmatically (hidden from static prompts)
		let toolUsageInstructions = '';
		
		// General tool usage instructions
		if (shouldUseCanvasTools) {
			toolUsageInstructions = `\n\n**TOOL USAGE INSTRUCTIONS:**
- Web Search: For topics/facts not in Canvas data, call 'webSearch' with concise queries. Synthesize findings with source links.
- Summaries: When summarizing modules, call tools in sequence: list_courses → get_modules → get_page_contents (for multiple pages at once)/get_file/get_file_text for all items. Retrieve ALL items before producing Pareto summary.
- Always provide comprehensive, student-friendly explanations after tool calls. Never return raw JSON. Synthesize into clear guidance with clickable links.`;
		}

		// Enhance system prompt when rubric mode is active
		let rubricEnforcementPrompt = '';
		if (analysisMode === 'rubric') {
			if (targetAssignment) {
				rubricEnforcementPrompt = `\n\n⚠️ CRITICAL: RUBRIC MODE IS ACTIVE
			
You MUST follow this sequence:
1. Call 'analyze_rubric' tool immediately with:
   - courseId: ${targetAssignment.courseId}
   - assignmentId: ${targetAssignment.assignmentId}

2. After receiving the rubric data, systematically analyze it following the framework:
   - Map ratings to grade levels (HD/D/C/P/F)
   - Identify requirements for each grade level
   - Generate common mistakes
   - Create actionable checklist items
   - Calculate scoring breakdown

3. Call 'provide_rubric_analysis' with the complete analyzed structure matching RubricAnalysisOutput format.

This sequence is REQUIRED. Do not skip any step. The provide_rubric_analysis tool is essential for rendering the generative UI component.`;
			} else if (contextAttachments.length > 0) {
				// If rubric mode is active but we don't have target assignment yet, 
				// provide context about attached items so LLM can find the assignment
				const assignmentAttachments = contextAttachments.filter((a) => a.type === 'assignment');
				if (assignmentAttachments.length > 0) {
					const assignmentList = assignmentAttachments.map((a) => {
						const courseId = (a as any).course_id;
						return courseId 
							? `Assignment ID: ${a.id}, Name: "${a.name}", Course ID: ${courseId}`
							: `Assignment ID: ${a.id}, Name: "${a.name}"`;
					}).join('\n      - ');
					
					rubricEnforcementPrompt = `\n\n⚠️ CRITICAL: RUBRIC MODE IS ACTIVE
			
The user has attached assignment(s) for rubric analysis:
   - ${assignmentList}

You MUST:
1. First, identify the assignment the user wants to analyze (from the attached assignments above)
2. If you need the courseId, use the information provided in the context below or call get_assignment to find it
3. Call 'analyze_rubric' tool with the correct courseId and assignmentId
4. After receiving the rubric data, systematically analyze it following the framework
5. Call 'provide_rubric_analysis' with the complete analyzed structure

This sequence is REQUIRED. The provide_rubric_analysis tool is essential for rendering the generative UI component.`;
				} else {
					rubricEnforcementPrompt = `\n\n⚠️ CRITICAL: RUBRIC MODE IS ACTIVE
			
The user has enabled rubric mode. You need to:
1. Identify which assignment the user wants to analyze (check attached context items below)
2. Call 'analyze_rubric' tool with the correct courseId and assignmentId
3. After receiving the rubric data, systematically analyze it
4. Call 'provide_rubric_analysis' with the complete analyzed structure

This sequence is REQUIRED. The provide_rubric_analysis tool is essential for rendering the generative UI component.`;
				}
			}
		}

		// Enhance system prompt when quiz mode is active
		let quizEnforcementPrompt = '';
		if (analysisMode === 'quiz' && (contextAttachments.length > 0 || canvasContext)) {
			// Check if we have context (courses, modules, or assignments)
			const hasContext = contextAttachments.some(
				(att: any) => att.type === 'course' || att.type === 'module' || att.type === 'assignment'
			) || (canvasContext && formattedContext);

			if (hasContext) {
				// Helper to find course_id for a module or assignment
				// First try from attachment object (if course_id was stored), then fallback to canvas context
				const findCourseId = (itemId: number, itemType: 'module' | 'assignment', attachment?: any): number | null => {
					// First check if course_id is already in the attachment object (from stored data)
					if (attachment?.course_id && typeof attachment.course_id === 'number') {
						return attachment.course_id;
					}
					// Fallback: search in canvas context
					if (!canvasContext?.courses || !Array.isArray(canvasContext.courses)) {
						return null;
					}
					for (const course of canvasContext.courses) {
						const items = itemType === 'module' ? course.modules : course.assignments;
						if (Array.isArray(items)) {
							const found = items.find((item: any) => item.id === itemId);
							if (found) {
								return course.id;
							}
						}
					}
					return null;
				};

				// Build explicit list of context attachments for the agent
				let contextAttachmentsList = '';
				if (contextAttachments.length > 0) {
					const courses = contextAttachments.filter((att: any) => att.type === 'course');
					const modules = contextAttachments.filter((att: any) => att.type === 'module');
					const assignments = contextAttachments.filter((att: any) => att.type === 'assignment');

					const parts: string[] = ['\n\n🎯 CONTEXT ATTACHMENTS PROVIDED BY USER:'];
					
					if (courses.length > 0) {
						parts.push('   📚 Courses:');
						courses.forEach((c: any) => {
							parts.push(`      - Course ID: ${c.id}, Name: "${c.name}"${c.code ? `, Code: ${c.code}` : ''}`);
						});
					}

					if (modules.length > 0) {
						parts.push('   📦 Modules:');
						modules.forEach((m: any) => {
							const courseId = findCourseId(m.id, 'module', m);
							if (courseId) {
								parts.push(`      - Module ID: ${m.id}, Name: "${m.name}", Course ID: ${courseId}`);
							} else {
								parts.push(`      - Module ID: ${m.id}, Name: "${m.name}" (Course ID: find from context below)`);
							}
						});
					}

					if (assignments.length > 0) {
						parts.push('   📝 Assignments:');
						assignments.forEach((a: any) => {
							const courseId = findCourseId(a.id, 'assignment', a);
							if (courseId) {
								parts.push(`      - Assignment ID: ${a.id}, Name: "${a.name}", Course ID: ${courseId}`);
							} else {
								parts.push(`      - Assignment ID: ${a.id}, Name: "${a.name}" (Course ID: find from context below)`);
							}
						});
					}

					parts.push('\n   DIRECT FETCHING INSTRUCTIONS (use EXACT IDs from the list above, do NOT fetch all courses/modules):');
					if (modules.length > 0) {
						// Extract course IDs from modules (they now include course_id in the list)
						const moduleCourseIds = modules.map((m: any) => {
							const courseId = findCourseId(m.id, 'module');
							return courseId;
						}).filter((id): id is number => id !== null);
						
						if (moduleCourseIds.length > 0 || courses.length > 0) {
							const allCourseIds = [...new Set([...courses.map((c: any) => c.id), ...moduleCourseIds])].join(' or ');
							const moduleIds = modules.map((m: any) => m.id).join(', ');
							parts.push(`   - For modules: PREFERRED - Use get_module(courseId: ${allCourseIds}, moduleId: ${moduleIds}) to directly fetch the specific module. The Course ID(s) ${allCourseIds} and Module ID(s) ${moduleIds} are DIFFERENT numbers - use BOTH parameters. If you need all modules, use get_modules(courseId: ${allCourseIds}) instead. Then retrieve that module's items (pages, files) using get_page_contents (for multiple pages at once) or get_file.`);
						} else {
							parts.push('   - For modules: PREFERRED - Use get_module(courseId, moduleId) to directly fetch the specific module. The Course ID and Module ID are shown in the list above - these are DIFFERENT numbers. Call get_module with BOTH the Course ID and Module ID. If you need all modules, use get_modules(courseId) with the Course ID instead. Then retrieve that module\'s items (pages, files) using get_page_contents (for multiple pages at once) or get_file.');
						}
					}
					if (assignments.length > 0) {
						// Extract course IDs from assignments (they now include course_id in the list)
						const assignmentCourseIds = assignments.map((a: any) => {
							const courseId = findCourseId(a.id, 'assignment');
							return courseId;
						}).filter((id): id is number => id !== null);
						
						if (assignmentCourseIds.length > 0 || courses.length > 0) {
							const allCourseIds = [...new Set([...courses.map((c: any) => c.id), ...assignmentCourseIds])].join(' or ');
							const assignmentIds = assignments.map((a: any) => a.id).join(', ');
							parts.push(`   - For assignments: Use get_assignment(courseId: ${allCourseIds}, assignmentId: ${assignmentIds}) with the Course ID(s) ${allCourseIds} and Assignment ID(s) ${assignmentIds} from the list above.`);
						} else {
							parts.push('   - For assignments: Use get_assignment(courseId, assignmentId) with the Course ID and Assignment ID from the list above. The Course ID is shown next to each assignment in the list.');
						}
					}
					if (courses.length > 0) {
						parts.push('   - For courses: Call get_modules(courseId) for the EXACT course ID listed above to get all modules for that specific course, then retrieve their content.');
					}
					
					contextAttachmentsList = parts.join('\n');
				}

				quizEnforcementPrompt = `\n\n⚠️ CRITICAL: QUIZ MODE IS ACTIVE${contextAttachmentsList}
				
You MUST follow this sequence:
1. **Gather Information:** DIRECTLY fetch ONLY the specific items listed in the context attachments above:
   ${contextAttachments.length > 0 ? `
   ⚠️ CRITICAL INSTRUCTIONS:
   - DO NOT call list_courses - the user has already attached specific items
   - DO NOT fetch all courses or all modules - use ONLY the EXACT IDs from the attachments list above
   - For attached modules: Get modules for the course (from formatted context), filter for the EXACT module ID, then get that module's items using get_page_contents (for multiple pages at once) or get_file
   - For attached assignments: Directly call get_assignment(courseId, assignmentId) with the EXACT assignment ID
   - For attached courses: Get modules for that EXACT course ID only using get_modules(courseId), then retrieve their content
   - Retrieve content ONLY from the specific attached items, not from all available courses/modules
   - If you need the courseId for a module, it should be available in the formatted context below` : `
   - If courses are provided: Use get_modules, get_page_contents (for multiple pages at once), get_file to retrieve content
   - If modules are provided: Use get_page_contents (for multiple pages at once), get_file to retrieve module content  
   - If assignments are provided: Use get_assignment to understand assignment content`}
   - Retrieve ALL relevant content from the attached items before proceeding

2. **Generate Plan:** After gathering information, you MUST call 'generate_quiz_plan' tool with:
   - sources: Object containing courses, modules, and/or assignments from the context (use the IDs from the attachments list above)
   - questionCount: Total number of questions (typically 5-20, adjust based on content scope)
   - questionTypes: Breakdown of question types (multipleChoice, trueFalse, shortAnswer)
   - topics: Array of topics that will be covered
   - difficulty: Estimated difficulty level (easy, medium, hard, or mixed)
   - userPrompt: The user's specific requirements or prompt (if provided)

3. **Wait for Approval:** After calling generate_quiz_plan, STOP and wait for user approval. Do NOT generate quiz questions yet.

4. **Generate Quiz:** Once the user approves the plan (you will receive an approval response):
   - Generate questions from the approved sources following the plan
   - Create questions that test understanding, not just memorization
   - Provide clear, detailed explanations for each answer
   - Include source references when possible

5. **Output:** After generating all questions, you MUST call 'provide_quiz_output' with the complete quiz structure matching QuizOutput format.

This sequence is REQUIRED. Do not skip any step. The generate_quiz_plan and provide_quiz_output tools are essential for the quiz generation workflow.`;
			}
		}

		// Include context in system prompt if:
		// 1. formattedContext exists (from canvasContext with courses), OR
		// 2. contextFromAttachments exists (when attachments exist but canvasContext is missing)
		const contextToInclude = formattedContext || contextFromAttachments;
		
		const systemText = contextToInclude
			? `${activeSystemPrompt}${toolUsageInstructions}${rubricEnforcementPrompt}${quizEnforcementPrompt}\n\n${contextToInclude}`
			: `${activeSystemPrompt}${toolUsageInstructions}${rubricEnforcementPrompt}${quizEnforcementPrompt}`;

		const uiMessagesWithSystem: UIMessage[] = [
			{ role: 'system', parts: [{ type: 'text', text: systemText }] } as any,
			...(uiMessages as UIMessage[]),
		];

		const messages = await convertToModelMessages(uiMessagesWithSystem as UIMessage[]);

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
				
				// Check if analyze_rubric has been called in previous steps or current messages
				const checkForToolCall = (toolName: string, inSteps: any[], inMessages: any[]) => {
					// Check in previous steps
					const inStepsResult = inSteps.some((step: any) => {
						const stepMessages = step.messages || [];
						return stepMessages.some((msg: any) => {
							if (Array.isArray(msg.content)) {
								return msg.content.some((part: any) => {
									return (
										part.type === 'tool-call' &&
										part.toolName === toolName
									);
							});
							}
							return false;
						});
					});
					
					// Check in current messages
					const inMessagesResult = inMessages.some((msg: any) => {
						if (Array.isArray(msg.content)) {
							return msg.content.some((part: any) => {
								return (
									part.type === 'tool-call' &&
									part.toolName === toolName
								);
							});
						}
						return false;
					});
					
					return inStepsResult || inMessagesResult;
				};
				
				const hasAnalyzedRubric = checkForToolCall('analyze_rubric', steps, messages);
				const hasProvidedAnalysis = checkForToolCall('provide_rubric_analysis', steps, messages);
				
				// Log rubric analysis progress for debugging
				let reminderInjected = false;
				if (analysisMode === 'rubric' && targetAssignment) {
					console.log(
						`[DEBUG] Step ${stepNumber}: Rubric analysis progress - analyze_rubric: ${hasAnalyzedRubric}, provide_rubric_analysis: ${hasProvidedAnalysis}`,
					);
					
					// If analyze_rubric was called but provide_rubric_analysis hasn't been called yet,
					// inject a reminder message to force the call
					if (hasAnalyzedRubric && !hasProvidedAnalysis) {
						console.log(
							`[DEBUG] Step ${stepNumber}: analyze_rubric completed, injecting reminder for provide_rubric_analysis call`,
						);
						
						// Inject a system message reminder
						const reminderMessage: any = {
							role: 'system',
							content: '⚠️ CRITICAL REMINDER: You have called analyze_rubric but have NOT yet called provide_rubric_analysis. You MUST call provide_rubric_analysis NOW with the fully analyzed rubric data. Do not generate any text - just call the tool immediately.',
						};
						
						// Add the reminder to the messages
						messages = [...messages, reminderMessage];
						reminderInjected = true;
					}
				}
				
				const contextUpdate =
					messages.length > 20
						? { messages: [messages[0], ...messages.slice(-10)] }
						: reminderInjected
						? { messages }
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
		
		// Check if the error is about tool use not being supported
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorString = JSON.stringify(error);
		
		if (errorMessage.includes('No endpoints found that support tool use') || 
		    errorString.includes('No endpoints found that support tool use')) {
			return new Response(
				JSON.stringify({
					error: `The selected model (${modelName || 'unknown'}) does not support tool use, which is required for quiz generation and other advanced features. Please select a model that supports tool use, such as:\n- google/gemini-2.0-flash-exp\n- anthropic/claude-3.5-sonnet\n- openai/gpt-4o`,
					errorCode: 'MODEL_NO_TOOL_SUPPORT',
					suggestedModels: ['google/gemini-2.0-flash-exp', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o']
				}),
				{ status: 400 },
			);
		}
		
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
