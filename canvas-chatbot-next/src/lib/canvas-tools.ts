import { tool } from 'ai';
import { z } from 'zod';
import { CanvasAPIService } from './canvas-api';

export function createCanvasTools(token: string, url: string) {
	const api = new CanvasAPIService(token, url);

	return {
		list_courses: tool({
			description: 'List user courses from Canvas. Defaults to all courses (active and completed). Use enrollmentState: "active" to get only active courses.',
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
				.default({ enrollmentState: 'all' }),
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
					enrollmentState: enrollmentState ?? 'all',
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
			description: 'Get all modules for a course. IMPORTANT: courseId parameter must be the Course ID (not Module ID). Course IDs are different from Module IDs. Use the Course ID from list_courses or from context labeled as "Course ID:". If you know the specific module ID, use get_module instead.',
			inputSchema: z.object({
				courseId: z.number().describe('The Course ID (NOT Module ID). This is the ID of the course that contains the modules. Get this from list_courses or from context labeled "Course ID:".'),
				includeContentDetails: z.boolean().optional(),
				perPage: z.number().int().min(1).max(100).optional(),
				skipCourseCheck: z.boolean().optional().describe('Skip the course existence check and directly try the modules endpoint. Useful when course endpoint returns 404 but modules might still be accessible.'),
			}),
			execute: async ({
				courseId,
				includeContentDetails,
				perPage,
				skipCourseCheck,
			}: {
				courseId: number;
				includeContentDetails?: boolean;
				perPage?: number;
				skipCourseCheck?: boolean;
			}) => {
				return api.getModules(courseId, { includeContentDetails, perPage, skipCourseCheck });
			},
		}),

		get_module: tool({
			description: 'Get a specific module by its Module ID. REQUIRES BOTH courseId (Course ID) and moduleId (Module ID) - these are DIFFERENT numbers. Use this when you know the exact module ID from context. The courseId is the Course ID (labeled "Course ID:" in context), and moduleId is the Module ID (labeled "Module ID:" in context).',
			inputSchema: z.object({
				courseId: z.number().describe('The Course ID (NOT Module ID). This is the ID of the course that contains the module. Get this from list_courses or from context labeled "Course ID:".'),
				moduleId: z.number().describe('The Module ID (NOT Course ID). This is the ID of the specific module you want to retrieve. Get this from context labeled "Module ID:".'),
				includeContentDetails: z.boolean().optional(),
				includeItems: z.boolean().optional(),
			}),
			execute: async ({
				courseId,
				moduleId,
				includeContentDetails,
				includeItems,
			}: {
				courseId: number;
				moduleId: number;
				includeContentDetails?: boolean;
				includeItems?: boolean;
			}) => {
				return api.getModule(courseId, moduleId, { includeContentDetails, includeItems });
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

		get_page_contents: tool({
			description: 'Get multiple Canvas page contents by URLs or slugs. Use this when you need to fetch several pages at once. Returns an array of page objects.',
			inputSchema: z.object({
				courseId: z.number(),
				pageUrls: z.array(z.string()).min(1),
			}),
			execute: async ({
				courseId,
				pageUrls,
			}: {
				courseId: number;
				pageUrls: string[];
			}) => {
				return api.getPageContents(courseId, pageUrls);
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
				try {
					const assignment = await api.getAssignment(courseId, assignmentId, {
						includeRubric: true,
					});
					
					// Check if assignment exists
					if (!assignment) {
						return { error: `Assignment ${assignmentId} not found in course ${courseId}` };
					}
					
					// Check for rubric - handle null, undefined, empty array, or non-array values
					const rubric = (assignment as any).rubric;
					if (!rubric) {
						return { 
							error: 'No rubric found for this assignment. The assignment may not have a rubric attached.',
							assignmentName: assignment.name,
							assignmentId: assignment.id,
						};
					}
					
					if (!Array.isArray(rubric)) {
						return { 
							error: `Rubric data is in an unexpected format. Expected array, got ${typeof rubric}`,
							assignmentName: assignment.name,
							assignmentId: assignment.id,
						};
					}
					
					if (rubric.length === 0) {
						return { 
							error: 'Assignment has a rubric associated but it contains no criteria.',
							assignmentName: assignment.name,
							assignmentId: assignment.id,
						};
					}
					
					return {
						assignmentName: assignment.name,
						assignmentDescription: assignment.description,
						rubric: rubric.map((criterion: any) => ({
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
				} catch (error: any) {
					return {
						error: error.message || 'Failed to fetch assignment rubric',
					};
				}
			},
		}),

		analyze_rubric: tool({
			description: 'Systematically analyze a rubric for an assignment. This tool fetches the rubric and returns it in a structured format for comprehensive analysis. Use this when rubric mode is enabled or when the user explicitly requests rubric analysis.',
			inputSchema: z.object({
				courseId: z.number().describe('The course ID containing the assignment'),
				assignmentId: z.number().describe('The assignment ID to analyze'),
			}),
			execute: async ({
				courseId,
				assignmentId,
			}: {
				courseId: number;
				assignmentId: number;
			}) => {
				try {
					const assignment = await api.getAssignment(courseId, assignmentId, {
						includeRubric: true,
					});
					
					if (!assignment) {
						return { 
							error: `Assignment ${assignmentId} not found in course ${courseId}`,
							courseId,
							assignmentId,
						};
					}
					
					const rubric = (assignment as any).rubric;
					if (!rubric || !Array.isArray(rubric) || rubric.length === 0) {
						return { 
							error: 'No rubric found for this assignment. The assignment may not have a rubric attached.',
							assignmentName: assignment.name,
							courseId,
							assignmentId,
						};
					}
					
					// Calculate total points
					const totalPoints = rubric.reduce((sum: number, c: any) => {
						return sum + (typeof c.points === 'number' ? c.points : 0);
					}, 0);
					
					// Structure the rubric data for analysis
					const structuredRubric = rubric.map((criterion: any) => {
						const ratings = Array.isArray(criterion.ratings) ? criterion.ratings : [];
						const pointsPossible = typeof criterion.points === 'number' ? criterion.points : 0;
						
						// Sort ratings by points (highest first) to identify grade levels
						const sortedRatings = [...ratings].sort((a: any, b: any) => {
							const aPoints = typeof a.points === 'number' ? a.points : 0;
							const bPoints = typeof b.points === 'number' ? b.points : 0;
							return bPoints - aPoints;
						});
						
						return {
							id: String(criterion.id || criterion.criterion_id || ''),
							name: criterion.description || 'Unnamed Criterion',
							description: criterion.description || '',
							long_description: criterion.long_description || '',
							points_possible: pointsPossible,
							ratings: sortedRatings.map((r: any) => ({
								description: r.description || '',
								points: typeof r.points === 'number' ? r.points : 0,
							})),
						};
					});
					
					return {
						assignmentName: assignment.name,
						assignmentDescription: assignment.description || '',
						courseId,
						assignmentId,
						totalPoints,
						rubric: structuredRubric,
					};
				} catch (error: any) {
					return {
						error: error.message || 'Failed to analyze rubric',
						courseId,
						assignmentId,
					};
				}
			},
		}),

		provide_rubric_analysis: tool({
			description: 'CRITICAL: After calling analyze_rubric, you MUST immediately call this tool with the fully analyzed rubric data. This tool provides the structured data for rendering in the RubricAnalysisUI component. DO NOT generate text responses before calling this tool - call it immediately after analyze_rubric completes. This tool accepts the complete analyzed rubric structure matching the RubricAnalysisOutput interface.',
			inputSchema: z.object({
				assignmentName: z.string().describe('The name of the assignment'),
				assignmentId: z.number().describe('The assignment ID'),
				courseId: z.number().describe('The course ID'),
				totalPoints: z.number().describe('Total points possible for the assignment'),
				criteria: z.array(
					z.object({
						id: z.string().describe('Unique identifier for the criterion'),
						name: z.string().describe('Name/title of the criterion'),
						description: z.string().describe('Description of what the criterion evaluates'),
						plainEnglishExplanation: z.string().optional().describe('A plain-English explanation of what this criterion evaluates, written in simple, student-friendly language with analogies. This helps students understand the criterion without technical jargon.'),
						pointsPossible: z.number().describe('Points possible for this criterion'),
						gradeLevels: z.object({
							hd: z.object({
								requirements: z.array(z.string()).describe('Requirements to achieve HD grade'),
								points: z.number().describe('Points awarded for HD'),
							}),
							d: z.object({
								requirements: z.array(z.string()).describe('Requirements to achieve D grade'),
								points: z.number().describe('Points awarded for D'),
							}),
							c: z.object({
								requirements: z.array(z.string()).describe('Requirements to achieve C grade'),
								points: z.number().describe('Points awarded for C'),
							}),
							p: z.object({
								requirements: z.array(z.string()).describe('Requirements to achieve P grade'),
								points: z.number().describe('Points awarded for P'),
							}),
							f: z.object({
								requirements: z.array(z.string()).describe('Requirements that result in F grade'),
								points: z.number().describe('Points awarded for F'),
							}),
						}),
						commonMistakes: z.array(z.string()).describe('Common mistakes students make for this criterion'),
						actionItems: z.array(z.string()).describe('Actionable items students should do for this criterion'),
						scoringTips: z.array(z.string()).describe('Tips for maximizing points on this criterion'),
					})
				).describe('Array of analyzed criteria with grade level breakdowns'),
				summary: z.object({
					overview: z.string().describe('Overall summary of the rubric'),
					keyRequirements: z.array(z.string()).describe('Key requirements across all criteria'),
					gradeStrategy: z.string().describe('Strategic advice for achieving target grades'),
					howToGetHD: z.string().optional().describe('A detailed, step-by-step guide on how to achieve HD (High Distinction) grade. This should be comprehensive, actionable, and written in clear, student-friendly language. Include specific requirements, strategies, and tips for each criterion.'),
				}),
				commonMistakes: z.array(
					z.object({
						criterion: z.string(),
						mistakes: z.array(z.string()),
					})
				).describe('Common mistakes organized by criterion'),
				actionChecklist: z.array(
					z.object({
						id: z.string(),
						item: z.string(),
						criterion: z.string(),
						priority: z.enum(['high', 'medium', 'low']),
					})
				).describe('Prioritized actionable checklist items'),
				scoringBreakdown: z.object({
					totalPoints: z.number(),
					pointsByCriterion: z.array(
						z.object({
							criterion: z.string(),
							points: z.number(),
							percentage: z.number(),
						})
					),
					maximizationTips: z.array(z.string()),
				}),
			}),
			execute: async (analysisData: any) => {
				// Simply return the provided analysis data as-is
				// This tool exists to allow the AI to provide structured output
				// that will be rendered by the RubricAnalysisUI component
				return analysisData;
			},
		}),

		generate_quiz_plan: tool({
			description: 'Generate a detailed plan for quiz generation based on provided context (modules, assignments, or courses). This tool gathers information from the context and creates a structured plan that the user must approve before quiz generation. Call this tool when quiz mode is enabled and the user has provided context and a prompt.',
			needsApproval: true,
			inputSchema: z.object({
				sources: z.object({
					courses: z.array(z.object({
						id: z.number().describe('Course ID'),
						name: z.string().describe('Course name'),
					})).optional().describe('Courses to use as sources'),
					modules: z.array(z.object({
						id: z.number().describe('Module ID'),
						name: z.string().describe('Module name'),
						courseId: z.number().describe('Course ID containing this module'),
					})).optional().describe('Modules to use as sources'),
					assignments: z.array(z.object({
						id: z.number().describe('Assignment ID'),
						name: z.string().describe('Assignment name'),
						courseId: z.number().describe('Course ID containing this assignment'),
					})).optional().describe('Assignments to use as sources'),
				}).describe('Sources to gather information from'),
				questionCount: z.number().int().min(1).max(50).describe('Total number of questions to generate'),
				questionTypes: z.object({
					multipleChoice: z.number().int().min(0).describe('Number of multiple choice questions'),
					trueFalse: z.number().int().min(0).describe('Number of true/false questions'),
					shortAnswer: z.number().int().min(0).describe('Number of short answer questions'),
				}).describe('Breakdown of question types'),
				topics: z.array(z.string()).describe('Topics that will be covered in the quiz'),
				difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).describe('Estimated difficulty level'),
				userPrompt: z.string().optional().describe('The user\'s specific prompt or requirements for the quiz'),
			}),
			execute: async (planData: any) => {
				// Simply return the plan data as-is
				// This tool exists to allow the AI to provide structured plan output
				// that will be rendered by the Plan component for user approval
				return planData;
			},
		}),

		provide_quiz_output: tool({
			description: 'CRITICAL: After the user approves the quiz plan from generate_quiz_plan, you MUST call this tool with the fully generated quiz data. This tool provides the structured quiz data for rendering in the QuizUI component. DO NOT generate text responses before calling this tool - call it immediately after quiz generation completes. This tool accepts the complete quiz structure matching the QuizOutput interface.',
			inputSchema: z.object({
				title: z.string().describe('Title of the quiz'),
				description: z.string().optional().describe('Description of the quiz'),
				totalQuestions: z.number().describe('Total number of questions'),
				topics: z.array(z.string()).describe('Topics covered in the quiz'),
				difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).describe('Overall difficulty level'),
				questions: z.array(
					z.object({
						id: z.string().describe('Unique identifier for the question'),
						question: z.string().describe('The question text'),
						type: z.enum(['multiple_choice', 'true_false', 'short_answer']).describe('Type of question'),
						options: z.array(z.string()).optional().describe('Answer options (for multiple choice and true/false)'),
						correctAnswer: z.union([
							z.string(),
							z.number(),
							z.boolean(),
						]).describe('The correct answer (string for short answer, number for multiple choice index, boolean for true/false)'),
						explanation: z.string().describe('Explanation of why the answer is correct'),
						sourceReference: z.object({
							type: z.enum(['module', 'assignment', 'course', 'page', 'file']).describe('Type of source'),
							name: z.string().describe('Name of the source'),
							url: z.string().optional().describe('URL to the source if available'),
						}).optional().describe('Reference to the source material'),
						topic: z.string().optional().describe('Topic this question covers'),
					})
				).describe('Array of quiz questions'),
				metadata: z.object({
					estimatedTime: z.number().optional().describe('Estimated time to complete in minutes'),
					sourcesUsed: z.array(z.string()).optional().describe('List of sources used to generate the quiz'),
				}).optional().describe('Additional metadata about the quiz'),
			}),
			execute: async (quizData: any) => {
				// Simply return the quiz data as-is
				// This tool exists to allow the AI to provide structured output
				// that will be rendered by the QuizUI component
				return quizData;
			},
		}),
	};
}
