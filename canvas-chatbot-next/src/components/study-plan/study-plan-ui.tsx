'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Target, 
  BookOpen, 
  Maximize2, 
  Save,
  ArrowRight,
  TrendingUp,
  CalendarDays
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MilestoneCard } from './milestone-card'
import { StudyCalendarView } from './study-calendar-view'
import type { 
  StudyPlanOutput, 
  MilestoneProgress, 
  MilestoneStatus,
  StudyPlanUIProps 
} from '@/types/study-plan'

type ViewMode = 'welcome' | 'overview' | 'milestones' | 'calendar'

export function StudyPlanUI({ 
  data, 
  messageId, 
  compact = false, 
  onViewFull, 
  onSaveClick,
  artifactId,
  progress = []
}: StudyPlanUIProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(compact ? 'overview' : 'welcome')
  const [localProgress, setLocalProgress] = useState<MilestoneProgress[]>(progress)
  const [activeTab, setActiveTab] = useState<string>('overview')

  // Sync with prop changes
  useEffect(() => {
    setLocalProgress(progress)
  }, [progress])

  // Calculate progress statistics
  const progressStats = useMemo(() => {
    const completed = localProgress.filter(p => p.status === 'completed').length
    const inProgress = localProgress.filter(p => p.status === 'in_progress').length
    const total = data.milestones.length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0

    const completedHours = data.milestones
      .filter(m => localProgress.find(p => p.milestone_id === m.id && p.status === 'completed'))
      .reduce((sum, m) => sum + m.estimatedHours, 0)

    return { completed, inProgress, total, percent, completedHours }
  }, [localProgress, data.milestones])

  // Calculate days remaining
  const daysRemaining = useMemo(() => {
    if (!data.targetDate) return null
    const target = new Date(data.targetDate)
    const today = new Date()
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }, [data.targetDate])

  // Handle milestone status change
  const handleStatusChange = async (milestoneId: string, status: MilestoneStatus) => {
    // Optimistic update
    setLocalProgress(prev => {
      const existing = prev.find(p => p.milestone_id === milestoneId)
      if (existing) {
        return prev.map(p => 
          p.milestone_id === milestoneId 
            ? { ...p, status, completed_at: status === 'completed' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }
            : p
        )
      }
      // Create new progress entry
      return [...prev, {
        id: crypto.randomUUID(),
        user_id: '',
        artifact_id: artifactId || '',
        milestone_id: milestoneId,
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]
    })

    // Persist to API if we have an artifact ID
    if (artifactId) {
      try {
        await fetch('/api/study-plan-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artifact_id: artifactId,
            milestone_id: milestoneId,
            status,
          }),
        })
      } catch (error) {
        console.error('Failed to save progress:', error)
      }
    }
  }

  // Handle notes change
  const handleNotesChange = async (milestoneId: string, notes: string) => {
    setLocalProgress(prev => {
      const existing = prev.find(p => p.milestone_id === milestoneId)
      if (existing) {
        return prev.map(p => 
          p.milestone_id === milestoneId 
            ? { ...p, notes, updated_at: new Date().toISOString() }
            : p
        )
      }
      return prev
    })

    if (artifactId) {
      try {
        await fetch('/api/study-plan-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artifact_id: artifactId,
            milestone_id: milestoneId,
            notes,
          }),
        })
      } catch (error) {
        console.error('Failed to save notes:', error)
      }
    }
  }

  const getPlanTypeLabel = (type: string) => {
    switch (type) {
      case 'exam_prep': return 'Exam Preparation'
      case 'course_mastery': return 'Course Mastery'
      case 'assignment_focused': return 'Assignment Focused'
      default: return type
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Welcome Screen
  const renderWelcomeScreen = () => (
    <div className="w-full max-w-3xl mx-auto py-8 lg:py-12">
      <Card className="text-center border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-6 lg:pb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <Calendar className="size-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <CardTitle className="text-2xl lg:text-3xl mb-2">{data.title}</CardTitle>
          {data.description && (
            <CardDescription className="text-base lg:text-lg mt-2">
              {data.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-sm lg:text-base px-4 py-2" variant="outline">
              {getPlanTypeLabel(data.planType)}
            </Badge>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="size-4" />
              <span className="text-sm lg:text-base">{data.milestones.length} Milestones</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4" />
              <span className="text-sm lg:text-base">{data.totalEstimatedHours}h total</span>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex items-center justify-center gap-4 text-sm lg:text-base">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>{formatDate(data.startDate)}</span>
            </div>
            {data.targetDate && (
              <>
                <ArrowRight className="size-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{formatDate(data.targetDate)}</span>
                </div>
              </>
            )}
          </div>

          {daysRemaining !== null && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                {daysRemaining} days until target date
              </p>
            </div>
          )}

          <Button
            onClick={() => setViewMode('overview')}
            size="lg"
            className="w-full sm:w-auto min-w-[200px] h-12 text-base lg:text-lg bg-emerald-600 hover:bg-emerald-700"
          >
            Start Studying
            <ArrowRight className="ml-2 size-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  // Overview Dashboard
  const renderOverviewDashboard = () => (
    <div className="space-y-6">
      {/* Progress Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progressStats.percent}%</p>
                <p className="text-xs text-muted-foreground">Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <Target className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progressStats.completed}/{progressStats.total}</p>
                <p className="text-xs text-muted-foreground">Milestones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                <Clock className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progressStats.completedHours}h</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {daysRemaining !== null && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                  <CalendarDays className="size-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{daysRemaining}</p>
                  <p className="text-xs text-muted-foreground">Days Left</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{progressStats.percent}%</span>
            </div>
            <Progress value={progressStats.percent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="size-5" />
            Upcoming Milestones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.milestones
            .filter(m => {
              const progress = localProgress.find(p => p.milestone_id === m.id)
              return !progress || progress.status !== 'completed'
            })
            .slice(0, 3)
            .map(milestone => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                progress={localProgress.find(p => p.milestone_id === milestone.id)}
                onStatusChange={handleStatusChange}
                onNotesChange={handleNotesChange}
                isCompact
              />
            ))}
          {data.milestones.filter(m => {
            const progress = localProgress.find(p => p.milestone_id === m.id)
            return !progress || progress.status !== 'completed'
          }).length === 0 && (
            <div className="text-center py-8">
              <Image
                src="/dog_correct.png"
                alt="All done!"
                width={80}
                height={80}
                className="mx-auto mb-4"
              />
              <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400">
                All milestones completed! 🎉
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // Milestones Tab
  const renderMilestonesTab = () => (
    <div className="space-y-4">
      {data.milestones
        .sort((a, b) => a.suggestedOrder - b.suggestedOrder)
        .map(milestone => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            progress={localProgress.find(p => p.milestone_id === milestone.id)}
            onStatusChange={handleStatusChange}
            onNotesChange={handleNotesChange}
          />
        ))}
    </div>
  )

  // Compact view
  if (compact) {
    return (
      <Card className="w-full border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5 text-emerald-600 dark:text-emerald-400" />
                {data.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 flex-wrap">
                <span>{data.milestones.length} Milestones</span>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  {getPlanTypeLabel(data.planType)}
                </Badge>
                <span className="flex items-center gap-1">
                  <Clock className="size-4" />
                  {data.totalEstimatedHours}h
                </span>
              </CardDescription>
            </div>
            {onSaveClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveClick}
                className="flex items-center gap-2"
              >
                <Save className="size-4" />
                Save to Artifactory
              </Button>
            )}
          </div>
        </CardHeader>
        {data.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{data.description}</p>
          </CardContent>
        )}
        <CardContent>
          <Button
            onClick={onViewFull}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            <Maximize2 className="size-4 mr-2" />
            View Full Study Plan
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Full view
  if (viewMode === 'welcome') {
    return renderWelcomeScreen()
  }

  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Header */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-4 lg:pb-6">
          <CardTitle className="flex items-center gap-2 text-xl lg:text-2xl">
            <Calendar className="size-5 lg:size-6 text-emerald-600 dark:text-emerald-400" />
            {data.title}
          </CardTitle>
          <CardDescription className="flex items-center gap-4 flex-wrap text-sm lg:text-base mt-2">
            <span>{data.milestones.length} Milestones</span>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              {getPlanTypeLabel(data.planType)}
            </Badge>
            <span className="flex items-center gap-1">
              <Clock className="size-4" />
              {data.totalEstimatedHours}h total
            </span>
            {daysRemaining !== null && (
              <span className="flex items-center gap-1">
                <Target className="size-4" />
                {daysRemaining} days left
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-10 lg:h-11">
          <TabsTrigger value="overview" className="text-sm lg:text-base">Overview</TabsTrigger>
          <TabsTrigger value="milestones" className="text-sm lg:text-base">Milestones</TabsTrigger>
          <TabsTrigger value="calendar" className="text-sm lg:text-base">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 lg:mt-6">
          {renderOverviewDashboard()}
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 lg:mt-6">
          {renderMilestonesTab()}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4 lg:mt-6">
          <StudyCalendarView
            schedule={data.calendarSchedule}
            milestones={data.milestones}
            progress={localProgress}
            startDate={data.startDate}
            targetDate={data.targetDate}
            onMilestoneClick={(id) => {
              setActiveTab('milestones')
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
