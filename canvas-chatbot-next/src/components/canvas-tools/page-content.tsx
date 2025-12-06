import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface CanvasPage {
  title: string
  body: string
  url: string
}

interface PageContentProps {
  page: CanvasPage
}

export function PageContent({ page }: PageContentProps) {
  if (!page) return null

  return (
    <Card className="w-full border-l-4 border-l-purple-500/50">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-semibold">{page.title}</CardTitle>
        <Button variant="ghost" size="icon" asChild>
          <a href={page.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/20">
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: page.body }}
          />
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
