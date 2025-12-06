import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Eye } from 'lucide-react'

interface CanvasFile {
  id: number
  filename: string
  url: string
  'content-type': string
}

interface FileCardProps {
  file: CanvasFile
}

export function FileCard({ file }: FileCardProps) {
  if (!file) return null

  return (
    <Card className="w-full max-w-md hover:bg-accent/5 transition-colors">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="p-2 bg-muted rounded-md">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{file.filename}</h4>
          <p className="text-xs text-muted-foreground truncate">{file['content-type']}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" asChild>
            <a href={file.url} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
