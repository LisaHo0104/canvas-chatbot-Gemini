'use client'

import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface ChecklistItem {
  item: string
  priority: 'high' | 'medium' | 'low'
}

interface PriorityGroupedChecklistProps {
  items: ChecklistItem[]
  checkedItems: Set<number>
  onToggle: (index: number) => void
  completed: number
  total: number
}

export function PriorityGroupedChecklist({ items, checkedItems, onToggle, completed, total }: PriorityGroupedChecklistProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const circumference = 2 * Math.PI * 36 // radius = 36
  const offset = circumference - (percentage / 100) * circumference
  const groupedItems = {
    high: items
      .map((item, index) => ({ ...item, index }))
      .filter((item) => item.priority === 'high'),
    medium: items
      .map((item, index) => ({ ...item, index }))
      .filter((item) => item.priority === 'medium'),
    low: items
      .map((item, index) => ({ ...item, index }))
      .filter((item) => item.priority === 'low'),
  }

  const renderChecklistGroup = (
    title: string,
    items: Array<ChecklistItem & { index: number }>,
    borderColor: string,
    bgColor: string,
  ) => {
    if (items.length === 0) return null

    return (
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {title} ({items.length})
        </h4>
        {items.map(({ item, priority, index }) => {
          const isChecked = checkedItems.has(index)
          return (
            <label
              key={index}
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all duration-200 ${
                isChecked
                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                  : `${bgColor} ${borderColor} hover:opacity-80`
              }`}
            >
              <Checkbox
                checked={isChecked}
                onChange={() => onToggle(index)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm ${
                    isChecked
                      ? 'line-through text-muted-foreground'
                      : priority === 'high'
                        ? 'font-medium'
                        : ''
                  }`}
                >
                  {item}
                </span>
              </div>
              {isChecked && (
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              )}
            </label>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Action Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Ring */}
        <div className="flex flex-col items-center justify-center pb-4 border-b">
          <div className="relative inline-flex items-center justify-center">
            <svg className="transform -rotate-90" width="80" height="80">
              {/* Background circle */}
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="text-primary transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold">{completed}</div>
                <div className="text-xs text-muted-foreground">/{total}</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{percentage}% complete</p>
        </div>

        {/* Checklist Items */}
        <ScrollArea className="h-[500px] lg:h-[600px]">
          <div className="pr-4 space-y-4">
            {renderChecklistGroup(
              'High Priority',
              groupedItems.high,
              'border-l-4 border-red-500',
              'bg-red-50 dark:bg-red-950',
            )}
            {groupedItems.high.length > 0 && groupedItems.medium.length > 0 && <Separator />}
            {renderChecklistGroup(
              'Medium Priority',
              groupedItems.medium,
              'border-l-4 border-yellow-500',
              'bg-yellow-50 dark:bg-yellow-950',
            )}
            {groupedItems.medium.length > 0 && groupedItems.low.length > 0 && <Separator />}
            {renderChecklistGroup(
              'Low Priority',
              groupedItems.low,
              'border-l-4 border-blue-500',
              'bg-blue-50 dark:bg-blue-950',
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
