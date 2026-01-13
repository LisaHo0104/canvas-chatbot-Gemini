'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileQuestion, FileText, Calendar, Edit2, Trash2, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArtifactEditor } from './ArtifactEditor'

interface Artifact {
  id: string
  title: string
  description: string | null
  tags: string[]
  artifact_type: 'quiz' | 'rubric_analysis'
  created_at: string
  updated_at: string
}

interface ArtifactCardProps {
  artifact: Artifact
  onDelete: (id: string) => void
  onUpdate: () => void
}

export function ArtifactCard({ artifact, onDelete, onUpdate }: ArtifactCardProps) {
  const router = useRouter()
  const [editorOpen, setEditorOpen] = useState(false)

  const getArtifactTypeIcon = () => {
    return artifact.artifact_type === 'quiz' ? (
      <FileQuestion className="size-3.5" />
    ) : (
      <FileText className="size-3.5" />
    )
  }

  const getArtifactTypeLabel = () => {
    return artifact.artifact_type === 'quiz' ? 'Quiz' : 'Rubric Analysis'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const canEdit = artifact.artifact_type === 'quiz'

  return (
    <>
      <Card className="hover:shadow-md transition-shadow flex flex-col h-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold leading-tight line-clamp-2 mb-2">
            {artifact.title}
          </CardTitle>
          <Badge 
            variant="outline" 
            className="w-fit flex items-center gap-1.5 text-xs font-normal"
          >
            {getArtifactTypeIcon()}
            {getArtifactTypeLabel()}
          </Badge>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pt-0">
          {artifact.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {artifact.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 mt-auto">
            <Calendar className="size-3.5" />
            <span>Updated {formatDate(artifact.updated_at)}</span>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/protected/artifacts/${artifact.id}`)}
              className="flex-1 h-8 text-xs"
            >
              <Eye className="size-3.5 mr-1.5" />
              View
            </Button>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditorOpen(true)}
                className="h-8 w-8 p-0"
                title="Edit"
              >
                <Edit2 className="size-3.5" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete this artifact?')) {
                  onDelete(artifact.id)
                }
              }}
              className="h-8 w-8 p-0"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
      {canEdit && (
        <ArtifactEditor
          artifact={artifact}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onUpdate={onUpdate}
        />
      )}
    </>
  )
}
