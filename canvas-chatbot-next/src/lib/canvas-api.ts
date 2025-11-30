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

	async getCurrentUser() {
		try {
			const response = await axios.get(`${this.baseURL}/users/self`, {
				headers: this.getHeaders(),
				timeout: 10000,
			});
			return response.data;
		} catch (error) {
			throw new Error('Failed to authenticate with Canvas API');
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
			if (include && include.length) params.include = include;
			if (enrollmentState !== 'all') params.enrollment_state = enrollmentState;
			if (enrollmentType) params.enrollment_type = enrollmentType;
			if (searchTerm) params.search_term = searchTerm;

			const response = await axios.get(`${this.baseURL}/users/self/courses`, {
				headers: this.getHeaders(),
				params,
				timeout: 10000,
			});

			return response.data as CanvasCourse[];
		} catch (error) {
			throw new Error('Failed to fetch courses');
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
			const params: any = { include: [] };
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
			if (includeSubmission) params.include.push('submission');
			if (bucket) params.bucket = bucket;
			if (orderBy) params.order_by = orderBy;
			if (searchTerm) params.search_term = searchTerm;

			const response = await axios.get(
				`${this.baseURL}/courses/${courseId}/assignments`,
				{
					headers: this.getHeaders(),
					params,
					timeout: 10000,
				},
			);

			return response.data as CanvasAssignment[];
		} catch (error: any) {
			const status = error?.response?.status;
			const data = error?.response?.data;
			const message =
				(typeof data === 'string' ? data : data?.errors?.[0]?.message) ||
				error?.message ||
				'Unknown error';
			throw new Error(
				`Failed to fetch assignments${
					status ? ` (${status})` : ''
				}: ${message}`,
			);
		}
	}

	async getModules(
		courseId: number,
		options?: {
			includeItems?: boolean;
			includeContentDetails?: boolean;
			perPage?: number;
		},
	) {
		try {
			const includeItems = options?.includeItems !== false;
			const includeContentDetails = options?.includeContentDetails === true;
			const perPage = options?.perPage ?? 50;

			const include: string[] = [];
			if (includeItems) include.push('items');
			if (includeContentDetails) include.push('content_details');

			const response = await axios.get(
				`${this.baseURL}/courses/${courseId}/modules`,
				{
					headers: this.getHeaders(),
					params: {
						per_page: perPage,
						include,
					},
					timeout: 10000,
				},
			);

			return response.data as CanvasModule[];
		} catch (error) {
			throw new Error('Failed to fetch modules');
		}
	}

	async getPageContent(courseId: number, pageUrl: string) {
		try {
			let response;
			let slug = pageUrl;

			if (pageUrl.startsWith('http')) {
				try {
					response = await axios.get(pageUrl, {
						headers: this.getHeaders(),
						timeout: 15000,
					});
				} catch (error) {
					response = null;
				}

				try {
					const u = new URL(pageUrl);
					const parts = u.pathname.split('/').filter(Boolean);
					const idx = parts.indexOf('pages');
					if (idx !== -1 && parts[idx + 1]) {
						slug = parts[idx + 1];
					}
				} catch {}
			}

			if (!response) {
				const apiPageUrl = `${
					this.baseURL
				}/courses/${courseId}/pages/${encodeURIComponent(slug)}`;
				response = await axios.get(apiPageUrl, {
					headers: this.getHeaders(),
					timeout: 15000,
				});
			}

			return response.data as CanvasPage;
		} catch (error) {
			throw new Error('Failed to fetch page content');
		}
	}

	async getFileContent(fileId: number) {
		try {
			const response = await axios.get(`${this.baseURL}/files/${fileId}`, {
				headers: this.getHeaders(),
				timeout: 10000,
			});

			return response.data as CanvasFile;
		} catch (error) {
			throw new Error('Failed to fetch file information');
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
				startDate = daysAheadOrOptions.startDate;
				endDate = daysAheadOrOptions.endDate;
				contextCodes = daysAheadOrOptions.contextCodes;
				type = daysAheadOrOptions.type;
				allEvents = daysAheadOrOptions.allEvents;
				perPage = daysAheadOrOptions.perPage;
			}

			if (!startDate) startDate = new Date().toISOString();
			if (!endDate)
				endDate = new Date(
					Date.now() + daysAhead * 24 * 60 * 60 * 1000,
				).toISOString();

			const params = {
				start_date: startDate,
				end_date: endDate,
				per_page: perPage ?? 100,
			} as any;
			if (typeof allEvents === 'boolean') params.all_events = allEvents;
			if (type) params.type = type;
			if (contextCodes && contextCodes.length)
				params.context_codes = contextCodes;

			const response = await axios.get(`${this.baseURL}/calendar_events`, {
				headers: this.getHeaders(),
				params,
				timeout: 10000,
			});

			return response.data as CanvasCalendarEvent[];
		} catch (error) {
			throw new Error('Failed to fetch calendar events');
		}
	}

	async downloadFile(fileUrl: string) {
		try {
			const response = await axios.get(fileUrl, {
				headers: this.getHeaders(),
				responseType: 'arraybuffer',
				timeout: 30000,
			});

			return response.data;
		} catch (error) {
			throw new Error('Failed to download file');
		}
	}
}
