'use client'

import { useState, useEffect } from 'react'

export interface Criterion {
  id: string
  name: string
  explanation: string
  hdRequirements: string[]
  commonMistakes: string[]
}

interface InteractiveChecklistProps {
  criteria: Criterion[]
  messageId: string
}

export function InteractiveChecklist({ criteria, messageId }: InteractiveChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    const saved = localStorage.getItem(`rubric-checklist-${messageId}`)
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `rubric-checklist-${messageId}`,
        JSON.stringify([...checked])
      )
    }
  }, [checked, messageId])

  const toggleCheck = (reqId: string) => {
    const newChecked = new Set(checked)
    if (newChecked.has(reqId)) {
      newChecked.delete(reqId)
    } else {
      newChecked.add(reqId)
    }
    setChecked(newChecked)
  }

  const allRequirements = criteria.flatMap((c) =>
    c.hdRequirements.map((req, idx) => ({
      id: `${c.id}-${idx}`,
      criterionName: c.name,
      requirement: req,
    }))
  )

  if (allRequirements.length === 0) {
    return null
  }

  return (
    <div className="border rounded-lg p-4 space-y-2 bg-slate-50 dark:bg-slate-900">
      <h3 className="font-semibold text-sm mb-3">✅ HD/A Checklist (Interactive)</h3>
      <div className="space-y-2">
        {allRequirements.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded transition-colors"
          >
            <input
              type="checkbox"
              checked={checked.has(item.id)}
              onChange={() => toggleCheck(item.id)}
              className="mt-1 rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm flex-1">{item.requirement}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

