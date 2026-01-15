'use client'

import { useState, useMemo } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock,
  Target,
  Coffee
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { StudyCalendarViewProps, StudyPlanMilestone, MilestoneProgress } from '@/types/study-plan'
import { PRIORITY_COLORS, STATUS_COLORS } from '@/types/study-plan'

type ViewType = 'month' | 'week'

export function StudyCalendarView({ 
  schedule, 
  milestones, 
  progress = [], 
  startDate, 
  targetDate,
  onMilestoneClick 
}: StudyCalendarViewProps) {
  const [viewType, setViewType] = useState<ViewType>('month')
  const [currentDate, setCurrentDate] = useState(new Date(startDate))

  // Get milestone by ID
  const getMilestone = (id: string): StudyPlanMilestone | undefined => {
    return milestones.find(m => m.id === id)
  }

  // Get progress for milestone
  const getProgress = (milestoneId: string): MilestoneProgress | undefined => {
    return progress.find(p => p.milestone_id === milestoneId)
  }

  // Generate calendar days for the month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const startPadding = firstDay.getDay() // 0 = Sunday
    const daysInMonth = lastDay.getDate()
    
    const days: { date: Date; isCurrentMonth: boolean }[] = []
    
    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false })
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      days.push({ date, isCurrentMonth: true })
    }
    
    // Next month padding to complete the grid
    const remaining = 42 - days.length // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false })
    }
    
    return days
  }, [currentDate])

  // Generate week days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)
    
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push(date)
    }
    
    return days
  }, [currentDate])

  // Get schedule entry for a date
  const getScheduleForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return schedule.find(s => s.date === dateStr)
  }

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Check if date is the target date
  const isTargetDate = (date: Date) => {
    if (!targetDate) return false
    return date.toDateString() === new Date(targetDate).toDateString()
  }

  // Navigate calendar
  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewType === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    }
    setCurrentDate(newDate)
  }

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Format month/year header
  const formatHeader = () => {
    if (viewType === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    const startOfWeek = weekDays[0]
    const endOfWeek = weekDays[6]
    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`
    }
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  // Render day cell content
  const renderDayCell = (date: Date, isCompact: boolean = false) => {
    const scheduleEntry = getScheduleForDate(date)
    const today = isToday(date)
    const target = isTargetDate(date)

    return (
      <Popover>
        <PopoverTrigger asChild>
          <div
            className={`
              ${isCompact ? 'h-20 p-1' : 'min-h-24 p-2'}
              rounded-lg border transition-colors cursor-pointer
              ${today ? 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' : ''}
              ${target ? 'ring-2 ring-red-500 bg-red-50/50 dark:bg-red-950/30' : ''}
              ${scheduleEntry?.isRestDay ? 'bg-gray-50 dark:bg-gray-900/50' : ''}
              hover:bg-muted/50
            `}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${today ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {date.getDate()}
              </span>
              {scheduleEntry && !scheduleEntry.isRestDay && (
                <span className="text-xs text-muted-foreground">
                  {scheduleEntry.totalHours}h
                </span>
              )}
            </div>

            {scheduleEntry?.isRestDay && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Coffee className="size-3" />
                <span>Rest</span>
              </div>
            )}

            {scheduleEntry && !scheduleEntry.isRestDay && scheduleEntry.milestoneIds.length > 0 && (
              <div className="mt-1 space-y-1">
                {scheduleEntry.milestoneIds.slice(0, isCompact ? 2 : 3).map(id => {
                  const milestone = getMilestone(id)
                  const prog = getProgress(id)
                  if (!milestone) return null
                  
                  const priorityColors = PRIORITY_COLORS[milestone.priority]
                  const statusColors = prog ? STATUS_COLORS[prog.status] : STATUS_COLORS.not_started

                  return (
                    <div
                      key={id}
                      className={`
                        px-1.5 py-0.5 rounded text-xs truncate
                        ${priorityColors.bg} ${priorityColors.text}
                        ${prog?.status === 'completed' ? 'line-through opacity-60' : ''}
                      `}
                      title={milestone.title}
                    >
                      {milestone.title}
                    </div>
                  )
                })}
                {scheduleEntry.milestoneIds.length > (isCompact ? 2 : 3) && (
                  <div className="text-xs text-muted-foreground">
                    +{scheduleEntry.milestoneIds.length - (isCompact ? 2 : 3)} more
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">
                {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h4>
              {today && <Badge className="bg-emerald-100 text-emerald-800">Today</Badge>}
              {target && <Badge className="bg-red-100 text-red-800">Target</Badge>}
            </div>

            {scheduleEntry?.isRestDay ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <Coffee className="size-5 text-muted-foreground" />
                <span className="text-muted-foreground">Rest Day - Take a break!</span>
              </div>
            ) : scheduleEntry ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  <span>{scheduleEntry.totalHours} hours scheduled</span>
                </div>
                
                <div className="space-y-2">
                  {scheduleEntry.milestoneIds.map(id => {
                    const milestone = getMilestone(id)
                    const prog = getProgress(id)
                    if (!milestone) return null

                    const priorityColors = PRIORITY_COLORS[milestone.priority]
                    const statusColors = prog ? STATUS_COLORS[prog.status] : STATUS_COLORS.not_started

                    return (
                      <div
                        key={id}
                        className={`p-2 rounded-lg border cursor-pointer hover:bg-muted/50 ${statusColors.border}`}
                        onClick={() => onMilestoneClick?.(id)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={priorityColors.badge} variant="outline">
                            {milestone.priority}
                          </Badge>
                          <span className={`text-sm font-medium ${prog?.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {milestone.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          <span>{milestone.estimatedHours}h</span>
                          <Badge className={statusColors.bg + ' ' + statusColors.text} variant="outline">
                            {prog?.status || 'not started'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No activities scheduled</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="size-5" />
            {formatHeader()}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border p-1">
              <Button
                variant={viewType === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('month')}
                className="h-7 px-2 text-xs"
              >
                Month
              </Button>
              <Button
                variant={viewType === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('week')}
                className="h-7 px-2 text-xs"
              >
                Week
              </Button>
            </div>

            {/* Navigation */}
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {viewType === 'month' ? (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, isCurrentMonth }, i) => (
              <div key={i} className={!isCurrentMonth ? 'opacity-30' : ''}>
                {renderDayCell(date, true)}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date, i) => (
              <div key={i}>
                {renderDayCell(date, false)}
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
            <span>High Priority</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" />
            <span>Medium Priority</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
            <span>Low Priority</span>
          </div>
          <div className="flex items-center gap-1">
            <Coffee className="size-3" />
            <span>Rest Day</span>
          </div>
          {targetDate && (
            <div className="flex items-center gap-1">
              <Target className="size-3 text-red-500" />
              <span>Target Date</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
