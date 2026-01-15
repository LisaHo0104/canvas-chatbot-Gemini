'use client'

import { ChevronDown, ChevronUp, Target, TrendingUp, GraduationCap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

interface CollapsibleOverviewProps {
  assignmentName: string
  totalPoints: number
  criteriaCount: number
  overview: string
  keyStrategies: string[]
  howToSucceed?: string
}

export function CollapsibleOverview({
  assignmentName,
  totalPoints,
  criteriaCount,
  overview,
  keyStrategies,
  howToSucceed,
}: CollapsibleOverviewProps) {
  const [isOverviewOpen, setIsOverviewOpen] = useState(false)
  const [isStrategiesOpen, setIsStrategiesOpen] = useState(false)
  const [isHowToSucceedOpen, setIsHowToSucceedOpen] = useState(false)

  const overviewPreview = overview.length > 150 ? `${overview.substring(0, 150)}...` : overview

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="size-5 text-primary" />
            <div>
              <CardTitle className="text-xl font-semibold">{assignmentName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{totalPoints} pts</Badge>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{criteriaCount} criteria</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overview Section */}
        <Collapsible open={isOverviewOpen} onOpenChange={setIsOverviewOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium">Overview</span>
            {isOverviewOpen ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{overview}</p>
          </CollapsibleContent>
        </Collapsible>

        {/* Key Strategies Section */}
        {keyStrategies.length > 0 && (
          <Collapsible open={isStrategiesOpen} onOpenChange={setIsStrategiesOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                <span className="text-sm font-medium">Key Strategies</span>
                <Badge variant="secondary" className="text-xs">
                  {keyStrategies.length}
                </Badge>
              </div>
              {isStrategiesOpen ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                {keyStrategies.map((strategy, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-md bg-muted/30">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-sm text-muted-foreground flex-1">{strategy}</p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* How to Succeed Section */}
        {howToSucceed && (
          <Collapsible open={isHowToSucceedOpen} onOpenChange={setIsHowToSucceedOpen}>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium">How to Succeed</span>
              </div>
              {isHowToSucceedOpen ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-md border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-muted-foreground whitespace-pre-line">{howToSucceed}</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
