'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuizUI } from '@/components/quiz/quiz-ui'
import { RubricAnalysisUI } from '@/components/rubric-interpreter/rubric-analysis-ui'
import { NoteUI } from '@/components/note/note-ui'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

interface Artifact {
  id: string
  title: string
  description: string | null
  tags: string[]
  artifact_type: 'quiz' | 'rubric_analysis' | 'note'
  artifact_data: any
  created_at: string
  updated_at: string
}

export default function ArtifactPage() {
  const params = useParams()
  const router = useRouter()
  const artifactId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [artifact, setArtifact] = useState<Artifact | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quizHistory, setQuizHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (artifactId) {
      loadArtifact()
      loadQuizHistory()
    }
  }, [artifactId])
  
  const loadQuizHistory = async () => {
    if (!artifactId) return
    
    try {
      setHistoryLoading(true)
      const response = await fetch(`/api/quiz-attempts?artifact_id=${artifactId}`)
      if (response.ok) {
        const data = await response.json()
        setQuizHistory(data.attempts || [])
      }
    } catch (err) {
      console.error('Error loading quiz history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

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
    <div className="min-h-[calc(100vh-3rem)] w-full">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        {!loading && artifact && (
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/protected/artifacts">Artifacts</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[200px] truncate">{artifact.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Artifact Content */}
        {!loading && !error && artifact && (
          <div className="w-full">
            {artifact.artifact_type === 'quiz' && artifact.artifact_data && (
              <QuizUI 
                data={artifact.artifact_data} 
                compact={false}
                artifactId={artifactId}
                history={quizHistory}
              />
            )}
            {artifact.artifact_type === 'rubric_analysis' && artifact.artifact_data && (
              <RubricAnalysisUI data={artifact.artifact_data} compact={false} />
            )}
            {artifact.artifact_type === 'note' && artifact.artifact_data && (
              <NoteUI data={artifact.artifact_data} compact={false} />
            )}
            {(!artifact.artifact_data) && (
              <Alert variant="destructive" className="max-w-2xl mx-auto">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Artifact data is missing or invalid.</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
