'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Target, Maximize2, Save, CheckCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { SaveArtifactDialog } from '@/components/artifacts/SaveArtifactDialog'
import { PriorityGroupedChecklist } from './priority-grouped-checklist'
import { CollapsibleOverview } from './collapsible-overview'

export interface RubricAnalysisOutput {
  assignmentName: string
  assignmentId: number
  courseId: number
  totalPoints: number
  overview: string
  keyStrategies: string[]
  howToSucceed?: string
  criteria: Array<{
    name: string
    points: number
    description: string
    whatToAim: string[]
    whatToAvoid: string[]
    tip?: string
  }>
  checklist?: Array<{
    item: string
    priority: 'high' | 'medium' | 'low'
  }>
}

interface RubricAnalysisUIProps {
  data: RubricAnalysisOutput
  messageId?: string
  compact?: boolean
  onViewFull?: () => void
}

export function RubricAnalysisUI({ data, messageId, compact = false, onViewFull }: RubricAnalysisUIProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(() => {
    if (typeof window === 'undefined' || !messageId || !data.checklist) return new Set()
    const saved = localStorage.getItem(`rubric-checklist-${messageId}`)
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  const toggleChecklistItem = (index: number) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(index)) {
      newChecked.delete(index)
    } else {
      newChecked.add(index)
    }
    setCheckedItems(newChecked)
    if (messageId && typeof window !== 'undefined') {
      localStorage.setItem(`rubric-checklist-${messageId}`, JSON.stringify([...newChecked]))
    }
  }

  const completedChecklistItems = checkedItems.size
  const totalChecklistItems = data.checklist?.length || 0

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
                  Total Points: {data.totalPoints} | {data.criteria.length} Criteria
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Save className="size-4" />
                Save to Artifactory
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Overview</h4>
              <p className="text-sm text-muted-foreground line-clamp-3">{data.overview}</p>
              {data.keyStrategies.length > 0 && (
                <div className="mt-3">
                  <h5 className="font-medium text-sm mb-2">Key Strategies:</h5>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {data.keyStrategies.slice(0, 3).map((strategy, i) => (
                      <li key={i}>{strategy}</li>
                    ))}
                    {data.keyStrategies.length > 3 && (
                      <li className="text-muted-foreground/70">
                        +{data.keyStrategies.length - 3} more...
                      </li>
                    )}
                  </ul>
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

  // Full view: Two-column dashboard layout
  return (
    <div className="w-full space-y-4 lg:space-y-6">
      {/* Collapsible Header */}
      <CollapsibleOverview
        assignmentName={data.assignmentName}
        totalPoints={data.totalPoints}
        criteriaCount={data.criteria.length}
        overview={data.overview}
        keyStrategies={data.keyStrategies}
        howToSucceed={data.howToSucceed}
      />

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 lg:gap-6">
        {/* Left Column - Sticky Checklist */}
        {data.checklist && data.checklist.length > 0 && (
          <aside className="lg:sticky lg:top-4 lg:h-fit">
            <PriorityGroupedChecklist
              items={data.checklist}
              checkedItems={checkedItems}
              onToggle={toggleChecklistItem}
              completed={completedChecklistItems}
              total={totalChecklistItems}
            />
          </aside>
        )}

        {/* Right Column - Scrollable Criteria */}
        <main className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5" />
                Criteria Breakdown
              </CardTitle>
              <CardDescription>
                Expand each criterion to see what to aim for and what to avoid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full space-y-3">
                {data.criteria.map((criterion, index) => (
                  <AccordionItem
                    key={index}
                    value={`criterion-${index}`}
                    className="border rounded-lg bg-card"
                  >
                    <AccordionTrigger className="px-4 lg:px-6 py-4 hover:no-underline">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-semibold text-base lg:text-lg">{criterion.name}</span>
                          <Badge variant="outline" className="text-sm">
                            {criterion.points} pts
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{criterion.description}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 lg:px-6 pb-4 lg:pb-6 space-y-4">
                      {/* What to Aim For */}
                      {criterion.whatToAim.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-sm lg:text-base mb-3 flex items-center gap-2">
                            <CheckCircle className="size-4 lg:size-5 text-green-600 dark:text-green-400" />
                            What to Aim For
                          </h5>
                          <ul className="space-y-2">
                            {criterion.whatToAim.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm lg:text-base">
                                <CheckCircle2 className="size-4 lg:size-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* What to Avoid */}
                      {criterion.whatToAvoid.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-sm lg:text-base mb-3 flex items-center gap-2">
                            <AlertCircle className="size-4 lg:size-5 text-red-600 dark:text-red-400" />
                            What to Avoid
                          </h5>
                          <ul className="space-y-2">
                            {criterion.whatToAvoid.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm lg:text-base">
                                <AlertCircle className="size-4 lg:size-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Tip */}
                      {criterion.tip && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                          <h5 className="font-semibold text-sm lg:text-base mb-2 flex items-center gap-2">
                            <TrendingUp className="size-4 lg:size-5 text-blue-600 dark:text-blue-400" />
                            Pro Tip
                          </h5>
                          <p className="text-sm lg:text-base text-muted-foreground">{criterion.tip}</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </main>
      </div>

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
