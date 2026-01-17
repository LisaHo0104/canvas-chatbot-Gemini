'use client'

import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ProgressTrackerProps {
  steps: Array<{
    id: string
    title: string
    status?: 'pending' | 'in_progress' | 'completed'
  }>
  overallProgress?: number
}

export function ProgressTracker({ steps, overallProgress }: ProgressTrackerProps) {
  const completedCount = steps.filter(s => s.status === 'completed').length
  const inProgressCount = steps.filter(s => s.status === 'in_progress').length
  const pendingCount = steps.filter(s => s.status === 'pending' || !s.status).length

  const calculatedProgress = overallProgress ?? (steps.length > 0 
    ? Math.round((completedCount / steps.length) * 100) 
    : 0)

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Progress</h3>
        <span className="text-sm text-muted-foreground">{calculatedProgress}%</span>
      </div>
      
      <Progress value={calculatedProgress} className="h-2" />
      
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span>{completedCount} Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600" />
          <span>{inProgressCount} In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-gray-400" />
          <span>{pendingCount} Pending</span>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2">
            {step.status === 'completed' && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            {step.status === 'in_progress' && (
              <Clock className="h-4 w-4 text-yellow-600" />
            )}
            {(step.status === 'pending' || !step.status) && (
              <Circle className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm flex-1">{step.title}</span>
            <Badge variant="outline" className="text-xs">
              {step.status === 'completed' ? 'Completed' : 
               step.status === 'in_progress' ? 'In Progress' : 
               'Pending'}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
