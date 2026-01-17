'use client'

import { useState, useEffect } from 'react'
import { StickyNote, ExternalLink, Maximize2, Save, BookOpen, Lightbulb, List } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { MessageResponse } from '@/components/ai-elements/message'
import { detectGraphData, detectTableData, detectContentType } from '@/lib/note-content-parser'
import { NoteGraph } from './note-graph'
import { NoteTable } from './note-table'

export interface NoteOutput {
  title: string
  description?: string
  sections: Array<{
    id: string
    heading: string
    content: string // Markdown supported
    level?: number // Heading level (1, 2, 3 for H1, H2, H3)
  }>
  keyTakeaways?: string[] // Key takeaways at the end
  resources?: Array<{
    type: 'module' | 'assignment' | 'course' | 'page' | 'file' | 'url'
    name: string
    url?: string
  }>
}

interface NoteUIProps {
  data: NoteOutput
  messageId?: string
  compact?: boolean
  onViewFull?: () => void
  onSaveClick?: () => void
  artifactId?: string
}

export function NoteUI({ data, messageId, compact = false, onViewFull, onSaveClick, artifactId }: NoteUIProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedSections(newExpanded)
  }

  // Compact view: Show only summary card with button
  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="size-5" />
                {data.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 flex-wrap">
                <span>{data.sections.length} Sections</span>
              </CardDescription>
            </div>
            {onSaveClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveClick}
                className="flex items-center gap-2"
              >
                <Save className="size-4" />
                Save to Artifactory
              </Button>
            )}
          </div>
        </CardHeader>
        {data.description && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{data.description}</p>
          </CardContent>
        )}
        <CardContent>
          <Button
            onClick={onViewFull}
            className="w-full sm:w-auto"
            size="lg"
          >
            <Maximize2 className="size-4 mr-2" />
            View Full Notes
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Full view: Show complete note interface
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="size-5" />
                {data.title}
              </CardTitle>
              {data.description && (
                <CardDescription className="mt-2">
                  {data.description}
                </CardDescription>
              )}
              <div className="flex items-center gap-4 flex-wrap mt-4">
                <span className="text-sm text-muted-foreground">{data.sections.length} Sections</span>
              </div>
            </div>
            {onSaveClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveClick}
                className="flex items-center gap-2"
              >
                <Save className="size-4" />
                Save to Artifactory
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>


      {/* Table of Contents for long notes */}
      {data.sections.length > 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <List className="size-4" />
              Table of Contents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <nav className="space-y-1">
              {data.sections.map((section, index) => {
                const level = section.level || 2
                const indent = level > 2 ? `ml-${(level - 2) * 4}` : ''
                return (
                  <a
                    key={section.id}
                    href={`#section-${section.id}`}
                    className={`block text-sm text-muted-foreground hover:text-foreground transition-colors ${indent}`}
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    {index + 1}. {section.heading}
                  </a>
                )
              })}
            </nav>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="sections" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-10 lg:h-11 gap-1">
          <TabsTrigger value="sections" className="text-sm lg:text-base px-2 lg:px-3">Sections</TabsTrigger>
          <TabsTrigger value="resources" className="text-sm lg:text-base px-2 lg:px-3">Resources</TabsTrigger>
        </TabsList>

        {/* Sections Tab */}
        <TabsContent value="sections" className="space-y-4 mt-4">
          <Accordion type="multiple" className="space-y-4">
            {data.sections.map((section) => {
              const isExpanded = expandedSections.has(section.id)
              return (
                <AccordionItem
                  key={section.id}
                  id={`section-${section.id}`}
                  value={section.id}
                  className="border rounded-xl bg-card text-card-foreground shadow-sm overflow-hidden scroll-mt-4"
                >
                  <AccordionTrigger className="px-4 lg:px-6 py-4 lg:py-6 hover:bg-muted/50 transition-colors hover:no-underline">
                    <div className="flex-1 text-left">
                      {section.level === 1 ? (
                        <h1 className="text-2xl lg:text-3xl font-bold mb-2">{section.heading}</h1>
                      ) : section.level === 3 ? (
                        <h3 className="text-base lg:text-lg font-semibold mb-2">{section.heading}</h3>
                      ) : (
                        <h2 className="text-lg lg:text-xl font-semibold mb-2">{section.heading}</h2>
                      )}
                      <p className="text-sm lg:text-base text-muted-foreground line-clamp-2">
                        {section.content.substring(0, 150)}...
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 lg:px-6 pb-4 lg:pb-6 space-y-4">
                    {(() => {
                      const contentType = detectContentType(section.content)
                      const tableData = detectTableData(section.content)
                      const graphData = detectGraphData(section.content)
                      
                      return (
                        <>
                          {contentType === 'table' && tableData && (
                            <NoteTable data={tableData} />
                          )}
                          {contentType === 'graph' && graphData && (
                            <NoteGraph data={graphData} />
                          )}
                          {contentType === 'text' && (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
                                {section.content}
                              </MessageResponse>
                            </div>
                          )}
                          {/* If we have a graph or table, still show the text content below */}
                          {(contentType === 'graph' || contentType === 'table') && (
                            <div className="prose prose-sm dark:prose-invert max-w-none mt-4">
                              <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
                                {section.content}
                              </MessageResponse>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>

          {/* Key Takeaways */}
          {data.keyTakeaways && data.keyTakeaways.length > 0 && (
            <Card className="mt-6 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="size-4 text-amber-600 dark:text-amber-400" />
                  Key Takeaways
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.keyTakeaways.map((takeaway, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm lg:text-base">
                      <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-3 mt-4">
          {data.resources && data.resources.length > 0 ? (
            <div className="space-y-3">
              {data.resources.map((resource, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="size-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm lg:text-base">{resource.name}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {resource.type}
                        </Badge>
                      </div>
                    </div>
                    {resource.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          View
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 lg:py-12 text-center text-sm lg:text-base text-muted-foreground">
                No resources available
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}
