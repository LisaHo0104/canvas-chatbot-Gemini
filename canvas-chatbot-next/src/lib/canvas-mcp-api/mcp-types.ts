/**
 * Model Context Protocol (MCP) Types and Interfaces
 * Defines the core types for function calling infrastructure
 */

// Function parameter types
export type McpParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object';

// Function parameter definition
export interface McpParameter {
  type: McpParameterType;
  description: string;
  required?: boolean;
  default?: any;
  enum?: any[];
  items?: McpParameter; // For array types
  properties?: Record<string, McpParameter>; // For object types
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    minItems?: number;
    maxItems?: number;
  };
}

// Function definition
export interface McpFunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, McpParameter>;
  returns: {
    type: McpParameterType;
    description: string;
  };
  category: string;
  tags?: string[];
  deprecated?: boolean;
  examples?: McpFunctionExample[];
  implementation?: (params: Record<string, any>, context: McpCallContext | any) => Promise<McpFunctionResult>;
}

// Function example
export interface McpFunctionExample {
  description: string;
  parameters: Record<string, any>;
  expectedResult?: any;
}

// Function call request
export interface McpFunctionCall {
  id: string;
  function: string;
  parameters: Record<string, any>;
  context?: McpCallContext;
  timeout?: number;
}

// Function call context
export interface McpCallContext {
  userId?: string;
  courseId?: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
  requestId?: string;
  timestamp: string;
}

// Function call result
export interface McpFunctionResult {
  success: boolean;
  data?: any;
  error?: McpFunctionError;
  metadata: {
    duration: number;
    timestamp: string;
    functionName: string;
    callId: string;
    cacheHit?: boolean;
  };
}

// Function error
export interface McpFunctionError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  fallbackAvailable?: boolean;
}

// Function execution options
export interface McpExecutionOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTtl?: number;
  fallback?: boolean;
  async?: boolean;
}

// Function registry
export interface McpFunctionRegistry {
  register(functionDef: McpFunctionDefinition): void;
  unregister(functionName: string): void;
  get(functionName: string): McpFunctionDefinition | undefined;
  list(): McpFunctionDefinition[];
  listByCategory(category: string): McpFunctionDefinition[];
  listByTag(tag: string): McpFunctionDefinition[];
}

// Function executor
export interface McpFunctionExecutor {
  execute(call: McpFunctionCall, options?: McpExecutionOptions): Promise<McpFunctionResult>;
  executeBatch(calls: McpFunctionCall[], options?: McpExecutionOptions): Promise<McpFunctionResult[]>;
  validate(functionName: string, parameters: Record<string, any>): boolean;
}

// Function middleware
export interface McpFunctionMiddleware {
  before?(call: McpFunctionCall, context: McpCallContext): Promise<McpFunctionCall>;
  after?(result: McpFunctionResult, context: McpCallContext): Promise<McpFunctionResult>;
  onError?(error: McpFunctionError, context: McpCallContext): Promise<McpFunctionError>;
}

// Function monitor
export interface McpFunctionMonitor {
  recordExecution(result: McpFunctionResult, context: McpCallContext): void;
  getMetrics(functionName?: string): McpFunctionMetrics;
  getHealth(): McpHealthStatus;
}

// Function metrics
export interface McpFunctionMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageDuration: number;
  errorRate: number;
  cacheHitRate: number;
  functionMetrics: Record<string, {
    calls: number;
    successes: number;
    failures: number;
    avgDuration: number;
    lastCalled: string;
  }>;
}

// Health status
export interface McpHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Record<string, {
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    lastChecked: string;
  }>;
}

// Canvas-specific function definitions
export interface CanvasFunctionDefinitions {
  // User functions
  'canvas.getUser': McpFunctionDefinition;
  'canvas.searchUsers': McpFunctionDefinition;
  'canvas.getUserPageViews': McpFunctionDefinition;
  
  // Course functions
  'canvas.getCourse': McpFunctionDefinition;
  'canvas.searchCourses': McpFunctionDefinition;
  'canvas.getCourseAssignments': McpFunctionDefinition;
  'canvas.getCourseStudents': McpFunctionDefinition;
  
  // Assignment functions
  'canvas.getAssignment': McpFunctionDefinition;
  'canvas.createAssignment': McpFunctionDefinition;
  'canvas.updateAssignment': McpFunctionDefinition;
  'canvas.deleteAssignment': McpFunctionDefinition;
  
  // AI Experience functions
  'canvas.getAIExperiences': McpFunctionDefinition;
  'canvas.createAIExperience': McpFunctionDefinition;
  'canvas.updateAIExperience': McpFunctionDefinition;
  'canvas.deleteAIExperience': McpFunctionDefinition;
  
  // AI Conversation functions
  'canvas.getAIConversations': McpFunctionDefinition;
  'canvas.createAIConversation': McpFunctionDefinition;
  'canvas.postAIMessage': McpFunctionDefinition;
  'canvas.deleteAIConversation': McpFunctionDefinition;
  
  // Smart Search functions
  'canvas.smartSearch': McpFunctionDefinition;
  
  // Analytics functions
  'canvas.getAnalytics': McpFunctionDefinition;
  'canvas.getCourseAnalytics': McpFunctionDefinition;
  'canvas.getUserAnalytics': McpFunctionDefinition;
}

// Canvas-specific types
export interface CanvasUser {
  id: number;
  name: string;
  email: string;
  login_id: string;
  avatar_url?: string;
  bio?: string;
  time_zone?: string;
  locale?: string;
  effective_locale?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  workflow_state: string;
  account_id: number;
  root_account_id: number;
  enrollment_term_id: number;
  grading_standard_id?: number;
  grade_passback_setting?: string;
  created_at: string;
  start_at?: string;
  end_at?: string;
  enrollments?: any[];
  total_students?: number;
  calendar?: any;
  default_view: string;
  syllabus_body?: string;
  needs_grading_count?: number;
  term?: any;
  course_progress?: any;
  apply_assignment_group_weights: boolean;
  permissions?: any;
  is_public: boolean;
  is_public_to_auth_users: boolean;
  public_syllabus: boolean;
  public_syllabus_to_auth: boolean;
  storage_quota_mb: number;
  storage_quota_used_mb: number;
  hide_final_grades: boolean;
  license: string;
  allow_student_assignment_edits: boolean;
  allow_wiki_comments: boolean;
  allow_student_forum_attachments: boolean;
  open_enrollment: boolean;
  self_enrollment: boolean;
  restrict_enrollments_to_course_dates: boolean;
  course_format: string;
  access_restricted_by_date: boolean;
  blueprint: boolean;
  blueprint_restrictions?: any;
  blueprint_restrictions_by_object_type?: any;
  template: boolean;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  due_at?: string;
  lock_at?: string;
  unlock_at?: string;
  has_overrides: boolean;
  all_dates?: any[];
  course_id: number;
  html_url: string;
  submissions_download_url: string;
  assignment_group_id: number;
  due_date_required: boolean;
  allowed_extensions: string[];
  max_name_length: number;
  turnitin_enabled: boolean;
  vericite_enabled: boolean;
  submission_types: string[];
  has_submitted_submissions: boolean;
  graders_assignment_view_override: boolean;
  grading_type: string;
  grading_standard_id?: number;
  published: boolean;
  muted: boolean;
  group_category_id?: number;
  wiki_page?: any;
  only_visible_to_overrides: boolean;
  anonymous_submissions: boolean;
  anonymous_grading: boolean;
  moderated_grading: boolean;
  grader_count: number;
  grader_comments_visible_to_graders: boolean;
  final_grader_id?: number;
  grader_names_visible_to_final_grader: boolean;
  anonymous_grading_enabled: boolean;
  allowed_attempts: number;
  post_to_sis: boolean;
  integration_id?: string;
  integration_data?: any;
  peer_reviews: boolean;
  automatic_peer_reviews: boolean;
  peer_review_count: number;
  peer_reviews_assign_at?: string;
  intra_group_peer_reviews: boolean;
  needs_grading_count: number;
  points_possible: number;
  submission?: any;
}

export interface CanvasSubmission {
  id: number;
  body?: string;
  url?: string;
  grade?: string;
  score?: number;
  submitted_at?: string;
  assignment_id: number;
  user_id: number;
  submission_type?: string;
  workflow_state: string;
  grade_matches_current_submission: boolean;
  graded_at?: string;
  grader_id?: number;
  preview_url: string;
  anonymous_id?: string;
  external_tool_url?: string;
  late: boolean;
  missing: boolean;
  seconds_late: number;
  excused: boolean;
  entered_score?: number;
  entered_grade?: string;
  posted_at?: string;
  read_status?: string;
  redo_request: boolean;
  late_policy_status?: string;
  points_deducted?: number;
  grading_period_id?: number;
  extra_attempts?: number;
  anonymous_submission: boolean;
  attachments?: any[];
  discussion_entries?: any[];
  media_comment?: any;
  user?: any;
  assignment?: any;
  course?: any;
  rubric_assessment?: any;
  submission_comments?: any[];
  submission_history?: any[];
  submission_versioned_attachments?: any[];
}

export interface CanvasSearchResult {
  id: number;
  name: string;
  type: 'course' | 'user' | 'assignment' | 'file' | 'page' | 'discussion' | 'announcement';
  url: string;
  html_url: string;
  context_name?: string;
  context_type?: string;
  score?: number;
  last_activity_at?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  avatar_image_url?: string;
  readable_type?: string;
}

export interface CanvasPageView {
  id: number;
  app_name?: string;
  url: string;
  context_type: string;
  asset_type?: string;
  controller: string;
  action: string;
  contributed: boolean;
  interaction_seconds?: number;
  created_at: string;
  user_request?: boolean;
  render_time?: number;
  user_agent?: string;
  http_method: string;
  remote_ip?: string;
  links?: any;
  participated: boolean;
  summarized_at?: string;
}

export interface CanvasContentExport {
  id: number;
  created_at: string;
  export_type: string;
  user_id: number;
  course_id: number;
  workflow_state: string;
  progress_url: string;
  attachment?: any;
}

export interface CanvasAnalytics {
  id: number;
  name: string;
  value: number;
  type: string;
  context_type: string;
  context_id: number;
  created_at: string;
  updated_at: string;
}

export interface CanvasRubric {
  id: number;
  title: string;
  context_id: number;
  context_type: string;
  points_possible: number;
  reusable: boolean;
  public: boolean;
  read_only: boolean;
  free_form_criterion_comments: boolean;
  hide_score_total: boolean;
  hide_points: boolean;
  criteria?: any[];
  associations?: any[];
}

export interface CanvasDiscussion {
  id: number;
  title: string;
  message?: string;
  delayed_post_at?: string;
  posted_at?: string;
  assignment_id?: number;
  last_reply_at?: string;
  require_initial_post: boolean;
  user_can_see_posts: boolean;
  discussion_subentry_count: number;
  read_state: string;
  unread_count: number;
  subscribed: boolean;
  subscription_hold?: string;
  assignment?: any;
  topic_children?: number[];
  attachments?: any[];
  podcast_url?: string;
  podcast_has_student_posts: boolean;
  user_name?: string;
  discussion_type: string;
  group_category_id?: number;
  only_graders_can_rate: boolean;
  allow_rating: boolean;
  sort_by_rating: boolean;
  locked: boolean;
  locked_for_user: boolean;
  lock_info?: any;
  lock_explanation?: string;
  user?: any;
  html_url: string;
  url: string;
  pinned: boolean;
  position: number;
  group_topic_children?: any[];
}

export interface CanvasFile {
  id: number;
  uuid: string;
  folder_id: number;
  display_name: string;
  filename: string;
  'content-type': string;
  url: string;
  size: number;
  created_at: string;
  updated_at: string;
  unlock_at?: string;
  locked: boolean;
  hidden: boolean;
  lock_at?: string;
  hidden_for_user: boolean;
  thumbnail_url?: string;
  modified_at: string;
  mime_class: string;
  media_entry_id?: string;
  locked_for_user: boolean;
  lock_info?: any;
  lock_explanation?: string;
  preview_url?: string;
  attachment?: any;
}

// Export all types for convenience