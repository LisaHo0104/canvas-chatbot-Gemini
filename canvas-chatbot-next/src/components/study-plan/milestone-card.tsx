'use client'

import { useState } from 'react'
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  BookOpen, 
  PenTool, 
  RefreshCw, 
  FileQuestion,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  StickyNote,
  Play
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { 
  MilestoneCardProps, 
  MilestoneStatus,
  StudyTask
} from '@/types/study-plan'
import { PRIORITY_COLORS, STATUS_COLORS, TASK_TYPE_CONFIG } from '@/types/study-plan'

const TaskTypeIcon = ({ type }: { type: StudyTask['taskType'] }) => {
  switch (type) {
    case 'read':
      return <BookOpen className="size-4" />
    case 'practice':
      return <PenTool className="size-4" />
    case 'review':
      return <RefreshCw className="size-4" />
    case 'quiz':
      return <FileQuestion className="size-4" />
    default:
      return <Circle className="size-4" />
  }
}

export function MilestoneCard({ 
  milestone, 
  progress, 
  onStatusChange, 
  onNotesChange,
  isCompact = false 
}: MilestoneCardProps) {
  const [isOpen, setIsOpen] = useState(!isCompact)
  const [showNotes, setShowNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(progress?.notes || '')

  const status: MilestoneStatus = progress?.status || 'not_started'
  const priorityColors = PRIORITY_COLORS[milestone.priority]
  const statusColors = STATUS_COLORS[status]

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
      case 'in_progress':
        return <Play className="size-5 text-blue-600 dark:text-blue-400" />
      default:
        return <Circle className="size-5 text-gray-400" />
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'in_progress': return 'In Progress'
      default: return 'Not Started'
    }
  }

  const handleStatusClick = () => {
    if (!onStatusChange) return
    
    // Cycle through statuses
    const nextStatus: MilestoneStatus = 
      status === 'not_started' ? 'in_progress' :
      status === 'in_progress' ? 'completed' : 'not_started'
    
    onStatusChange(milestone.id, nextStatus)
  }

  const handleNotesSave = () => {
    if (onNotesChange) {
      onNotesChange(milestone.id, notesValue)
    }
    setShowNotes(false)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Compact view for overview/list
  if (isCompact) {
    return (
      <div 
        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${statusColors.border}`}
        onClick={handleStatusClick}
      >
        <button 
          className="flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            handleStatusClick()
          }}
        >
          {getStatusIcon()}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-medium truncate ${status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
              {milestone.title}
            </h4>
            <Badge className={priorityColors.badge} variant="outline">
              {milestone.priority}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {milestone.estimatedHours}h
            </span>
            <span>{milestone.studyTasks.length} tasks</span>
          </div>
        </div>

        {milestone.scheduledDate && (
          <div className="text-sm text-muted-foreground">
            {new Date(milestone.scheduledDate).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        )}
      </div>
    )
  }

  // Full card view
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`transition-all ${statusColors.border} ${status === 'completed' ? 'opacity-75' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <button 
                className="flex-shrink-0 mt-1"
                onClick={handleStatusClick}
                title={`Click to change status (current: ${getStatusLabel()})`}
              >
                {getStatusIcon()}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className={`text-lg ${status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {milestone.title}
                  </CardTitle>
                  <Badge className={priorityColors.badge} variant="outline">
                    {milestone.priority}
                  </Badge>
                  <Badge className={statusColors.bg + ' ' + statusColors.text} variant="outline">
                    {getStatusLabel()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {milestone.description}
                </p>
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground pl-8">
            <span className="flex items-center gap-1">
              <Clock className="size-4" />
              {milestone.estimatedHours}h estimated
            </span>
            <span>{milestone.studyTasks.length} tasks</span>
            {milestone.scheduledDate && (
              <span>
                Scheduled: {new Date(milestone.scheduledDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-4 space-y-4">
            {/* Topics */}
            {milestone.topics.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Topics</h5>
                <div className="flex flex-wrap gap-2">
                  {milestone.topics.map((topic, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Study Tasks */}
            <div>
              <h5 className="text-sm font-medium mb-2">Study Tasks</h5>
              <div className="space-y-2">
                {milestone.studyTasks.map((task) => {
                  const taskConfig = TASK_TYPE_CONFIG[task.taskType]
                  return (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className={taskConfig.color}>
                        <TaskTypeIcon type={task.taskType} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{task.task}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {taskConfig.label}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatDuration(task.duration)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Resources */}
            {milestone.resources.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Resources</h5>
                <div className="space-y-2">
                  {milestone.resources.map((resource, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-lg border"
                    >
                      <BookOpen className="size-4 text-muted-foreground" />
                      <span className="text-sm flex-1">{resource.name}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {resource.type}
                      </Badge>
                      {resource.url && (
                        <a 
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium flex items-center gap-2">
                  <StickyNote className="size-4" />
                  Notes
                </h5>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotes(!showNotes)}
                >
                  {showNotes ? 'Cancel' : progress?.notes ? 'Edit Notes' : 'Add Notes'}
                </Button>
              </div>
              
              {showNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Add your study notes here..."
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowNotes(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleNotesSave}>
                      Save Notes
                    </Button>
                  </div>
                </div>
              ) : progress?.notes ? (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-sm whitespace-pre-wrap">{progress.notes}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes yet</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t">
              {status === 'not_started' && (
                <Button 
                  size="sm" 
                  onClick={() => onStatusChange?.(milestone.id, 'in_progress')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="size-4 mr-1" />
                  Start
                </Button>
              )}
              {status === 'in_progress' && (
                <Button 
                  size="sm" 
                  onClick={() => onStatusChange?.(milestone.id, 'completed')}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="size-4 mr-1" />
                  Complete
                </Button>
              )}
              {status === 'completed' && (
                <Button 
                  variant="outline"
                  size="sm" 
                  onClick={() => onStatusChange?.(milestone.id, 'not_started')}
                >
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
