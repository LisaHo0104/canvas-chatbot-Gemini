import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { AuthenticationError, CanvasAPIError } from './errors';
import { logger } from './logger';

interface CanvasAPIConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

interface CanvasAPIOptions {
  include?: string[];
  per_page?: number;
  page?: number;
  search?: string;
  context?: string;
  type?: string;
  [key: string]: any;
}

interface CanvasResponse<T = any> {
  data: T;
  status: number;
  headers: any;
}

class CanvasAPIClient {
  private client: AxiosInstance;
  private config: CanvasAPIConfig;

  constructor(config: Partial<CanvasAPIConfig> = {}) {
    this.config = {
      baseURL: process.env.CANVAS_API_URL || 'https://canvas.instructure.com/api/v1',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Canvas API request', {
          method: config.method,
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('Canvas API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Canvas API response', {
          status: response.status,
          url: response.config.url,
          dataSize: JSON.stringify(response.data).length
        });
        return response;
      },
      async (error: AxiosError) => {
        logger.error('Canvas API response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          logger.warn('Canvas API rate limit hit', { retryAfter });
          
          if (retryAfter && this.shouldRetry(error.config)) {
            await this.delay(parseInt(retryAfter) * 1000);
            return this.client.request(error.config);
          }
        }

        // Handle authentication errors
        if (error.response?.status === 401) {
          throw new AuthenticationError('Canvas API authentication failed', {
            status: error.response.status,
            url: error.config?.url
          });
        }

        // Handle other errors
        if (this.shouldRetry(error.config)) {
          return this.retryRequest(error.config);
        }

        throw new CanvasAPIError(
          `Canvas API error: ${error.message}`,
          error.response?.status || 500,
          'CANVAS_API_ERROR',
          {
            status: error.response?.status,
            url: error.config?.url,
            method: error.config?.method
          }
        );
      }
    );
  }

  private shouldRetry(config?: AxiosRequestConfig): boolean {
    const retryCount = (config as any)?._retryCount || 0;
    return retryCount < this.config.retries;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryRequest(config: AxiosRequestConfig): Promise<any> {
    const retryCount = (config as any)?._retryCount || 0;
    (config as any)._retryCount = retryCount + 1;

    logger.info(`Retrying Canvas API request (${retryCount + 1}/${this.config.retries})`, {
      url: config.url,
      method: config.method
    });

    await this.delay(this.config.retryDelay * (retryCount + 1));
    return this.client.request(config);
  }

  // Set authentication token
  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Users API
  async getUser(userId: string, options: CanvasAPIOptions = {}): Promise<CanvasResponse> {
    const params = this.buildParams(options);
    const response = await this.client.get(`/users/${userId}`, { params });
    return response.data;
  }

  async getUserPageViews(userId: string, startTime: string, endTime: string, options: CanvasAPIOptions = {}): Promise<CanvasResponse> {
    const params = this.buildParams({
      start_time: startTime,
      end_time: endTime,
      ...options
    });
    const response = await this.client.get(`/users/${userId}/page_views`, { params });
    return response.data;
  }

  async queryUserPageViews(userId: string, queryData: any): Promise<CanvasResponse> {
    const response = await this.client.post(`/users/${userId}/page_views/query`, queryData);
    return response.data;
  }

  async getUserPageViewsQueryStatus(userId: string, queryId: string): Promise<CanvasResponse> {
    const response = await this.client.get(`/users/${userId}/page_views/query/${queryId}`);
    return response.data;
  }

  // Search API
  async searchRecipients(searchData: any): Promise<CanvasResponse> {
    const response = await this.client.get('/search/recipients', { params: searchData });
    return response.data;
  }

  // Courses API
  async getCourse(courseId: string, options: CanvasAPIOptions = {}): Promise<CanvasResponse> {
    const params = this.buildParams(options);
    const response = await this.client.get(`/courses/${courseId}`, { params });
    return response.data;
  }

  async getCourseAssignments(courseId: string, options: CanvasAPIOptions = {}): Promise<CanvasResponse> {
    const params = this.buildParams(options);
    const response = await this.client.get(`/courses/${courseId}/assignments`, { params });
    return response.data;
  }

  async getCourseDiscussions(courseId: string, options: CanvasAPIOptions = {}): Promise<CanvasResponse> {
    const params = this.buildParams(options);
    const response = await this.client.get(`/courses/${courseId}/discussion_topics`, { params });
    return response.data;
  }

  async getCourseFiles(courseId: string, options: CanvasAPIOptions = {}): Promise<CanvasResponse> {
    const params = this.buildParams(options);
    const response = await this.client.get(`/courses/${courseId}/files`, { params });
    return response.data;
  }

  // Content Exports API
  async exportContent(courseId: string, exportData: any): Promise<CanvasResponse> {
    const response = await this.client.post(`/courses/${courseId}/content_exports`, exportData);
    return response.data;
  }

  async getContentExportStatus(courseId: string, exportId: string): Promise<CanvasResponse> {
    const response = await this.client.get(`/courses/${courseId}/content_exports/${exportId}`);
    return response.data;
  }

  // Submissions API
  async getSubmission(courseId: string, assignmentId: string, userId: string, options: CanvasAPIOptions = {}): Promise<CanvasResponse> {
    const params = this.buildParams(options);
    const response = await this.client.get(`/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`, { params });
    return response.data;
  }

  async getSubmissions(courseId: string, assignmentId: string, options: CanvasAPIOptions = {}): Promise<CanvasResponse> {
    const params = this.buildParams(options);
    const response = await this.client.get(`/courses/${courseId}/assignments/${assignmentId}/submissions`, { params });
    return response.data;
  }

  // Analytics API
  async getAccountAnalytics(accountId: string, type: string, options: CanvasAPIOptions = {}): Promise<CanvasResponse> {
    const params = this.buildParams(options);
    const response = await this.client.get(`/accounts/${accountId}/analytics/${type}/activity`, { params });
    return response.data;
  }

  // Rubrics API
  async getRubric(courseId: string, rubricId: string, options: CanvasAPIOptions = {}): Promise<CanvasResponse> {
    const params = this.buildParams(options);
    const response = await this.client.get(`/courses/${courseId}/rubrics/${rubricId}`, { params });
    return response.data;
  }

  // Utility methods
  private buildParams(options: CanvasAPIOptions): any {
    const params: any = {};
    
    if (options.include && options.include.length > 0) {
      params.include = options.include.join(',');
    }
    
    if (options.per_page) {
      params.per_page = options.per_page;
    }
    
    if (options.page) {
      params.page = options.page;
    }
    
    if (options.search) {
      params.search = options.search;
    }
    
    if (options.context) {
      params.context = options.context;
    }
    
    if (options.type) {
      params.type = options.type;
    }

    // Include any additional parameters
    Object.keys(options).forEach(key => {
      if (!['include', 'per_page', 'page', 'search', 'context', 'type'].includes(key)) {
        params[key] = options[key];
      }
    });

    return params;
  }

  // Batch request helper
  async batchRequests(requests: Array<{ method: string; url: string; data?: any; params?: any }>): Promise<any[]> {
    const promises = requests.map(request => {
      const config: AxiosRequestConfig = {
        method: request.method,
        url: request.url,
        data: request.data,
        params: request.params
      };
      return this.client.request(config).then(r => r.data).catch(e => ({ error: e.message }));
    });

    return Promise.all(promises);
  }
}

// Singleton instance
export const canvasAPI = new CanvasAPIClient();

export default canvasAPI;