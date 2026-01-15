'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { QuizUI } from '@/components/quiz/quiz-ui'
import { RubricAnalysisUI } from '@/components/rubric-interpreter/rubric-analysis-ui'
import { StudyPlanUI } from '@/components/study-plan'
import { Spinner } from '@/components/ui/spinner'

interface ArtifactViewerProps {
  artifactId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArtifactViewer({ artifactId, open, onOpenChange }: ArtifactViewerProps) {
  const [loading, setLoading] = useState(true)
  const [artifact, setArtifact] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && artifactId) {
      loadArtifact()
    } else {
      setArtifact(null)
      setError(null)
    }
  }, [open, artifactId])

  const loadArtifact = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/artifacts/${artifactId}`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to load artifact')
      }

      const data = await response.json()
      setArtifact(data.artifact)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artifact')
      console.error('Error loading artifact:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[98vw] !w-[98vw] !max-h-[98vh] !h-[98vh] p-0 gap-0 overflow-hidden !flex !flex-col !rounded-lg sm:!max-w-[98vw] md:!max-w-[98vw] lg:!max-w-[98vw] xl:!max-w-[98vw] 2xl:!max-w-[98vw]"
        showCloseButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0 bg-background">
          <DialogTitle className="text-xl lg:text-2xl">
            {artifact?.title || 'Artifact'}
          </DialogTitle>
          <DialogDescription>
            {artifact?.description || ''}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4 lg:py-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Spinner className="w-8 h-8" />
              </div>
            )}
            {error && (
              <div className="p-4 rounded-md border border-destructive bg-destructive/10">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            {!loading && !error && artifact && (
              <>
                {artifact.artifact_type === 'quiz' && (
                  <QuizUI data={artifact.artifact_data} compact={false} />
                )}
                {artifact.artifact_type === 'rubric_analysis' && (
                  <RubricAnalysisUI data={artifact.artifact_data} compact={false} />
                )}
                {artifact.artifact_type === 'study_plan' && (
                  <StudyPlanUI data={artifact.artifact_data} compact={false} artifactId={artifactId} />
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
