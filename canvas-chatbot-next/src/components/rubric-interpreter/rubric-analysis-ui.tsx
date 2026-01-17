'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Target, Maximize2, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { SaveArtifactDialog } from '@/components/artifacts/SaveArtifactDialog'
import { Progress } from '../ui/progress'

export interface RubricAnalysisOutput {
  assignmentName: string
  assignmentId: number
  courseId: number
  totalPoints: number
  criteria: Array<{
    id: string
    name: string
    description: string
    pointsPossible: number
    gradeLevels: {
      hd: { requirements: string[]; points: number }
      d: { requirements: string[]; points: number }
      c: { requirements: string[]; points: number }
      p: { requirements: string[]; points: number }
      f: { requirements: string[]; points: number }
    }
    commonMistakes: string[]
  }>
  summary: {
    overview: string
    howToGetHD: string
  }
  commonMistakes: Array<{
    criterion: string
    mistakes: string[]
  }>
  actionChecklist: Array<{
    id: string
    item: string
    criterion: string
    priority: 'high' | 'medium' | 'low'
  }>
}

interface RubricAnalysisUIProps {
  data: RubricAnalysisOutput
  messageId?: string
  compact?: boolean
  onViewFull?: () => void
  artifactId?: string
}

export function RubricAnalysisUI({ data, messageId, compact = false, onViewFull, artifactId }: RubricAnalysisUIProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set())
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    if (typeof window === 'undefined' || !messageId) return new Set()
    const saved = localStorage.getItem(`rubric-checklist-${messageId}`)
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  // Add defensive checks for data structure
  if (!data || typeof data !== 'object') {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Invalid rubric analysis data. Please try again.</p>
      </div>
    )
  }

  // Safely extract and validate arrays
  const criteria = (data.criteria && Array.isArray(data.criteria)) ? data.criteria : []
  const actionChecklist = (data.actionChecklist && Array.isArray(data.actionChecklist)) ? data.actionChecklist : []
  const commonMistakes = (data.commonMistakes && Array.isArray(data.commonMistakes)) ? data.commonMistakes : []

  const toggleCriterion = (id: string) => {
    const newExpanded = new Set(expandedCriteria)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCriteria(newExpanded)
  }

  const toggleChecklistItem = (id: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(id)) {
      newChecked.delete(id)
    } else {
      newChecked.add(id)
    }
    setCheckedItems(newChecked)
    if (messageId && typeof window !== 'undefined') {
      localStorage.setItem(`rubric-checklist-${messageId}`, JSON.stringify([...newChecked]))
    }
  }

  const completedChecklistItems = checkedItems.size
  const totalChecklistItems = actionChecklist.length
  const checklistProgress = totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  const getGradeLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'hd':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'd':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'c':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'p':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'f':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  // Compact view: Show only summary card with button
  if (compact) {
    return (
      <>
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Target className="size-5" />
                  {data.assignmentName}
                </CardTitle>
                <CardDescription>
                  Total Points: {data.totalPoints} | {criteria.length} Criteria
                </CardDescription>
              </div>
              {!artifactId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Save className="size-4" />
                  Save to Artifactory
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Overview</h4>
              <p className="text-sm text-muted-foreground line-clamp-3">{data.summary.overview}</p>
              {data.summary.howToGetHD && (
                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-md border border-purple-200 dark:border-purple-800">
                  <h5 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    <span className="text-lg">🎓</span>
                    How to Get HD
                  </h5>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {data.summary.howToGetHD}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardContent>
            <Button
              onClick={onViewFull}
              className="w-full sm:w-auto"
              size="lg"
            >
              <Maximize2 className="size-4 mr-2" />
              View Full Analysis
            </Button>
          </CardContent>
        </Card>
        <SaveArtifactDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          artifactType="rubric_analysis"
          artifactData={data}
          onSave={() => {
            // Optionally show a success message or refresh
          }}
        />
      </>
    )
  }

  // Full view: Show complete rubric analysis interface

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5" />
                {data.assignmentName}
              </CardTitle>
              <CardDescription>
                Total Points: {data.totalPoints} | {criteria.length} Criteria
              </CardDescription>
            </div>
            {!artifactId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Save className="size-4" />
                Save to Artifactory
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Overview</h4>
            <p className="text-sm text-muted-foreground">{data.summary.overview}</p>
            {data.summary.howToGetHD && (
              <div className="mt-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-md border border-purple-200 dark:border-purple-800">
                <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="text-lg">🎓</span>
                  How to Get HD (High Distinction)
                </h5>
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {data.summary.howToGetHD}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="criteria" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-10 lg:h-11 gap-1">
          <TabsTrigger value="criteria" className="text-sm lg:text-base px-2 lg:px-3">Criteria</TabsTrigger>
          <TabsTrigger value="checklist" className="text-sm lg:text-base px-2 lg:px-3">Checklist</TabsTrigger>
          <TabsTrigger value="mistakes" className="text-sm lg:text-base px-2 lg:px-3">Mistakes</TabsTrigger>
        </TabsList>

        {/* Criteria Breakdown Tab */}
        <TabsContent value="criteria" className="space-y-3">
          {criteria.map((criterion) => (
            <Card key={criterion.id}>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleCriterion(criterion.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {criterion.name}
                      <Badge variant="outline">{criterion.pointsPossible} pts</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">{criterion.description}</CardDescription>
                  </div>
                  {expandedCriteria.has(criterion.id) ? (
                    <ChevronUp className="size-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {expandedCriteria.has(criterion.id) && (
                <CardContent className="space-y-4">
                  {/* Grade Levels */}
                  <div>
                    <h5 className="font-semibold text-sm mb-3">Grade Level Requirements</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(criterion.gradeLevels).map(([level, data]) => (
                        <div
                          key={level}
                          className="p-3 rounded-md border bg-card"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getGradeLevelColor(level)}>
                              {level.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {data.points} pts
                            </span>
                          </div>
                          {data.requirements.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                              {data.requirements.map((req, i) => (
                                <li key={i}>{req}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              No specific requirements listed
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Action Checklist Tab */}
        <TabsContent value="checklist" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5" />
                Action Checklist
              </CardTitle>
              <CardDescription>
                Track your progress: {completedChecklistItems}/{totalChecklistItems} completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={checklistProgress} className="mb-4" />
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {actionChecklist.length > 0 ? (
                    actionChecklist.map((item) => {
                    const isChecked = checkedItems.has(item.id)
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                            : 'bg-card hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleChecklistItem(item.id)}
                          className="mt-1 rounded border-gray-300 dark:border-gray-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                              {item.item}
                            </span>
                            <Badge className={getPriorityColor(item.priority)} variant="outline">
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Criterion: {item.criterion}
                          </p>
                        </div>
                        {isChecked && (
                          <CheckCircle2 className="size-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                      </label>
                    )
                  })) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No action items available.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Common Mistakes Tab */}
        <TabsContent value="mistakes" className="space-y-3">
          {commonMistakes.length > 0 ? (
            commonMistakes.map((mistakeGroup, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="size-5 text-orange-500" />
                  {mistakeGroup.criterion}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {mistakeGroup.mistakes.map((mistake, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {mistake}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No common mistakes data available.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>
      <SaveArtifactDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        artifactType="rubric_analysis"
        artifactData={data}
        onSave={() => {
          // Optionally show a success message or refresh
        }}
      />
    </div>
  )
}
