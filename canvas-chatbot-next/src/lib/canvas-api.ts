import axios from 'axios';

export interface CanvasCourse {
	id: number;
	name: string;
	course_code: string;
	enrollment_term_id: number;
	start_at: string | null;
	end_at: string | null;
	workflow_state: 'available' | 'completed' | 'deleted';
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string | null;
  due_at: string | null;
  points_possible: number;
  course_id: number;
  html_url: string;
  submission: {
    score: number | null;
    graded_at: string | null;
    workflow_state: string;
  } | null;
  rubric?: CanvasRubricCriterion[] | null;
}
export interface CanvasRubricRating {
  id?: string | number;
  description?: string | null;
  long_description?: string | null;
  points?: number;
}
export interface CanvasRubricCriterion {
  id: string;
  description?: string | null;
  long_description?: string | null;
  points?: number;
  ratings?: CanvasRubricRating[];
}
export interface CanvasSubmission {
  id: number;
  user_id: number;
  grade: string | null;
  score: number | null;
  graded_at: string | null;
  workflow_state: string;
  submitted_at: string | null;
  late?: boolean;
  missing?: boolean;
  rubric_assessment?: any;
  submission_comments?: Array<{ author_id: number; comment: string; created_at: string }>;
}

export interface CanvasModule {
	id: number;
	name: string;
	position: number;
	items: CanvasModuleItem[];
}

export interface CanvasModuleItem {
	id: number;
	title: string;
	type:
		| 'Page'
		| 'Assignment'
		| 'Quiz'
		| 'Discussion'
		| 'File'
		| 'ExternalUrl'
		| 'ExternalTool';
	html_url: string;
	url: string;
	content_id?: number;
	external_url?: string;
}

export interface CanvasPage {
	title: string;
	body: string;
	url: string;
}

export interface CanvasFile {
	id: number;
	filename: string;
	url: string;
	'content-type': string;
}

export interface CanvasCalendarEvent {
	id: number;
	title: string;
	start_at: string;
	end_at: string;
	description: string | null;
	context_name: string;
	html_url: string;
}

export class CanvasAPIService {
	private apiKey: string;
	private baseURL: string;
	private forceStringIds: boolean;
	private maxRetries = 3;
	private baseDelayMs = 500;

	constructor(
		apiKey: string,
		canvasURL: string,
		options?: { forceStringIds?: boolean },
	) {
		this.apiKey = apiKey;
		let url = String(canvasURL || '').trim();
		url = url.replace(/\/+$/, '');
		url = url.replace(/\/api\/v1\/?$/, '');
		this.baseURL = `${url}/api/v1`;
		this.forceStringIds = options?.forceStringIds === true;
	}

	private getHeaders() {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${this.apiKey}`,
			'Content-Type': 'application/json',
		};
		if (this.forceStringIds) {
			headers['Accept'] = 'application/json+canvas-string-ids';
		}
		return headers;
	}

	private async withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
		try {
			return await fn();
		} catch (error: any) {
			const status = error?.response?.status;
			const retryAfter = Number(error?.response?.headers?.['retry-after']) || 0;
			const isRateLimit = status === 429;
			const isServerError = status >= 500 && status < 600;
			const isNetworkError =
				!status &&
				(error?.code === 'ECONNABORTED' ||
					error?.code === 'ENOTFOUND' ||
					error?.code === 'ETIMEDOUT' ||
					error?.message?.includes('Network Error'));
			if (
				attempt < this.maxRetries &&
				(isRateLimit || isServerError || isNetworkError)
			) {
				const delay =
					retryAfter > 0
						? retryAfter * 1000
						: this.baseDelayMs * Math.pow(2, attempt - 1);
				await new Promise((r) => setTimeout(r, delay));
				return this.withRetry(fn, attempt + 1);
			}
			throw error;
		}
	}

	private async ensureCourseExists(courseId: number) {
		return this.withRetry(async () => {
			const response = await axios.get(`${this.baseURL}/courses/${courseId}`, {
				headers: this.getHeaders(),
				timeout: 10000,
			});
			return response.data as CanvasCourse;
		});
	}

	async getCurrentUser() {
		try {
			const response = await axios.get(`${this.baseURL}/users/self`, {
				headers: this.getHeaders(),
				timeout: 10000,
			});
			return response.data;
		} catch (error) {
			const status = (error as any)?.response?.status;
			const data = (error as any)?.response?.data;
			const message =
				(typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
				(error as any)?.message ||
				'Unknown error';
			console.error('CanvasAPIService:getCurrentUser', { status, message });
			throw new Error(
				`Failed to authenticate with Canvas API${
					status ? ` (${status})` : ''
				}: ${message}`,
			);
		}
	}

	async getCourses(
		enrollmentStateOrOptions:
			| ('active' | 'completed' | 'all')
			| {
					enrollmentState?: 'active' | 'completed' | 'all';
					enrollmentType?:
						| 'student'
						| 'teacher'
						| 'ta'
						| 'observer'
						| 'designer';
					include?: string[];
					perPage?: number;
					searchTerm?: string;
			  } = 'active',
	) {
		try {
			const params: any = {};
			let enrollmentState: 'active' | 'completed' | 'all' = 'active';
			let include: string[] | undefined;
			let perPage: number | undefined;
			let enrollmentType: string | undefined;
			let searchTerm: string | undefined;

			if (typeof enrollmentStateOrOptions === 'string') {
				enrollmentState = enrollmentStateOrOptions;
			} else if (typeof enrollmentStateOrOptions === 'object') {
				enrollmentState = enrollmentStateOrOptions.enrollmentState ?? 'active';
				include = enrollmentStateOrOptions.include;
				perPage = enrollmentStateOrOptions.perPage;
				enrollmentType = enrollmentStateOrOptions.enrollmentType;
				searchTerm = enrollmentStateOrOptions.searchTerm;
			}

			params.per_page = perPage ?? 100;
			if (include && include.length) params['include[]'] = include;
			if (enrollmentState !== 'all') params.enrollment_state = enrollmentState;
			if (enrollmentType) params.enrollment_type = enrollmentType;
			if (searchTerm) params.search_term = searchTerm;

			const response = await this.withRetry(async () => {
				return axios.get(`${this.baseURL}/users/self/courses`, {
					headers: this.getHeaders(),
					params,
					timeout: 10000,
				});
			});

			return (response as any).data as CanvasCourse[];
		} catch (error: any) {
			const status = error?.response?.status;
			const data = error?.response?.data;
			const message =
				(typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
				error?.message ||
				'Unknown error';
			console.error('CanvasAPIService:getCourses', { status, message });
			throw new Error(
				`Failed to fetch courses${status ? ` (${status})` : ''}: ${message}`,
			);
		}
	}

  async getAssignments(
		courseId: number,
		optionsOrIncludeSubmission:
			| boolean
			| {
					includeSubmission?: boolean;
					bucket?: 'upcoming' | 'past' | 'undated' | 'overdue' | 'ungraded';
					perPage?: number;
					orderBy?: 'due_at' | 'position' | 'name';
					searchTerm?: string;
			  } = true,
	) {
		try {
			await this.ensureCourseExists(courseId);
			const params: any = {};
			let includeSubmission = true;
			let bucket: string | undefined;
			let perPage: number | undefined;
			let orderBy: string | undefined;
			let searchTerm: string | undefined;

			if (typeof optionsOrIncludeSubmission === 'boolean') {
				includeSubmission = optionsOrIncludeSubmission;
			} else if (typeof optionsOrIncludeSubmission === 'object') {
				includeSubmission =
					optionsOrIncludeSubmission.includeSubmission ?? true;
				bucket = optionsOrIncludeSubmission.bucket;
				perPage = optionsOrIncludeSubmission.perPage;
				orderBy = optionsOrIncludeSubmission.orderBy;
				searchTerm = optionsOrIncludeSubmission.searchTerm;
  }

			params.per_page = perPage ?? 50;
			if (includeSubmission) params['include[]'] = ['submission'];
			if (bucket) params.bucket = bucket;
			if (orderBy) params.order_by = orderBy;
			if (searchTerm) params.search_term = searchTerm;

			const response = await this.withRetry(async () => {
				return axios.get(`${this.baseURL}/courses/${courseId}/assignments`, {
					headers: this.getHeaders(),
					params,
					timeout: 10000,
				});
			});

			return (response as any).data as CanvasAssignment[];
		} catch (error: any) {
			const status = error?.response?.status;
			const data = error?.response?.data;
			const message =
				(typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
				error?.message ||
				'Unknown error';
			console.error('CanvasAPIService:getAssignments', { status, message });
			throw new Error(
				`Failed to fetch assignments${
					status ? ` (${status})` : ''
				}: ${message}`,
			);
    }
  }

  async getAssignment(
    courseId: number,
    assignmentId: number,
    options?: { includeRubric?: boolean },
  ) {
    try {
      const includeRubric = options?.includeRubric === true;
      const params: any = {};
      if (includeRubric) params['include[]'] = ['rubric'];
      const response = await axios.get(
        `${this.baseURL}/courses/${courseId}/assignments/${assignmentId}`,
        {
          headers: this.getHeaders(),
          params,
          timeout: 10000,
        },
      );
      const assignment = response.data as CanvasAssignment;
      // Debug logging to help diagnose rubric issues
      if (includeRubric) {
        console.log('[CanvasAPI] Assignment rubric check', {
          assignmentId,
          courseId,
          hasRubric: !!assignment.rubric,
          rubricType: typeof assignment.rubric,
          rubricIsArray: Array.isArray(assignment.rubric),
          rubricLength: Array.isArray(assignment.rubric) ? assignment.rubric.length : 'N/A',
        });
      }
      return assignment;
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const message =
        (typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
        error?.message ||
        'Unknown error';
      throw new Error(
        `Failed to fetch assignment${status ? ` (${status})` : ''}: ${message}`,
      );
    }
  }

  async getAssignmentSubmission(
    courseId: number,
    assignmentId: number,
    options?: { userId?: number; includeRubric?: boolean; includeComments?: boolean },
  ) {
    try {
      let userId = options?.userId;
      if (!userId) {
        const me = await this.getCurrentUser();
        userId = Number(me?.id);
      }
      const includeRubric = options?.includeRubric === true;
      const includeComments = options?.includeComments === true;
      const params: any = { include: [] as string[] };
      if (includeRubric) params.include.push('rubric_assessment');
      if (includeComments) params.include.push('submission_comments');
      const response = await axios.get(
        `${this.baseURL}/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`,
        {
          headers: this.getHeaders(),
          params,
          timeout: 10000,
        },
      );
      return response.data as CanvasSubmission;
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const message =
        (typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
        error?.message ||
        'Unknown error';
      throw new Error(
        `Failed to fetch submission${status ? ` (${status})` : ''}: ${message}`,
      );
    }
  }

	async getModules(
		courseId: number,
		options?: {
			includeItems?: boolean;
			includeContentDetails?: boolean;
			perPage?: number;
			skipCourseCheck?: boolean;
		},
	) {
		try {
			// First verify the course exists and is accessible
			// Note: 403 and 404 errors are treated as warnings since Canvas may allow access to modules
			// even if the course details endpoint is restricted or returns not found
			// The modules endpoint might still work even if course endpoint doesn't
			if (options?.skipCourseCheck !== true) {
				try {
					await this.ensureCourseExists(courseId);
				} catch (courseError: any) {
					const courseStatus = courseError?.response?.status;
					const courseData = courseError?.response?.data;
					const courseMessage =
						(typeof courseData === 'string' ? courseData : courseData?.errors?.[0]?.message) ||
						courseError?.message ||
						'Unknown error';
					
					// 403 (Forbidden) and 404 (Not Found) might still allow modules access
					// Canvas permissions can be granular - user might not have course access
					// but still have module access. We'll proceed with a warning and try the modules endpoint.
					if (courseStatus === 403 || courseStatus === 404) {
						console.warn('CanvasAPIService:getModules - Course check returned ' + courseStatus + ', proceeding to try modules endpoint anyway', { 
							courseId, 
							status: courseStatus, 
							message: courseMessage 
						});
						// Continue to try the modules endpoint
					} else {
						console.error('CanvasAPIService:getModules - Course check failed', { 
							courseId, 
							status: courseStatus, 
							message: courseMessage 
						});
						throw new Error(
							`Course ${courseId} not found or not accessible${courseStatus ? ` (${courseStatus})` : ''}: ${courseMessage}`,
						);
					}
				}
			}

			const includeItems = options?.includeItems !== false;
			const includeContentDetails = options?.includeContentDetails === true;
			const perPage = options?.perPage ?? 50;

			const include: string[] = [];
			if (includeItems) include.push('items');
			if (includeContentDetails) include.push('content_details');

			const params: any = {
				per_page: perPage,
			};
			if (include.length > 0) {
				params['include[]'] = include;
			}

			const response = await this.withRetry(async () => {
				return axios.get(`${this.baseURL}/courses/${courseId}/modules`, {
					headers: this.getHeaders(),
					params,
					timeout: 10000,
				});
			});

			return (response as any).data as CanvasModule[];
		} catch (error: any) {
			// If error is already our custom error from course check, re-throw it
			if (error?.message?.includes('Course') && error?.message?.includes('not found or not accessible')) {
				throw error;
			}
			
			const status = error?.response?.status;
			const data = error?.response?.data;
			const message =
				(typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
				error?.message ||
				'Unknown error';
			console.error('CanvasAPIService:getModules', { 
				courseId, 
				status, 
				message,
				url: `${this.baseURL}/courses/${courseId}/modules`
			});
			throw new Error(
				`Failed to fetch modules${status ? ` (${status})` : ''}: ${message}`,
			);
		}
	}

	async getModule(
		courseId: number,
		moduleId: number,
		options?: {
			includeItems?: boolean;
			includeContentDetails?: boolean;
		},
	) {
		try {
			const includeItems = options?.includeItems !== false;
			const includeContentDetails = options?.includeContentDetails === true;

			const include: string[] = [];
			if (includeItems) include.push('items');
			if (includeContentDetails) include.push('content_details');

			const params: any = {};
			if (include.length > 0) {
				params['include[]'] = include;
			}

			const response = await this.withRetry(async () => {
				return axios.get(`${this.baseURL}/courses/${courseId}/modules/${moduleId}`, {
					headers: this.getHeaders(),
					params,
					timeout: 10000,
				});
			});

			return (response as any).data as CanvasModule;
		} catch (error: any) {
			const status = error?.response?.status;
			const data = error?.response?.data;
			const message =
				(typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
				error?.message ||
				'Unknown error';
			console.error('CanvasAPIService:getModule', { 
				courseId, 
				moduleId,
				status, 
				message,
				url: `${this.baseURL}/courses/${courseId}/modules/${moduleId}`
			});
			throw new Error(
				`Failed to fetch module${status ? ` (${status})` : ''}: ${message}`,
			);
		}
	}

	async getPageContent(courseId: number, pageUrl: string) {
		try {
			let finalSlug: string | null = null;
			let response;
			const trimmed = String(pageUrl || '').trim();
			if (trimmed.startsWith('http')) {
				const mApi = trimmed.match(/\/courses\/(\d+)\/pages\/([a-z0-9\-_%]+)/i);
				if (mApi && Number(mApi[1]) === Number(courseId)) {
					finalSlug = mApi[2];
				}
			}

			if (finalSlug) {
				const apiPageUrl = `${this.baseURL}/courses/${courseId}/pages/${finalSlug}`;
				response = await this.withRetry(async () => {
					return axios.get(apiPageUrl, {
						headers: this.getHeaders(),
						timeout: 15000,
					});
				});
			} else if (trimmed.startsWith('http')) {
				response = await this.withRetry(async () => {
					return axios.get(trimmed, {
						headers: this.getHeaders(),
						timeout: 15000,
					});
				});
			} else {
				const apiPageUrl = `${this.baseURL}/courses/${courseId}/pages/${trimmed}`;
				response = await this.withRetry(async () => {
					return axios.get(apiPageUrl, {
						headers: this.getHeaders(),
						timeout: 15000,
					});
				});
			}
			return (response as any).data as CanvasPage;
		} catch (error: any) {
			const status = error?.response?.status;
			const data = error?.response?.data;
			const message =
				(typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
				error?.message ||
				'Unknown error';
			console.error('CanvasAPIService:getPageContent', { status, message });
			throw new Error(
				`Failed to fetch page content${
					status ? ` (${status})` : ''
				}: ${message}`,
			);
		}
	}

	async getPageContents(courseId: number, pageUrls: string[]): Promise<CanvasPage[]> {
		const results = await Promise.allSettled(
			pageUrls.map((pageUrl) => this.getPageContent(courseId, pageUrl))
		);

		const pages: CanvasPage[] = [];
		results.forEach((result, index) => {
			if (result.status === 'fulfilled') {
				pages.push(result.value);
			} else {
				console.error(`CanvasAPIService:getPageContents - Failed to fetch page ${index + 1} (${pageUrls[index]}):`, result.reason);
			}
		});

		return pages;
	}

	async getFileContent(fileId: number) {
		try {
			const response = await this.withRetry(async () => {
				return axios.get(`${this.baseURL}/files/${fileId}`, {
					headers: this.getHeaders(),
					timeout: 10000,
				});
			});

			return (response as any).data as CanvasFile;
		} catch (error: any) {
			const status = error?.response?.status;
			const data = error?.response?.data;
			const message =
				(typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
				error?.message ||
				'Unknown error';
			console.error('CanvasAPIService:getFileContent', { status, message });
			throw new Error(
				`Failed to fetch file information${
					status ? ` (${status})` : ''
				}: ${message}`,
			);
		}
	}

	async getCalendarEvents(
		daysAheadOrOptions:
			| number
			| {
					daysAhead?: number;
					startDate?: string;
					endDate?: string;
					contextCodes?: string[];
					type?: 'event' | 'assignment';
					allEvents?: boolean;
					perPage?: number;
			  } = 14,
	) {
		try {
			let startDate: string | undefined;
			let endDate: string | undefined;
			let contextCodes: string[] | undefined;
			let type: string | undefined;
			let allEvents: boolean | undefined;
			let perPage: number | undefined;
			let daysAhead = 14;

			if (typeof daysAheadOrOptions === 'number') {
				daysAhead = daysAheadOrOptions;
			} else {
				daysAhead = daysAheadOrOptions.daysAhead ?? 14;
				startDate = daysAheadOrOptions.startDate ?? new Date().toISOString();
				endDate =
					daysAheadOrOptions.endDate ??
					new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
				contextCodes = daysAheadOrOptions.contextCodes;
				type = daysAheadOrOptions.type;
				allEvents = daysAheadOrOptions.allEvents;
				perPage = daysAheadOrOptions.perPage;
			}

			startDate = startDate ?? new Date().toISOString();
			endDate =
				endDate ??
				new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

			const params: any = {
				start_date: startDate,
				end_date: endDate,
				per_page: perPage ?? 100,
			};
			if (typeof allEvents === 'boolean') params.all_events = allEvents;
			if (type) params.type = type;
			if (contextCodes && contextCodes.length)
				params['context_codes[]'] = contextCodes;

			const response = await this.withRetry(async () => {
				return axios.get(`${this.baseURL}/calendar_events`, {
					headers: this.getHeaders(),
					params,
					timeout: 10000,
				});
			});

			return (response as any).data as CanvasCalendarEvent[];
		} catch (error: any) {
			const status = error?.response?.status;
			const data = error?.response?.data;
			const message =
				(typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
				error?.message ||
				'Unknown error';
			console.error('CanvasAPIService:getCalendarEvents', { status, message });
			throw new Error(
				`Failed to fetch calendar events${
					status ? ` (${status})` : ''
				}: ${message}`,
			);
		}
	}

	async downloadFile(fileUrl: string) {
		try {
			const response = await this.withRetry(async () => {
				return axios.get(fileUrl, {
					headers: this.getHeaders(),
					responseType: 'arraybuffer',
					timeout: 30000,
				});
			});

			return (response as any).data;
		} catch (error: any) {
			const status = error?.response?.status;
			const data = error?.response?.data;
			const message =
				(typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
				error?.message ||
				'Unknown error';
			console.error('CanvasAPIService:downloadFile', { status, message });
			throw new Error(
				`Failed to download file${status ? ` (${status})` : ''}: ${message}`,
			);
		}
	}

	async getFileText(fileId: number) {
		try {
			const meta = await this.getFileContent(fileId);
			const url = meta.url;
			const contentType = String((meta as any)['content-type'] || '').toLowerCase();
			if (!url) return '';
			const data = await this.downloadFile(url);
			if (contentType.includes('pdf')) {
				const buf = Buffer.from(data);
				let pdfParseFn: any = null;
				try {
					const mod: any = await import('pdf-parse');
					pdfParseFn = mod?.default || mod?.pdf || mod;
				} catch {}
				if (typeof pdfParseFn === 'function') {
					const res = await pdfParseFn(buf);
					return String(res?.text || '').trim();
				}
				return '';
			}
			return '';
		} catch {
			return '';
		}
	}
}
