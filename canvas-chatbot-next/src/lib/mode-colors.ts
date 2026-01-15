/**
 * Mode-specific color utilities for Quiz, Rubric Analysis, and Study Plan
 */

export type ModeType = 'quiz' | 'rubric' | 'study-plan' | null

/**
 * Get background and text color classes for a mode
 */
export function getModeColors(mode: ModeType): {
  bg: string
  text: string
  muted: string
  mutedText: string
  border: string
} {
  switch (mode) {
    case 'quiz':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-800 dark:text-blue-200',
        muted: 'bg-blue-50 dark:bg-blue-950',
        mutedText: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
      }
    case 'rubric':
      return {
        bg: 'bg-purple-100 dark:bg-purple-900',
        text: 'text-purple-800 dark:text-purple-200',
        muted: 'bg-purple-50 dark:bg-purple-950',
        mutedText: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
      }
    case 'study-plan':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-900',
        text: 'text-emerald-800 dark:text-emerald-200',
        muted: 'bg-emerald-50 dark:bg-emerald-950',
        mutedText: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
      }
    default:
      return {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        muted: 'bg-muted/50',
        mutedText: 'text-muted-foreground',
        border: 'border-border',
      }
  }
}

/**
 * Get badge color classes for a mode
 */
export function getModeBadgeColors(mode: ModeType): string {
  const colors = getModeColors(mode)
  return `${colors.bg} ${colors.text} ${colors.border}`
}

/**
 * Get button/icon color classes for a mode
 */
export function getModeButtonColors(mode: ModeType): string {
  const colors = getModeColors(mode)
  return `${colors.text}`
}

/**
 * Get artifact type from mode string
 */
export function getArtifactTypeFromMode(mode: string | null): 'quiz' | 'rubric_analysis' | 'study_plan' | null {
  if (mode === 'quiz') return 'quiz'
  if (mode === 'rubric') return 'rubric_analysis'
  if (mode === 'study-plan') return 'study_plan'
  return null
}

/**
 * Get mode from artifact type
 */
export function getModeFromArtifactType(artifactType: 'quiz' | 'rubric_analysis' | 'study_plan'): ModeType {
  if (artifactType === 'quiz') return 'quiz'
  if (artifactType === 'rubric_analysis') return 'rubric'
  if (artifactType === 'study_plan') return 'study-plan'
  return null
}
