/**
 * Study Plan Types
 * 
 * Interfaces for study plan generation, rendering, and progress tracking.
 */

/**
 * Resource reference within a milestone
 */
export interface StudyPlanResource {
  type: 'module' | 'assignment' | 'page' | 'file'
  name: string
  url?: string
}

/**
 * Individual study task within a milestone
 */
export interface StudyTask {
  id: string
  task: string
  duration: number // minutes
  taskType: 'read' | 'practice' | 'review' | 'quiz'
}

/**
 * A milestone represents a significant chunk of study work
 */
export interface StudyPlanMilestone {
  id: string
  title: string
  description: string
  topics: string[]
  estimatedHours: number
  priority: 'high' | 'medium' | 'low'
  suggestedOrder: number
  scheduledDate?: string // ISO date for calendar view
  resources: StudyPlanResource[]
  studyTasks: StudyTask[]
}

/**
 * Calendar schedule entry for a specific day
 */
export interface CalendarScheduleEntry {
  date: string // ISO date
  milestoneIds: string[]
  totalHours: number
  isRestDay?: boolean
}

/**
 * Overview statistics for the study plan dashboard
 */
export interface StudyPlanOverview {
  totalDays: number
  studyDays: number
  restDays: number
  avgHoursPerDay: number
  peakDay?: string // date with most hours
}

/**
 * Metadata about the study plan generation
 */
export interface StudyPlanMetadata {
  sourcesUsed?: string[]
  generatedAt: string
}

/**
 * The main study plan output interface
 */
export interface StudyPlanOutput {
  title: string
  description?: string
  planType: 'exam_prep' | 'course_mastery' | 'assignment_focused'
  startDate: string // ISO date when plan starts
  targetDate?: string // deadline for exam/assignment
  totalEstimatedHours: number
  milestones: StudyPlanMilestone[]
  calendarSchedule: CalendarScheduleEntry[]
  overview: StudyPlanOverview
  metadata?: StudyPlanMetadata
}

/**
 * Study plan proposal for user approval (before full generation)
 */
export interface StudyPlanProposal {
  sources: {
    courses?: Array<{ id: number; name: string }>
    modules?: Array<{ id: number; name: string; courseId: number }>
    assignments?: Array<{ id: number; name: string; courseId: number }>
  }
  planType: 'exam_prep' | 'course_mastery' | 'assignment_focused'
  estimatedMilestones: number
  estimatedHours: number
  topics: string[]
  startDate: string
  targetDate?: string
  userPrompt?: string
}

/**
 * Progress status for a milestone
 */
export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed'

/**
 * Progress record for a single milestone
 */
export interface MilestoneProgress {
  id: string
  user_id: string
  artifact_id: string
  milestone_id: string
  status: MilestoneStatus
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Props for the StudyPlanUI component
 */
export interface StudyPlanUIProps {
  data: StudyPlanOutput
  messageId?: string
  compact?: boolean
  onViewFull?: () => void
  onSaveClick?: () => void
  artifactId?: string
  progress?: MilestoneProgress[]
}

/**
 * Props for the MilestoneCard component
 */
export interface MilestoneCardProps {
  milestone: StudyPlanMilestone
  progress?: MilestoneProgress
  onStatusChange?: (milestoneId: string, status: MilestoneStatus) => void
  onNotesChange?: (milestoneId: string, notes: string) => void
  isCompact?: boolean
}

/**
 * Props for the StudyCalendarView component
 */
export interface StudyCalendarViewProps {
  schedule: CalendarScheduleEntry[]
  milestones: StudyPlanMilestone[]
  progress?: MilestoneProgress[]
  startDate: string
  targetDate?: string
  onMilestoneClick?: (milestoneId: string) => void
}

/**
 * Props for the StudyPlanModal component
 */
export interface StudyPlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: StudyPlanOutput
  messageId?: string
  artifactId?: string
  progress?: MilestoneProgress[]
}

/**
 * Priority colors for visual styling
 */
export const PRIORITY_COLORS = {
  high: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  medium: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  low: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
} as const

/**
 * Status colors for milestone progress
 */
export const STATUS_COLORS = {
  not_started: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
  in_progress: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  completed: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
} as const

/**
 * Task type icons and colors
 */
export const TASK_TYPE_CONFIG = {
  read: {
    icon: 'BookOpen',
    color: 'text-blue-600 dark:text-blue-400',
    label: 'Reading',
  },
  practice: {
    icon: 'PenTool',
    color: 'text-purple-600 dark:text-purple-400',
    label: 'Practice',
  },
  review: {
    icon: 'RefreshCw',
    color: 'text-amber-600 dark:text-amber-400',
    label: 'Review',
  },
  quiz: {
    icon: 'FileQuestion',
    color: 'text-emerald-600 dark:text-emerald-400',
    label: 'Quiz',
  },
} as const
