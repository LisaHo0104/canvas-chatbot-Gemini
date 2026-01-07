'use client'

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Criterion } from './interactive-checklist'

interface RubricProgressProps {
  criteria: Criterion[]
  messageId: string
}

export function RubricProgress({ criteria, messageId }: RubricProgressProps) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    const saved = localStorage.getItem(`rubric-checklist-${messageId}`)
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

  useEffect(() => {
    const handleStorage = () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`rubric-checklist-${messageId}`)
        setChecked(saved ? new Set(JSON.parse(saved)) : new Set())
      }
    }
    window.addEventListener('storage', handleStorage)
    const interval = setInterval(handleStorage, 500)
    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [messageId])

  const totalRequirements = criteria.reduce(
    (sum, c) => sum + c.hdRequirements.length,
    0
  )
  const completed = checked.size
  const percentage = totalRequirements > 0 ? (completed / totalRequirements) * 100 : 0

  if (totalRequirements === 0) {
    return null
  }

  return (
    <div className="space-y-2 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
      <div className="flex justify-between text-sm">
        <span className="font-medium">
          Progress: {completed}/{totalRequirements} requirements
        </span>
        <span className="font-semibold">{Math.round(percentage)}%</span>
      </div>
      <Progress value={percentage} />
      {percentage === 100 && (
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
          🎉 All requirements understood!
        </p>
      )}
    </div>
  )
}

