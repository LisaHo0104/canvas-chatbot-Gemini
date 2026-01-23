'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  label: string
  completed: boolean
  current: boolean
}

interface StudyRoadmapProgressProps {
  currentStep: 'course' | 'modules' | 'questions' | 'timeline'
}

export function StudyRoadmapProgress({ currentStep }: StudyRoadmapProgressProps) {
  const steps: Step[] = [
    { id: 'course', label: 'Select Course', completed: currentStep !== 'course', current: currentStep === 'course' },
    { id: 'modules', label: 'Select Modules', completed: ['questions', 'timeline'].includes(currentStep), current: currentStep === 'modules' },
    { id: 'questions', label: 'Answer Questions', completed: currentStep === 'timeline', current: currentStep === 'questions' },
    { id: 'timeline', label: 'View Timeline', completed: false, current: currentStep === 'timeline' },
  ]

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                  step.completed
                    ? "bg-primary border-primary text-primary-foreground"
                    : step.current
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-muted text-muted-foreground"
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs text-center",
                  step.current ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-2 -mt-6",
                  step.completed ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
